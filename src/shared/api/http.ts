import { InjectionToken, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * API baseURL (ADR-0003).
 * - 브라우저: 빈 문자열 → 상대경로 '/api/...'로 호출(같은 origin, SSR Express가 백엔드로 프록시).
 * - 서버(SSR): app.config.server.ts에서 내부 호스트(http://localhost:4001)를 주입 →
 *   서버간 직접 호출(CORS 없음).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});

/**
 * 상대경로 요청('/api/...')에 baseURL을 붙인다.
 * 브라우저는 baseURL이 비어 있어 그대로 두고, SSR은 내부 호스트를 prefix한다.
 */
export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (base && req.url.startsWith('/')) {
    req = req.clone({ url: base + req.url });
  }
  return next(req);
};
