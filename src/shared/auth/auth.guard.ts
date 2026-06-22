import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * 회원 전용 라우트 가드(ADR-0006).
 * 업무: 미인증이면 /login으로 보내고, 원래 가려던 경로를 returnUrl로 넘겨 로그인 후 복귀시킨다.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // HttpOnly 쿠키라 상태를 /api/me로 확인한다 → 비동기. 보호 라우트는 CSR이라(ADR-0002)
  // 가드는 브라우저에서 실행된다.
  if (await auth.ensureLoaded()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
