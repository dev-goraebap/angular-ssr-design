---
name: ssr-csr-rendering-strategy
description: Guidance for mixing SSR, CSR, and SSG (prerender) in one app — choosing a render mode per page, getting data into the SSR HTML with hydration/transfer-state, separating the backend behind a same-origin proxy to avoid CORS, unifying cookie auth across server and client, guarding browser-only APIs, and keeping client interactions (modals, back button) from clashing with SSR. Framework-agnostic method; examples in Angular.
---

# SSR/CSR 혼합 렌더링 전략 Skill

이 스킬은 에이전트가 **SSR(서버 렌더) · CSR(클라이언트 렌더) · SSG(빌드 타임 프리렌더)를 한
애플리케이션 안에서 우아하게 혼합**하도록 설계·구현할 때 쓰는 가이드라인입니다.

원리는 특정 프레임워크에 종속되지 않으며(메타프레임워크 공통), 구체적인 예제와 기술 대안은
**Angular 22**로 듭니다. 다른 환경(Next.js·Nuxt 등)으로 옮길 때 무엇을 같은 자리에 끼우면
되는지는 각 자리에서 짚습니다.

## 언제 쓰나

페이지마다 SEO·개인화·데이터 신선도 요구가 달라 **렌더링 방식을 섞어야** 할 때 쓴다. SSR을
켰는데 HTML이 빈 껍데기로 나올 때, 하이드레이션 후 같은 API를 또 호출할 때, 서버에서
`window`/`localStorage`가 없어 터질 때, 모달·뒤로가기 같은 클라 인터랙션이 SSR과 충돌할까 봐
걱정될 때, 백엔드 호출의 CORS·인증을 서버/클라 양쪽에서 일관되게 다루고 싶을 때 맞는다.

## 핵심 철학 및 개념

SSR/CSR 혼합은 "전부 SSR이냐 전부 CSR이냐"의 문제가 아니라, **페이지(그리고 컴포넌트)마다
가장 알맞은 렌더 방식을 고르고, 그 경계에서 데이터·인증·브라우저 API를 어긋나지 않게 잇는
일**이다. 네 가지 원칙이 토대다.

1. **SSR은 최초 진입만, 인터랙션은 클라만 (둘은 겹치지 않는다)**
   - SSR(또는 SSG)은 *요청/빌드 시 한 번* HTML을 만든다. 그 뒤 사용자의 클릭·입력·모달
     열기·뒤로가기는 전부 *하이드레이션 이후 브라우저*에서 일어난다. 그래서 "URL을 바꾸며
     모달을 띄우는" 같은 클라 인터랙션은 SSR과 **충돌하지 않는다** — 오히려 canonical URL을
     공유하면 상보적이다([references/ssr-guards-and-interactions.md](references/ssr-guards-and-interactions.md)).

2. **데이터는 SSR HTML에 박혀 나와야 한다 (빈 껍데기 금지)**
   - SSR/SSG가 데이터를 못 가져오면 스켈레톤만 그려져 SEO·초기 표시 이득이 사라진다.
     서버가 가져온 데이터는 **Transfer State**로 직렬화돼 브라우저로 넘어가, 하이드레이션 시
     같은 API를 다시 부르지 않아야 한다([references/data-fetching-ssr.md](references/data-fetching-ssr.md)).

3. **렌더 모드는 페이지의 '성격'으로 결정한다**
   - 기준은 단 하나로 수렴한다 — *데이터가 얼마나 자주, 누구에게 다르게 바뀌는가*.
     거의 안 바뀜→SSG, 자주 바뀜+SEO 필요→SSR, 사용자마다 다름(개인화·인증)→CSR
     ([references/rendering-modes.md](references/rendering-modes.md)).

4. **브라우저 전용 코드는 '쓰는 쪽이 모르게' 가드를 캡슐화한다**
   - `window`·`localStorage`·`IntersectionObserver`·제스처는 서버에 없다. 가드를 도메인
     페이지에 흩뿌리지 말고, *DOM 동작은 공용 UI 컴포넌트 안에*, *플랫폼 API는 core 토큰/
     서비스에* 가둔다([references/ssr-guards-and-interactions.md](references/ssr-guards-and-interactions.md)).

## 5대 핵심 전략

### 1. 페이지별 렌더 모드 매핑

라우트마다 SSG/SSR/CSR을 고른다. 한 도메인에서 셋이 공존하고, 각 선택의 이유가 페이지
성격과 1:1로 대응해야 한다.

