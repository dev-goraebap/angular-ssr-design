import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Movie } from './db';

/** 내가 평가한 영화 한 건(영화 + 내 점수). */
export interface RatedMovie {
  movie: Movie;
  score: number;
}

/**
 * 평점 저장소 (ADR-0003/0004).
 * 업무: 회원이 한 영화에 남긴 별점(1~5)을 백엔드로 관리한다. 사용자는 세션 쿠키로 식별된다.
 * 목록 조회는 페이지가 httpResource로 직접 하고, 여기서는 단건 조회/저장/삭제만 제공한다.
 */
@Service()
export class RatingRepository {
  private readonly http = inject(HttpClient);

  /** 이 영화의 내 점수(없으면 0). */
  async get(movieId: string): Promise<number> {
    const r = await firstValueFrom(this.http.get<{ score: number | null }>(`/api/ratings/${movieId}`));
    return r.score ?? 0;
  }

  /** 별점 남기기/수정. */
  set(movieId: string, score: number): Promise<unknown> {
    return firstValueFrom(this.http.put(`/api/ratings/${movieId}`, { score }));
  }

  remove(movieId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`/api/ratings/${movieId}`));
  }
}
