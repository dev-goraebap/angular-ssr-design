import { Service, type Signal } from '@angular/core';
import { db, type Movie, type Rating } from './db';
import { liveQuerySignal } from '@/shared/lib';

/** 내가 평가한 영화 한 건(영화 + 내 점수). */
export interface RatedMovie {
  movie: Movie;
  score: number;
}

/**
 * 평점 저장소.
 * 업무: 회원이 한 영화에 남긴 별점(1~5)을 (userId, movieId)로 관리한다. 한 영화당 한 평점이다.
 * 인증/세션은 ADR-0006에서 다루므로 여기서는 userId를 받기만 한다.
 */
@Service()
export class RatingRepository {
  /** 회원이 남긴 평점 목록(최근 평가 순). */
  list(userId: string): Promise<Rating[]> {
    return db.ratings.where('userId').equals(userId).reverse().sortBy('ratedAt');
  }

  /**
   * 회원의 평점을 영화 + 점수로 펼쳐 반응형으로 노출한다(최근 평가 순).
   * 주입 컨텍스트에서 호출해야 한다(liveQuerySignal). 평가/수정/삭제 시 자동 갱신된다.
   */
  liveRated(userId: string): Signal<RatedMovie[]> {
    return liveQuerySignal<RatedMovie[]>(async () => {
      const ratings = await db.ratings.where('userId').equals(userId).reverse().sortBy('ratedAt');
      // bulkGet으로 한 번에 조회(평점 N건마다 get하는 N+1을 피한다).
      const movies = await db.movies.bulkGet(ratings.map((r) => r.movieId));
      return ratings
        .map((r, i) => ({ movie: movies[i], score: r.score }))
        .filter((x): x is RatedMovie => x.movie !== undefined);
    }, []);
  }

  get(userId: string, movieId: string): Promise<Rating | undefined> {
    return db.ratings.get([userId, movieId]);
  }

  /** 별점 남기기/수정. 같은 영화면 덮어쓴다(put). */
  async set(userId: string, movieId: string, score: number, ratedAt: string): Promise<void> {
    await db.ratings.put({ userId, movieId, score, ratedAt });
  }

  async remove(userId: string, movieId: string): Promise<void> {
    await db.ratings.delete([userId, movieId]);
  }
}
