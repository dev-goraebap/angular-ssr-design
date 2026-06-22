/**
 * 백엔드 인메모리 스토어 (ADR-0003).
 * 영화/장르는 프론트의 SEED를 단일 출처로 재사용한다(seed.ts는 type-only import라
 * Dexie를 런타임에 끌어오지 않으므로 서버에서 안전하다). 위시리스트/평점/세션은
 * 프로세스 메모리에 둔다 — 데모용이라 재시작하면 초기화된다.
 */
import { SEED_GENRES, SEED_MOVIES, GENRE_LABELS } from '../src/shared/api/seed';
import type { Movie, Genre, WishlistItem, Rating } from '../src/shared/api/db';

export type { Movie, Genre, WishlistItem, Rating };
export { GENRE_LABELS };

/** 읽기 전용 카탈로그. */
export const movies: Movie[] = SEED_MOVIES;
export const genres: Genre[] = SEED_GENRES;

const movieById = new Map(movies.map((m) => [m.id, m]));
export function findMovie(id: string): Movie | undefined {
  return movieById.get(id);
}

/** 데모 계정(시연 단순화, ADR-0004). 실제 인증은 범위 밖. */
export const DEMO = { id: 'demo', password: 'demo1234', name: '데모 사용자' } as const;

export interface SessionUser {
  id: string;
  name: string;
}

/** 세션 토큰 → 사용자. HttpOnly 쿠키로 식별한다(ADR-0004). */
const sessions = new Map<string, SessionUser>();
export function createSession(token: string, user: SessionUser): void {
  sessions.set(token, user);
}
export function getSession(token: string | undefined): SessionUser | undefined {
  return token ? sessions.get(token) : undefined;
}
export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

/** 회원별 위시리스트/평점 (userId → Map<movieId, item>). */
const wishlists = new Map<string, Map<string, WishlistItem>>();
const ratings = new Map<string, Map<string, Rating>>();

function bucket<V>(map: Map<string, Map<string, V>>, userId: string): Map<string, V> {
  let b = map.get(userId);
  if (!b) {
    b = new Map();
    map.set(userId, b);
  }
  return b;
}

// --- 위시리스트 ---
export function wishlistMovies(userId: string): Movie[] {
  const items = [...bucket(wishlists, userId).values()].sort((a, b) =>
    b.addedAt.localeCompare(a.addedAt),
  );
  return items.map((i) => findMovie(i.movieId)).filter((m): m is Movie => m !== undefined);
}
export function wishlistIds(userId: string): string[] {
  return [...bucket(wishlists, userId).keys()];
}
export function addWishlist(userId: string, movieId: string, addedAt: string): void {
  bucket(wishlists, userId).set(movieId, { userId, movieId, addedAt });
}
export function removeWishlist(userId: string, movieId: string): void {
  bucket(wishlists, userId).delete(movieId);
}

// --- 평점 ---
export interface RatedMovie {
  movie: Movie;
  score: number;
}
export function ratedMovies(userId: string): RatedMovie[] {
  const items = [...bucket(ratings, userId).values()].sort((a, b) =>
    b.ratedAt.localeCompare(a.ratedAt),
  );
  return items
    .map((r) => {
      const movie = findMovie(r.movieId);
      return movie ? { movie, score: r.score } : undefined;
    })
    .filter((x): x is RatedMovie => x !== undefined);
}
export function getRating(userId: string, movieId: string): Rating | undefined {
  return bucket(ratings, userId).get(movieId);
}
export function setRating(userId: string, movieId: string, score: number, ratedAt: string): void {
  bucket(ratings, userId).set(movieId, { userId, movieId, score, ratedAt });
}
export function removeRating(userId: string, movieId: string): void {
  bucket(ratings, userId).delete(movieId);
}
