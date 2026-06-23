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

## Transfer State가 조용히 비는 5가지 관문 (가장 흔한 SSR 디버깅 함정)

> **증상**: SSR HTML에는 데이터가 박혀 나오는데, 하이드레이션 직후 **스켈레톤으로 깜빡**하고
> 같은 API를 다시 호출한다. Transfer State에 데이터가 안 실린 것이다.
>
> **왜 비싼가**: transfer-cache 미스는 **에러도 경고도 안 낸다**(Angular는 조건 불충족 시
> 그냥 캐시에 안 담고 `return`한다). 그리고 통과해야 할 관문이 여러 개인데 **하나만 어긋나도
> 증상이 똑같다.** 그래서 요청 측만 들여다보다가 정작 응답 측 범인을 놓치기 쉽다.

데이터가 Transfer State에 실리려면 아래 관문을 **모두** 통과해야 한다. 요청 측만이 아니라
**응답 측·캐시 키**까지 양면이다.

### 관문 1 — 요청에 인증 헤더가 없을 것 (그런데 `cookie`도 인증 헤더다)

기본적으로 transfer cache는 **인증 헤더 없는 `GET`/`HEAD`만** 캐싱한다. 그리고 Angular가
보는 "인증 헤더"는 `Authorization`만이 아니라 **`cookie`·`proxy-authorization`도 포함**한다
(`hasAuthHeaders`).

함정의 핵심: 이 스킬이 권장하는 **SSR 쿠키 포워딩**([backend-proxy-auth.md](backend-proxy-auth.md)의
`authForwardInterceptor`)이 요청에 `cookie` 헤더를 붙이는 순간, **그 요청은 transfer-cache에서
자동 제외된다.** "쿠키를 포워딩하라"는 권장과 "쿠키 달린 요청은 캐싱 안 함"이 정면으로 부딪힌다.

- 공개 읽기(영화 목록·상세)에는 SSR에서 굳이 쿠키를 포워딩하지 마라 → 관문 통과.
- 로그인 상태로 SSR 렌더해야 해서 쿠키가 꼭 필요하면 관문 2(옵트인)로 간다.

### 관문 2 — (사용자별 HTML이면) 인증 요청 캐싱을 명시적으로 켤 것

SSR HTML이 **사용자마다 다른(비공유)** 페이지라면, 인증 요청도 transfer-cache에 담아도
누수가 아니다(어차피 그 사용자 전용 HTML이다). 이때만 옵트인한다.

```ts
// app.config.ts (브라우저)
provideClientHydration(
  withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: true }),
)
```

- **공유 캐시(CDN)로 올라가는 공개 HTML에는 절대 켜지 마라** — 한 사용자의 응답이 다른
  사용자에게 새어 나간다.
- 더 단순한 길은 **구조적 회피**: 개인화 데이터(위시리스트·내 평점)를 CSR 페이지로 두면 SSR
  Transfer State 경로를 아예 안 타므로 옵트인도 누수 걱정도 필요 없다(이 스킬의 기본 권장).

### 관문 3 — 응답의 `Cache-Control`이 저장을 막지 않을 것 (가장 흔히 놓치는 범인)

요청 측을 다 풀어도, **백엔드 응답 헤더**가 `Cache-Control: no-store | no-cache | private`이면
Angular는 그 응답을 transfer-cache에 **담지 않는다**(`hasUncacheableCacheControl`). 그리고
**Spring Security는 기본으로 `Cache-Control: no-cache, no-store, ...`를 모든 응답에 붙인다.**
Spring + Angular SSR 조합에서 "요청 측을 다 고쳤는데도 안 된다"의 진짜 범인은 거의 이것이다.

해결은 **프록시/BFF에서 SSR-내부 호출에 한해** 해당 헤더를 제거하는 것이다. 브라우저가 직접
받는 응답에서는 그대로 둬서 보안(브라우저 캐시 금지)을 보존한다.

```ts
// SSR 인터셉터: 내부 호출에만 마커를 붙인다
req = req.clone({ setHeaders: { 'x-ssr-transfer': '1' } });

// 프록시/BFF: 마커가 있을 때만 캐시 금지 헤더를 벗긴다 (브라우저 직접 호출은 그대로)
onProxyRes(proxyRes, reqIn) {
  if (reqIn.headers['x-ssr-transfer']) {
    delete proxyRes.headers['cache-control'];
    delete proxyRes.headers['pragma'];
    delete proxyRes.headers['expires'];
  }
}
```

마커 헤더 + 조건부 strip 패턴을 권장하는 이유: "SSR이 transfer를 원하는 호출"과 "브라우저
직접 호출"을 응답 측에서 구분할 유일한 신호가 그 마커뿐이기 때문이다.

### 관문 4 — server/client의 캐시 키(absolute URL)가 일치할 것

Transfer State 캐시 키는 **절대 URL**이다. 그런데 [backend-proxy-auth.md](backend-proxy-auth.md)
대로 baseURL을 플랫폼별로 가르면 server는 내부 origin(`http://localhost:4001/api/...`),
client는 public origin(`/api/...` → `https://app.example.com/api/...`)으로 **URL이 달라져 키가
어긋난다.** 서버가 담은 항목을 클라가 못 찾아 다시 부른다.

```ts
// app.config.server.ts — server에서만, 내부 origin을 public origin으로 되돌려 키를 맞춘다
{ provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
  useValue: { 'http://localhost:4001': 'https://app.example.com' } }
```

`HTTP_TRANSFER_CACHE_ORIGIN_MAP`은 **server 전용 토큰**이다(클라엔 주입하지 않는다). 양쪽
절대 URL을 처음부터 같게 만들 수 있으면 그게 더 단순하다.

### 관문 5 — 검증: 무음 실패이므로 HTML을 직접 열어 확인한다

transfer-cache는 실패해도 에러가 없으므로 **SSR HTML을 직접 확인**해야 한다.

- SSR 응답 HTML에서 `<script id="ng-state" type="application/json">`(Angular)를 찾아 **내
  데이터 키/값이 실려 있는지** 본다. 비어 있으면 위 관문 중 하나가 막힌 것.
- 하이드레이션 후 네트워크 탭에 **같은 GET이 다시 뜨면** transfer-cache 미스다.
- 관문을 위에서부터(1→4) 하나씩 점검한다. 응답 헤더(관문 3)는 코드만 봐선 안 보이니
  실제 응답의 `Cache-Control`을 직접 떠본다.

> 이 레포(참조 구현)는 개인화를 전부 CSR로 두고 공개 읽기만 SSR로 둬서 **관문 1·2를
> 구조적으로 회피**한다. 위 관문 3·4(응답 strip·origin map)는 SSR에서 인증/쿠키 응답까지
> transfer해야 하는 프로젝트(예: Spring Security 백엔드)에서 실제로 필요했던 패턴을
> 일반화한 것이다.

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
