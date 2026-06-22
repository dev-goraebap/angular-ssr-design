# Angular SSR/CSR 혼합 시연 — 영화 카탈로그

Angular 22에서 **SSR · CSR · SSG를 한 도메인에서 우아하게 혼합**하는 패턴을 보여주는 예제입니다.
도메인은 영화 카탈로그(가제 CineCat)이며, 데스크톱 모달 ↔ 모바일 바텀시트 적응형 UX,
URL 동기화 다이얼로그, 무한 스크롤, 쿠키 인증을 SSR과 함께 다룹니다.

> 기획·설계 문서: [`docs/기획/`](docs/기획/) · [`docs/설계/`](docs/설계/) (ADR 0001~0008)

## 아키텍처

```
[브라우저] --상대경로 /api, 쿠키 자동--> [Angular SSR :4000] --프록시--> [백엔드 :4001]
                                              ↑ 같은 origin → CORS 없음
[Angular SSR :4000] --내부호스트 http://localhost:4001, httpResource--> [백엔드 :4001]
                                              ↑ 서버간 호출 → CORS 없음
```

- **프론트(`src/`)**: Angular 22 + SSR(`@angular/ssr`) + spartan/ui(Brain+Helm) + GSAP + Tailwind v4, FSD 구조
- **백엔드(`backend/`)**: 별도 Express(4001) 목 API + 인메모리 데이터(영화/세션/위시리스트/평점)
- **데이터 페칭**: 읽기는 `httpResource`(Transfer State 자동), 쓰기는 `HttpClient`
- **인증**: HttpOnly 쿠키 세션, 상태는 `/api/me`로 확인

### 페이지별 렌더링 모드 (`src/app/app.routes.server.ts`)

| 경로 | 화면 | 모드 |
|------|------|------|
| `/` | 홈 | **Prerender (SSG)** |
| `/movies/:id` · `/genre/:key` · `/search` | 상세·장르·검색 | **Server (SSR)** |
| `/wishlist` · `/me/ratings` · `/login` · `/settings` | 개인화·인증·설정 | **Client (CSR)** |

## 실행

### 개발 (백엔드 + 프론트 동시)

```bash
npm run dev      # concurrently: 백엔드(4001) + ng serve(4000/dev 4200)
```

- 백엔드만: `npm run backend` (tsx watch, 4001)
- 프론트만: `npm start` (= `ng serve`) — **단, 백엔드가 떠 있어야** SSR이 데이터를 가져온다

데모 계정: **`demo` / `demo1234`**

### 모바일(실기기) 접속

같은 와이파이의 폰에서 `http://<PC-LAN-IP>:4200` 으로 접속한다.
`angular.json`의 serve 옵션에 `host: 0.0.0.0`, `proxyConfig`, `allowedHosts`가 설정돼 있다.
IP가 바뀌면 `allowedHosts`의 주소만 갱신한다. (Windows 방화벽이 4200 인바운드를 막으면 허용 필요)

### 빌드 / 프로덕션 SSR

```bash
npm run build                              # SSR 빌드(dist/)
node dist/angular-ssr-design/server/server.mjs   # 또는 npm run serve:ssr:angular-ssr-design
```

> SSG(홈)는 빌드 타임에 백엔드를 호출하므로, **빌드 시에도 백엔드(4001)가 떠 있어야** 정적 HTML에 데이터가 포함된다.

## 프로젝트 구조 (FSD v2.1)

```
src/
├── app/        Angular 부트스트랩·라우팅·렌더 모드
├── pages/      라우트별 페이지(home/movie-detail/genre/search/wishlist/...)
├── widgets/    app-nav, search-box
├── features/   open-movie(적응형 모달/페이지 분기)
├── entities/   movie(card/detail/rate-sheet)
└── shared/     ui(spartan helm + 적응형 sheet), api, auth, lib
backend/        목 API(Express)
```

## 테스트

```bash
npm test         # Vitest
```
