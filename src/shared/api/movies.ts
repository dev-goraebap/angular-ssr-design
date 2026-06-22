import { Service } from '@angular/core';
import { db, type Movie } from './db';
import { liveQuerySignal } from '@/shared/lib';

/**
 * 영화 저장소.
 * 업무: 카탈로그 읽기를 한 곳에 가둔다. 화면 코드는 Dexie를 모르고 시그널·메서드만 쓴다.
 * 영화는 읽기 전용 목 데이터라 쓰기 메서드는 두지 않는다.
 */
@Service()
export class MovieRepository {
  /** 전체 목록(최신순). */
  readonly all = liveQuerySignal<Movie[]>(
    () => db.movies.orderBy('year').reverse().toArray(),
    [],
  );

  /** 홈 추천(featured) 목록. featured는 비인덱스라 메모리 필터로 거른다. */
  readonly featured = liveQuerySignal<Movie[]>(
    () => db.movies.filter((m) => m.featured).toArray(),
    [],
  );

  get(id: string): Promise<Movie | undefined> {
    return db.movies.get(id);
  }

  /** 장르 키로 거른 목록. */
  byGenre(key: string): Promise<Movie[]> {
    return db.movies.where('genres').equals(key).toArray();
  }

  /** 제목·원제 부분 일치 검색(목 데이터 규모라 클라이언트 필터로 충분). */
  async search(query: string): Promise<Movie[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const all = await db.movies.toArray();
    return all.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle?.toLowerCase().includes(q) ?? false),
    );
  }
}
