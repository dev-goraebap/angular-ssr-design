import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { requestPersistentStorage, baseUrlInterceptor } from '@/shared/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: 라우트 파라미터(:id)를 컴포넌트 input으로 바인딩한다.
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: SSR에서 httpResource/HttpClient가 fetch 기반으로 동작(ADR-0005).
    // baseUrlInterceptor: 상대경로 '/api'에 플랫폼별 baseURL을 붙인다(ADR-0003).
    provideHttpClient(withFetch(), withInterceptors([baseUrlInterceptor])),
    // 하이드레이션 활성화. Angular 22는 provideClientHydration()만으로 증분 하이드레이션이
    // 기본 ON이다(ADR-0002). withEventReplay로 하이드레이션 전 발생한 이벤트를 재생한다.
    provideClientHydration(withEventReplay()),
    // 시작 시 영속 저장소를 요청한다(브라우저에서만 동작, 실패해도 앱은 계속 뜬다).
    provideAppInitializer(() => {
      void requestPersistentStorage();
    }),
  ],
};