| 성격 | 모드 | 예 |
|------|------|-----|
| 거의 안 바뀜(빌드 스냅샷으로 충분) | **SSG / Prerender** | 랜딩, 소개 |
| 자주 바뀜 / 요청마다 최신 + SEO 필요 | **SSR** | 목록, 상세, 검색 |
| 사용자마다 다름(개인화·인증) | **CSR** | 위시리스트, 마이페이지, 로그인 |

- SSG는 "동적 렌더"가 아니라 **빌드 타임에 데이터를 한 번 구워 정적 HTML로 굳히는 것**이다.
  동적 라우트(`:id`)는 *프리렌더 파라미터 함수*로 인스턴스 목록을 빌드 타임에 펼쳐 굽는다.
- **Angular**: `app.routes.server.ts`의 `ServerRoute[]`에 `RenderMode.Prerender|Server|Client`.
  `getPrerenderParams()`로 SSG 동적 라우트. **Next.js**: App Router의 정적/동적 + `generateStaticParams`.
  **Nuxt**: `routeRules`(`prerender`/`ssr`/`ssr:false`).

### 2. 데이터 페칭 & SSR 포함

읽기는 반응형 리소스로(SSR 자동 대기 + Transfer State), 쓰기는 명령형으로.

- **읽기**: 라우트 파라미터/검색어 시그널에 반응하는 리소스. SSR이 완료를 기다리고 결과를
  HTML에 실어 보낸다 → 하이드레이션 중복 호출 0.
- **쓰기(변이)**: 사용자 액션 핸들러에서 명령형 호출.
- **주의**: 인증/개인화 응답은 Transfer State 캐시에서 제외한다(다른 사용자 데이터 누수).
- **Angular**: 읽기 `httpResource`(Angular 22 stable, Transfer State 자동), 쓰기 `HttpClient`,
  `provideHttpClient(withFetch())`. **Next/Nuxt**: 서버 컴포넌트/`useFetch`가 같은 역할.

### 3. 백엔드 분리 & 프록시 (CORS를 구조적으로 제거)

```
[브라우저] --상대경로 /api, 쿠키 자동--> [SSR 서버] --프록시--> [백엔드]
                                            ↑ 같은 origin → CORS 없음
[SSR 서버] --내부 호스트로 직접 호출--> [백엔드]
                                            ↑ 서버간 호출 → CORS 없음
```

- 브라우저는 **같은 origin `/api`** 만 호출하고 SSR 서버가 백엔드로 프록시한다 → CORS가
  생기지 않는다. 쿠키도 그대로 패스된다.
- SSR은 **내부 호스트로 직접** 호출한다(서버간, CORS 무관, HTTPS 불필요).
- baseURL은 **플랫폼별 provider/토큰**으로 가른다: 브라우저=상대경로, 서버=내부 호스트.
  SSR HTTP 클라이언트는 절대 URL을 요구하므로 인터셉터에서 prefix를 붙인다.
- **Angular**: prod는 `server.ts` + `http-proxy-middleware`, dev는 `proxy.conf.json`(별도!).
  `API_BASE_URL` InjectionToken + 인터셉터. **Next/Nuxt**: rewrites / nitro devProxy.

### 4. 인증 통일 (쿠키 한 줄기)

서버 호출과 클라 호출의 인증을 **쿠키 하나로** 통일한다.

- `localStorage` 토큰은 서버에 없어 SSR이 비로그인으로 렌더한다(깜빡임). **쿠키**(가급적
  `HttpOnly`+`Secure`+`SameSite`)를 쓴다.
- 브라우저: 쿠키 자동 전송. **SSR**: 들어온 요청의 `Cookie` 헤더를 백엔드로 **포워딩**.
- `HttpOnly`라 JS가 토큰을 못 읽으면 인증 상태는 `/me` 엔드포인트로 판단한다.
- **단순화 규칙**: 개인화 화면을 모두 CSR로 두면 SSR 쿠키 포워딩 없이 *클라에서 `/me`*만으로
  충분하다(불필요한 복잡도 회피). SSR에서도 로그인 상태로 렌더해야 할 때만 포워딩을 넣는다.
- **Angular**: 서버에서 `REQUEST` 토큰으로 쿠키를 읽어 인터셉터에서 포워딩, 가드는 `/me`
  await. **Next/Nuxt**: `cookies()` / `useRequestHeaders(['cookie'])`.

### 5. 브라우저 API SSR 가드 캡슐화

가드를 페이지에 흩뿌리지 않고 성격에 따라 두 곳에 가둔다.

