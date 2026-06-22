import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { requestPersistentStorage } from '@/shared/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: 라우트 파라미터(:id)를 컴포넌트 input으로 바인딩한다.
    provideRouter(routes, withComponentInputBinding()),
    // 하이드레이션 활성화. Angular 22는 provideClientHydration()만으로 증분 하이드레이션이
    // 기본 ON이다(ADR-0002). withEventReplay로 하이드레이션 전 발생한 이벤트를 재생한다.
    provideClientHydration(withEventReplay()),
    // 시작 시 영속 저장소를 요청한다(브라우저에서만 동작, 실패해도 앱은 계속 뜬다).
    provideAppInitializer(() => {
      void requestPersistentStorage();
    }),
  ],
};
