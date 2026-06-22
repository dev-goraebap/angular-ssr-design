# 브라우저 API SSR 가드 & 클라 인터랙션 비충돌

## 1. 클라 인터랙션은 SSR과 충돌하지 않는다

가장 흔한 오해: "URL을 바꾸며 모달을 띄우고 뒤로가기로 닫는 SPA 인터랙션이 SSR과 부딪히지
않을까?" → **부딪히지 않는다.** 원리는 하나다.

> **SSR/SSG는 최초 진입(서버 1회)만, 모달·뒤로가기 같은 인터랙션은 그 이후 클라이언트만**
> 담당한다. 둘은 시간적으로 겹치지 않는다.

| 시나리오 | 렌더 주체 | 결과 |
|----------|-----------|------|
| 공유 링크로 `/movies/123` 직접 진입 | SSR | **canonical 페이지**로 렌더(모달 아님) |
| 목록에서 클릭 | 클라(하이드레이션 후) | URL만 바꾸고(`location.go`) 모달 가로채기 |
| 모달에서 뒤로가기 | 클라 | popstate 구독으로 모달 닫고 URL 복원 |

- 모달을 여는 코드는 **클릭 핸들러**에서만 호출 → 서버에서 실행되지 않는다.
- 라우터의 `Location`(go/back/subscribe)·`CloseWatcher`는 SSR-safe하거나 런타임 가드가 있다.
- URL을 항상 **canonical**로 유지하면 공유·딥링크·SEO가 보존된다(설계 의도가 SSR과 맞물림).

→ 이런 패턴(적응형 모달/바텀시트, 뒤로가기 연동)은 SSR을 얹어도 **거의 손대지 않는다.**

## 2. 가드를 '쓰는 쪽이 모르게' 두 곳에 캡슐화

브라우저 체크(`isPlatformBrowser`/`afterNextRender`)를 도메인 페이지에 흩뿌리지 않는다.
성격에 따라 둘 중 하나에 가둔다.

| 종류 | 캡슐화 위치 | 예 |
|------|-------------|-----|
| **렌더/DOM 동작** — 요소 측정, 제스처, 옵저버, 애니메이션 | **공용 UI 컴포넌트 안** | 적응형 시트, 무한 스크롤 |
| **플랫폼 API 접근** — `window`/`localStorage`/`navigator`/`matchMedia` | **core 토큰/서비스** | `WINDOW` 토큰, 스토리지 서비스 |

```ts
// 플랫폼 API → core 토큰
export const WINDOW = new InjectionToken<Window | null>('WINDOW', {
  providedIn: 'root',
  factory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? window : null),
});

// DOM 동작 → UI 컴포넌트가 afterNextRender로 가둠
constructor() {
  afterNextRender(() => this.initDragToDismiss()); // 제스처는 브라우저에서만
}

// localStorage 동기화 유틸 — 서버에선 초기값만
export function localStorageSignal<T>(key: string, initial: T) {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const stored = isBrowser ? localStorage.getItem(key) : null;
  const state = signal<T>(stored ? JSON.parse(stored) : initial);
  if (isBrowser) effect(() => localStorage.setItem(key, JSON.stringify(state())));
  return state;
}
```

## 3. 중복 가드하지 않는다

프레임워크/라이브러리가 이미 SSR-safe하게 감싼 것은 또 가드하지 않는다.

- Angular CDK의 `Overlay`·`FocusTrap`·`BreakpointObserver`는 서버에서 안전하다.
- 그래서 우리가 직접 `afterNextRender`로 감쌀 표면은 **우리가 추가한 브라우저 전용 코드**
  (예: GSAP 제스처, 직접 만든 `IntersectionObserver`)로 좁아진다.

## 4. 실측: 데이터가 SSR에 들어오면 숨어 있던 코드가 깨어난다

무한 스크롤 센티넬은 `@if (hasMore())`로 그려진다. 데이터 계층이 브라우저 전용이던 동안엔
SSR에서 목록이 비어 `hasMore=false` → 센티넬이 안 그려져 `IntersectionObserver`도 안 만들어졌다.
데이터를 SSR로 옮기자 목록이 차며 센티넬이 **서버에서 렌더**됐고, 그 effect가 서버에서
`new IntersectionObserver`를 호출해 터졌다.

- 교훈: "지금 안 터진다"가 "SSR-safe"를 뜻하지 않는다. 데이터가 채워지면 렌더 경로가 바뀐다.
- 해결: 옵저버 생성 effect에 `isPlatformBrowser` 가드.

```ts
const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
effect(() => {
  const el = this.sentinel()?.nativeElement;
  io?.disconnect();
  if (!el || !isBrowser) return;            // ← 서버에선 만들지 않는다
  io = new IntersectionObserver(/* ... */);
  io.observe(el);
});
```

## 5. 하이드레이션 불일치 방지

- 서버와 클라의 **초기 트리가 같아야** 한다. 테마·인증 상태처럼 초기에 다를 수 있는 값은
  초기값을 일치시키고(예: 둘 다 비로그인/기본 테마로 시작) 분기는 하이드레이션 이후로 미룬다.
- 모바일/데스크톱 분기 렌더는 JS 측정 대신 CSS(미디어 쿼리)로 우선 처리하고, JS 기반 구조
  변경은 하이드레이션 뒤에.

## 안티패턴

- 페이지/템플릿에 `@if (isBrowser)`를 흩뿌리기(도메인이 인프라를 알게 됨, 불일치 위험).
- 스타일 레이어(클래스만 담당)에 브라우저 로직 넣기 — 동작 가드는 동작 계층/공용 컴포넌트로.
- CDK 등 이미 SSR-safe한 것 위에 중복 가드.

## 다른 프레임워크 대응

- **React/Next**: `useEffect`(클라 전용)·`typeof window !== 'undefined'`, Server Components는
  애초에 브라우저 API 사용 불가(경계가 명시적).
- **Nuxt**: `<ClientOnly>`, `import.meta.client`, `onMounted`(클라 전용).
