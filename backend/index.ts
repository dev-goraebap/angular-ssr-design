/**
 * 목 백엔드 (ADR-0003) — Angular SSR 서버(4000)와 분리된 별도 프로세스(4001).
 * - 브라우저는 SSR Express의 '/api' 프록시를 거쳐 같은 origin으로 호출(CORS 없음).
 * - Angular SSR은 내부 호스트(http://localhost:4001)로 직접 서버간 호출(CORS 없음).
 * 따라서 이 서버 자체에는 CORS 설정이 필요 없다.
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import {
  movies,
  genres,
  findMovie,
  DEMO,
  type SessionUser,
  createSession,
  getSession,
  destroySession,
  wishlistMovies,
  wishlistIds,
  addWishlist,
  removeWishlist,
  ratedMovies,
  getRating,
  setRating,
  removeRating,
} from './store';

const app = express();
app.use(express.json());

const SESSION_COOKIE = 'session';

/** 요청 헤더의 Cookie를 파싱한다(cookie-parser 없이). */
function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** 세션 쿠키로 현재 사용자를 req.user에 싣는다(없으면 undefined). */
function withUser(req: Request): SessionUser | undefined {
  const token = parseCookies(req)[SESSION_COOKIE];
  return getSession(token);
}

/** 인증 필수 가드 — 미인증이면 401. */
function requireUser(req: Request, res: Response, next: NextFunction): void {
  const user = withUser(req);
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.locals['user'] = user;
  next();
}

const now = () => new Date().toISOString();

// ---------- 카탈로그 (공개) ----------

// 최신순 전체 목록. 정렬·페이지네이션은 쿼리로 받는다(무한 스크롤, ADR-0006).
app.get('/api/movies', (req, res) => {
  const sorted = [...movies].sort((a, b) => b.year - a.year);
  const offset = Number(req.query['offset'] ?? 0) || 0;
  const limit = Number(req.query['limit'] ?? sorted.length) || sorted.length;
  res.json({ items: sorted.slice(offset, offset + limit), total: sorted.length });
});

// featured는 :id보다 먼저 선언해야 :id에 잡히지 않는다.
app.get('/api/movies/featured', (_req, res) => {
  res.json(movies.filter((m) => m.featured));
});

app.get('/api/movies/:id', (req, res) => {
  const movie = findMovie(req.params.id);
  if (!movie) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(movie);
});

app.get('/api/genres', (_req, res) => {
  res.json(genres);
});

app.get('/api/genres/:key/movies', (req, res) => {
  res.json(movies.filter((m) => m.genres.includes(req.params.key)));
});

app.get('/api/search', (req, res) => {
  const q = String(req.query['q'] ?? '').trim().toLowerCase();
  if (!q) {
    res.json([]);
    return;
  }
  res.json(
    movies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle?.toLowerCase().includes(q) ?? false),
    ),
  );
});

// ---------- 인증 (ADR-0004) ----------

app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body ?? {};
  if (id !== DEMO.id || password !== DEMO.password) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const user: SessionUser = { id: DEMO.id, name: DEMO.name };
  const token = randomUUID();
  createSession(token, user);
  // HttpOnly 쿠키로 세션을 발급한다. dev(HTTP localhost)에서는 Secure 생략, SameSite=Lax.
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(parseCookies(req)[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = withUser(req);
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json({ user });
});

// ---------- 위시리스트 (회원) ----------

app.get('/api/wishlist', requireUser, (_req, res) => {
  res.json(wishlistMovies(res.locals['user'].id));
});

app.get('/api/wishlist/ids', requireUser, (_req, res) => {
  res.json(wishlistIds(res.locals['user'].id));
});

app.put('/api/wishlist/:movieId', requireUser, (req, res) => {
  if (!findMovie(req.params.movieId)) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  addWishlist(res.locals['user'].id, req.params.movieId, now());
  res.json({ ok: true });
});

app.delete('/api/wishlist/:movieId', requireUser, (req, res) => {
  removeWishlist(res.locals['user'].id, req.params.movieId);
  res.json({ ok: true });
});

// ---------- 평점 (회원) ----------

app.get('/api/ratings', requireUser, (_req, res) => {
  res.json(ratedMovies(res.locals['user'].id));
});

app.get('/api/ratings/:movieId', requireUser, (req, res) => {
  const rating = getRating(res.locals['user'].id, req.params.movieId);
  res.json({ score: rating?.score ?? null });
});

app.put('/api/ratings/:movieId', requireUser, (req, res) => {
  const score = Number(req.body?.score);
  if (!findMovie(req.params.movieId) || !(score >= 1 && score <= 5)) {
    res.status(400).json({ error: 'invalid' });
    return;
  }
  setRating(res.locals['user'].id, req.params.movieId, score, now());
  res.json({ ok: true });
});

app.delete('/api/ratings/:movieId', requireUser, (req, res) => {
  removeRating(res.locals['user'].id, req.params.movieId);
  res.json({ ok: true });
});

const PORT = process.env['API_PORT'] ?? 4001;
app.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});
