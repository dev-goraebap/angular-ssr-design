# 백엔드 분리 · 프록시 · 쿠키 인증 통일

## CORS는 브라우저만의 문제다

CORS는 브라우저가 강제하는 보안 메커니즘이다. **서버→서버 호출에는 CORS가 없다.** 이 사실을
활용해 두 경로를 다르게 구성한다.

```
[브라우저] --상대경로 /api, 쿠키 자동-->  [SSR 서버] --프록시--> [백엔드]
                                              ↑ 같은 origin → CORS 없음
[SSR 서버] --내부 호스트로 직접 호출-->     [백엔드]
                                              ↑ 서버간 호출 → CORS 없음, HTTPS 불필요
```

- **브라우저**는 같은 origin `/api`만 호출 → SSR 서버가 받아 백엔드로 프록시 → **CORS 제거**.
- **SSR**은 내부 호스트(`http://api-internal:8080` 또는 `http://localhost:4001`)로 직접 호출.

## baseURL을 플랫폼별로 가른다

SSR HTTP 클라이언트는 절대 URL을 요구한다(서버엔 "현재 origin"이 없다). 상대경로 `/api/...`를
쓰되, **인터셉터에서 플랫폼별 prefix**를 붙인다.

```ts
// shared/api/http.ts
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root', factory: () => '',           // 브라우저 기본: 상대경로
});
export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (base && req.url.startsWith('/')) req = req.clone({ url: base + req.url });
  return next(req);
};
// app.config.server.ts → { provide: API_BASE_URL, useValue: 'http://localhost:4001' }
```

## dev와 prod의 프록시 경로가 다르다 (중요)

- **prod**: SSR 서버 엔트리(`server.ts`)에 프록시 미들웨어를 단다.

  ```ts
  app.use(createProxyMiddleware({ target: 'http://localhost:4001', changeOrigin: true,
    pathFilter: '/api' }));  // 마운트('/api', ...)를 쓰면 경로가 잘리니 pathFilter 사용
  ```

- **dev**: dev-server(vite)는 `server.ts`의 미들웨어를 쓰지 않는다 → **별도 프록시 설정**이
  필요하다.

  ```jsonc
  // proxy.conf.json
  { "/api": { "target": "http://localhost:4001", "secure": false, "changeOrigin": true } }
  // angular.json serve.options: { "proxyConfig": "proxy.conf.json" }
  ```

- 두 프로세스 동시 실행: `concurrently "npm:backend" "npm:start"`.

## 인증을 쿠키 한 줄기로 통일

- `localStorage` 토큰은 **서버에 없어** SSR이 비로그인으로 렌더한다(깜빡임·불일치). 토큰을
  **쿠키**(가급적 `HttpOnly`+`Secure`+`SameSite`)에 둔다.
- **브라우저**: 쿠키 자동 전송(같은 origin이면 자연스럽게).
- **SSR**: 들어온 요청의 `Cookie` 헤더를 읽어 백엔드로 **포워딩**.

  ```ts
  export const authForwardInterceptor: HttpInterceptorFn = (req, next) => {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      const cookie = inject(REQUEST)?.headers.get('cookie');  // @angular/core REQUEST
      if (cookie) req = req.clone({ setHeaders: { cookie } });
    }
    return next(req);
  };
  ```

- **`HttpOnly`면 JS가 토큰을 못 읽으므로** 인증 상태는 `/me` 엔드포인트로 판단한다.

  ```ts
  ensureLoaded(): Promise<boolean> {            // 가드가 await
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve(false);
    this.loadPromise ??= firstValueFrom(this.http.get<{user}>('/api/me'))
      .then(r => (this.session.set(r.user), true)).catch(() => false);
    return this.loadPromise;
  }
  ```

## 단순화 규칙: 개인화가 CSR이면 SSR 포워딩을 생략하라

개인화 화면(위시리스트·마이페이지)을 전부 CSR로 두면, 인증 상태 확인이 **브라우저에서**
일어난다. 그러면 SSR 쿠키 포워딩 인터셉터가 **필요 없다** — 클라에서 `/me`만으로 충분하다.
SSR에서도 로그인 상태로 렌더해야 하는 페이지가 있을 때만 포워딩을 추가한다.

## 함정

- **SSRF/허용 호스트**: Angular 22 platform-server는 허용되지 않은 `Host` 헤더를 400으로
  거부한다(`security.allowedHosts: []`면 전부 거부). dev·모바일(LAN IP) 접속 시 호스트를
  명시해야 한다. 내부 호출 URL은 정상 절대 URL 형태로 구성한다.
- **`localhost` vs `127.0.0.1`**: Node fetch가 `localhost`를 IPv6(`::1`)로 해석하는데 백엔드가
  IPv4만 listen하면 연결이 거부될 수 있다 → 내부 호출 타겟을 `127.0.0.1`로 고정하면 안전.
- **로그인 직후 `Set-Cookie`** 가 프록시를 거쳐 브라우저로 전달되는지 확인(프록시가 쿠키를
  올바르게 패스해야 한다).

## 다른 프레임워크 대응

- **Next.js**: `next.config` rewrites로 `/api` 프록시, `cookies()`로 서버에서 쿠키 접근.
- **Nuxt**: nitro `devProxy`/`routeRules.proxy`, `useRequestHeaders(['cookie'])`로 포워딩.
