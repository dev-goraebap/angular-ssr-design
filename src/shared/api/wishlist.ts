import { Service, type Signal } from '@angular/core';
import { db, type Movie, type WishlistItem } from './db';
import { liveQuerySignal } from '@/shared/lib';

/**
 * 위시리스트 저장소.
 * 업무: 회원이 담은 영화를 (userId, movieId)로 관리한다. 같은 영화를 두 번 담아도 한 건이다.
 * 인증/세션은 ADR-0006에서 다루므로 여기서는 userId를 받기만 한다.
 */
@Service()
export class WishlistRepository {
  /** 회원의 위시리스트(최근 담은 순). */
  list(userId: string): Promise<WishlistItem[]> {
    return db.wishlist.where('userId').equals(userId).reverse().sortBy('addedAt');
  }

  /**
   * 회원의 위시리스트를 영화 객체로 펼쳐 반응형으로 노출한다(최근 담은 순).
   * 주입 컨텍스트에서 호출해야 한다(liveQuerySignal). 담기/빼기 시 자동 갱신된다.
   */
  liveMovies(userId: string): Signal<Movie[]> {
    return liveQuerySignal<Movie[]>(async () => {
      const items = await db.wishlist.where('userId').equals(userId).reverse().sortBy('addedAt');
      const movies = await db.movies.bulkGet(items.map((i) => i.movieId));
      return movies.filter((m): m is Movie => m !== undefined);
    }, []);
  }

  has(userId: string, movieId: string): Promise<boolean> {
    return db.wishlist.get([userId, movieId]).then((it) => it !== undefined);
  }

  /** 담기. 이미 있으면 addedAt만 갱신된다(put). */
  async add(userId: string, movieId: string, addedAt: string): Promise<void> {
    await db.wishlist.put({ userId, movieId, addedAt });
  }

  async remove(userId: string, movieId: string): Promise<void> {
    await db.wishlist.delete([userId, movieId]);
  }
}
