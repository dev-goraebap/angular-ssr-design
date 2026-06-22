# 데이터 페칭과 SSR 포함 (Transfer State)

## 목표: SSR HTML에 데이터가 박혀 나오고, 하이드레이션 중복 호출은 0

SSR/SSG가 데이터를 못 가져오면 스켈레톤만 그려져 SEO·초기 표시 이득이 사라진다("빈 껍데기").
서버가 가져온 데이터는 **Transfer State**로 직렬화돼 초기 HTML에 실리고, 브라우저는 초기
렌더에서 그 캐시를 재사용해 같은 API를 다시 호출하지 않는다.

```
[SSR 서버] fetch /api/movies/123 → HTML에 데이터 + <script>Transfer State</script>
      ↓ (브라우저로 전송)
[브라우저] 하이드레이션 → Transfer State 재사용 → 추가 호출 없음
```

## 읽기 = 반응형 리소스, 쓰기 = 명령형

- **읽기**: 라우트 파라미터/검색어 같은 시그널에 반응하는 리소스. SSR이 완료를 기다렸다가
  결과를 HTML에 싣는다. 파라미터가 바뀌면 자동 재요청.
- **쓰기(변이)**: 사용자 액션 핸들러에서 명령형 호출. 성공 후 관련 읽기 리소스를 `reload`
  하거나 로컬 상태를 갱신.

## Angular 구현 (httpResource)

```ts
// 전역 목록 — 저장소가 보유
@Service()
export class MovieRepository {
  private readonly allRes = httpResource<{ items: Movie[]; total: number }>(() => '/api/movies');
  readonly all = computed(() => this.allRes.value()?.items ?? []);
}

// 파라미터 있는 조회 — 페이지가 라우트 시그널에 맞춰 직접
private readonly movieRes = httpResource<Movie>(() => {
  const id = this.resolvedId();
  return id ? `/api/movies/${id}` : undefined; // undefined면 요청 안 함
});
readonly movie = computed(() => this.movieRes.value());
readonly loading = computed(() => this.movieRes.isLoading());
```

- `httpResource`(Angular 22 stable)는 **Transfer State와 자동 통합** → 중복 호출 제거가 공짜.
- `provideHttpClient(withFetch())` — SSR에서 fetch 기반 동작.
- 변이는 `HttpClient`(`firstValueFrom(http.put(...))` 등).

## 주의: 인증/개인화 응답은 Transfer State에서 제외

- 캐시 키가 인증/테넌트/로케일 헤더를 구분하지 못하면 **다른 사용자 데이터가 섞일 수 있다.**
- 기본적으로 transfer cache는 `Authorization` 헤더 없는 `GET`/`HEAD`만 캐싱한다(프레임워크별
  정책 확인).
- **구조적 회피**: 개인화 데이터(위시리스트·내 평점 등)를 CSR 페이지로 두면 SSR Transfer
  State 경로를 아예 타지 않아 누수 위험이 낮다.

## 함정

- **SSG는 빌드 타임에 데이터를 가져온다** → 빌드할 때도 백엔드가 떠 있어야 정적 HTML에
  데이터가 포함된다(안 그러면 빈 SSG).
- **SSR이 절대 URL을 요구**한다(서버엔 "현재 origin"이 없다). 상대경로면 baseURL을 붙여라
  ([backend-proxy-auth.md](backend-proxy-auth.md)).
- 데이터가 SSR에 들어오면 *그 데이터에 의존해 렌더되던 브라우저 전용 코드*(무한 스크롤
  센티넬 등)가 서버에서 깨어날 수 있다 → 플랫폼 가드 필요
  ([ssr-guards-and-interactions.md](ssr-guards-and-interactions.md)).

## 다른 프레임워크 대응

- **Next.js**: Server Components의 `await fetch`(자동 캐시/재검증)가 SSR 데이터 포함을 담당.
- **Nuxt**: `useFetch`/`useAsyncData`가 SSR에서 payload로 직렬화돼 클라가 재사용.
