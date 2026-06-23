# 렌더링 모드: SSG / SSR / CSR 선택과 매핑

## 세 모드의 본질

| | 데이터를 언제 가져오나 | 사용자가 받는 것 | 데이터가 바뀌면 |
|---|---|---|---|
| **SSG(Prerender)** | **빌드 타임에 1번** | 데이터가 **이미 박힌** 정적 HTML | **재빌드**해야 반영 |
| **SSR(Server)** | **요청마다** | 그 순간 데이터로 렌더한 HTML | 즉시 반영 |
| **CSR(Client)** | **브라우저에서** | 빈 셸 → JS가 채움 | 즉시(클라에서) |

**SSG는 "동적으로 그리는 것"이 아니다.** 빌드하던 순간의 데이터 스냅샷을 정적 HTML로 굳히는
것이다. 런타임에 새로 가져오지 않는다(단, 하이드레이션 후 클라에서 부분 갱신은 가능 →
"SSG 초기 + CSR 갱신").

## 선택 기준: 단 하나로 수렴한다

> **데이터가 얼마나 자주, 누구에게 다르게 바뀌는가?**

- 거의 안 바뀜(빌드 스냅샷으로 충분) → **SSG** (가장 빠름, 서버 부하 0, 변경 시 재빌드)
- 자주 바뀜 / 요청마다 최신 + SEO 필요 → **SSR**
- 사용자마다 다름(개인화·인증) → **CSR** (SEO 불필요)

## 동적 라우트의 SSG: 프리렌더 파라미터

`/movies/:id`는 `:id`가 변하는 동적 라우트인데 빌드러는 그 값들을 모른다. **프리렌더
파라미터 함수**가 "이 라우트의 `:id` 목록은 이것들이야"라고 알려주면, 빌드러가 각 인스턴스를
**별도 정적 HTML로 미리 굽는다**.

```
빌드 타임:
  getPrerenderParams() → ['action','drama','sci-fi']
       ├─ /genre/action  → (액션 목록 fetch) → genre-action.html   ⬅ 정적 파일
       ├─ /genre/drama   → ...                → genre-drama.html
       └─ /genre/sci-fi  → ...                → genre-sci-fi.html
런타임:
  /genre/action 요청 → 구워둔 genre-action.html 즉시 전송(서버 렌더 없음)
```

미리 굽지 않은 경로의 폴백(요청 시 SSR / CSR / 없음)을 함께 정한다.

## Angular 구현

```ts
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '',            renderMode: RenderMode.Prerender }, // SSG
  { path: 'movies/:id',  renderMode: RenderMode.Server },    // SSR
  { path: 'genre/:key',  renderMode: RenderMode.Server },
  { path: 'search',      renderMode: RenderMode.Server },
  { path: 'wishlist',    renderMode: RenderMode.Client },    // CSR
  { path: 'login',       renderMode: RenderMode.Client },
  { path: '**',          renderMode: RenderMode.Server },    // 폴백
];
```

- `provideServerRendering(withRoutes(serverRoutes))`로 등록.
- SSG 동적 라우트는 `getPrerenderParams()`(필요 시 `inject()`로 데이터 fetch) + `PrerenderFallback`.
- 응답 확인: SSR HTML의 `ng-server-context`가 `ssg`/`ssr` 등으로 모드를 보여준다.

## 컴포넌트 단위 — 증분 하이드레이션 (Angular)

"페이지는 SSR인데 무거운 위젯만 나중에/정적으로"는 `@defer`의 hydrate 트리거로 다룬다.

```html
@defer (hydrate on viewport) {  <!-- 서버가 그리고, 뷰포트 진입 시 하이드레이션 -->
  <app-heavy-chart [data]="data()" />
} @placeholder { <div class="skeleton"></div> }
```

- `hydrate on <트리거>` / `hydrate when <식>` / `hydrate never`(JS 0, 정적 HTML만).
- Angular 22는 `provideClientHydration()`만으로 증분 하이드레이션이 기본 ON
  (끄려면 `withNoIncrementalHydration()`).

## 다른 프레임워크 대응

- **Next.js(App Router)**: 기본 정적, `dynamic`/`revalidate`로 전환, `generateStaticParams`가
  프리렌더 파라미터, Server Components가 "서버에서만" 실행.
- **Nuxt**: `routeRules`로 라우트별 `prerender`/`ssr`/`ssr:false`(SPA), `nuxt generate`가 SSG.

## 흔한 함정

- 전체를 한 모드로 강제하지 말 것 — 페이지 성격에 맞춰 섞는 게 핵심.
- SSG로 두고 "왜 데이터가 안 바뀌지?" → 빌드 스냅샷이다. 자주 바뀌면 SSR.
- SSR 페이지가 많으면 Node 런타임이 항상 떠 있어야 한다(배포 고려).
