import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * '/api' 프록시 (ADR-0003).
 * 브라우저는 같은 origin('/api')으로만 호출하고, SSR Express가 이를 백엔드(4001)로
 * 넘긴다 → 브라우저는 CORS를 겪지 않는다. 쿠키(Set-Cookie/Cookie)도 그대로 패스된다.
 * 정적 서빙·Angular 렌더보다 먼저 선언해 '/api'가 다른 핸들러에 잡히지 않게 한다.
 */
const apiTarget = process.env['API_TARGET'] ?? 'http://localhost:4001';
app.use(
  createProxyMiddleware({
    target: apiTarget,
    changeOrigin: true,
    // pathFilter로 '/api'만 프록시한다. 마운트('/api', ...)를 쓰면 경로가 잘려
    // 백엔드에 '/movies'로 도달하므로, 필터 방식으로 '/api/...'를 그대로 전달한다.
    pathFilter: '/api',
  }),
);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
