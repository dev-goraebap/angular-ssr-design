import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_BASE_URL } from '@/shared/api';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // SSR은 내부 호스트로 백엔드를 직접 호출한다(서버간, CORS 없음, ADR-0003).
    { provide: API_BASE_URL, useValue: process.env['API_TARGET'] ?? 'http://localhost:4001' },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