| 종류 | 캡슐화 위치 | 예 |
|------|-------------|-----|
| 렌더/DOM 동작(측정·제스처·옵저버) | **공용 UI 컴포넌트 안** | 적응형 시트, 무한 스크롤 |
| 플랫폼 API(`window`/`localStorage`/`navigator`) | **core 토큰/서비스** | `WINDOW` 토큰, 스토리지 서비스 |

- 페이지/템플릿에 `if (isBrowser)`를 흩뿌리지 않는다(하이드레이션 불일치·인프라 누수).
- 프레임워크가 이미 SSR-safe하게 감싼 것(오버레이/포커스트랩/브레이크포인트 관찰)은 **중복
  가드하지 않는다**. 우리가 직접 가드할 표면은 *우리가 추가한 브라우저 전용 코드*로 좁아진다.
- **Angular**: `isPlatformBrowser()` / `afterNextRender()`, 플랫폼별 provider.

> 추가 원칙 — **클라 인터랙션은 SSR과 충돌하지 않는다.** 모달로 가로채며 URL을 바꾸기,
> 뒤로가기로 모달 닫기 등은 *클릭/팝스테이트 핸들러*에서만 도므로 서버에서 실행되지 않는다.
> URL을 항상 canonical로 유지하면 공유·딥링크·SEO가 보존된다.

## 에이전트 실행 프로토콜

1. **현 스택 조사** — SSR이 켜져 있는지(빌드 outputMode/서버 엔트리), 데이터가 어디 있는지
   (브라우저 전용 저장소면 SSR이 못 읽는다), UI/제스처/인증 방식.
2. **렌더 모드 매핑 합의** — 페이지를 성격별로 SSG/SSR/CSR에 배정하고 사용자와 확정.
3. **데이터·인증 결정** — 읽기 리소스 + Transfer State, 백엔드 분리/프록시, 쿠키 통일(개인화가
   CSR이면 포워딩 생략).
4. **가드 캡슐화** — 브라우저 전용 코드를 UI 컴포넌트/플랫폼 토큰으로 격리.
5. **검증** — SSR HTML에 데이터가 박히는지(빈 껍데기 아님), 하이드레이션 후 중복 호출 없는지,
   모달/뒤로가기/스크롤 복원이 정상인지, a11y.

## 함정 & 실측 (참조 구현에서 실제 겪음)

- **SSRF/허용 호스트**: Angular 22 platform-server는 허용 호스트 외 `Host` 헤더를 거부한다
  (`allowedHosts: []`면 전부 400). dev·모바일 접속 시 호스트를 명시해야 한다.
- **SSG는 빌드 시 백엔드에 의존**: 프리렌더가 빌드 타임에 API를 호출하므로, 빌드할 때도
  백엔드가 떠 있어야 정적 HTML에 데이터가 포함된다.
- **dev/prod 프록시 경로가 다르다**: prod는 서버 엔트리의 프록시 미들웨어, dev-server는 그걸
  안 쓰므로 별도 프록시 설정이 필요하다.
- **데이터가 SSR에 들어오면 숨어 있던 브라우저 코드가 깨어난다**: 빈 데이터라 안 그려지던
  무한 스크롤 센티넬이 데이터가 차며 서버에서 렌더돼 `IntersectionObserver`가 터졌다 →
  플랫폼 가드로 해결. "데이터가 SSR에 들어왔다"는 방증이기도 하다.
- **하이드레이션 불일치**: 서버와 클라의 초기 트리가 달라지면(테마·인증 상태 등) 깨진다.
  초기값을 일치시키고 분기는 하이드레이션 이후로 미룬다.

## 참조 구현

이 스킬의 참조 구현은 **이 레포 자체**다(Angular 22 영화 카탈로그).

- 렌더 모드 매핑: `src/app/app.routes.server.ts`
- baseURL 토큰·인터셉터: `src/shared/api/http.ts`, 서버 주입 `src/app/app.config.server.ts`
- 읽기 리소스(Transfer State): `src/shared/api/movies.ts`, 페이지의 `httpResource`
- 백엔드 분리 + 프록시: `backend/`, `src/server.ts`(prod), `proxy.conf.json`(dev)
- 쿠키 인증: `src/shared/auth/auth.service.ts`, `backend/index.ts`
- 브라우저 가드: `src/pages/home/home.ts`(IO 가드), `src/shared/lib/local-storage-signal.ts`
- 모달/URL/뒤로가기: `src/features/open-movie/open-movie.service.ts`
- 설계 근거(ADR)와 실측: `docs/설계/`, 기술 조사: `docs/기획/리서치.md`
