import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * 페이지별 렌더링 전략 (ADR-0002).
 * - 홈: 정적이라 SSG(Prerender)
 * - 공개 콘텐츠(상세/장르/검색): 요청마다 SSR
 * - 개인화/인증 영역(로그인/위시리스트/내 평점/설정): CSR
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender }, // 홈 (SSG)
  { path: 'movies/:id', renderMode: RenderMode.Server }, // 상세 (SSR)
  { path: 'genre/:key', renderMode: RenderMode.Server }, // 장르 (SSR)
  { path: 'search', renderMode: RenderMode.Server }, // 검색 (SSR)
  { path: 'login', renderMode: RenderMode.Client }, // 로그인 (CSR)
  { path: 'wishlist', renderMode: RenderMode.Client }, // 위시리스트 (CSR)
  { path: 'me/ratings', renderMode: RenderMode.Client }, // 내 평점 (CSR)
  { path: 'settings', renderMode: RenderMode.Client }, // 설정 (CSR)
  { path: '**', renderMode: RenderMode.Server }, // 폴백 (SSR)
];
