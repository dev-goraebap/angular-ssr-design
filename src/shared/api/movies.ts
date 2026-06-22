import { Service, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { Movie } from './db';

/**
 * 영화 저장소 (ADR-0005).
 * 업무: 파라미터 없는 전역 목록(전체·추천)을 httpResource로 보유해 반응형 시그널로 노출한다.
 * SSR에서 서버가 가져온 데이터는 Transfer State로 브라우저에 전달돼 하이드레이션 중복 호출이 없다.
 * 파라미터가 있는 조회(장르별·검색·상세)는 각 페이지가 라우트 시그널에 맞춰 httpResource로 직접 만든다.
 */
@Service()
export class MovieRepository {
  /** 전체 목록(최신순). 백엔드가 정렬해 내려준다. */
  private readonly allRes = httpResource<{ items: Movie[]; total: number }>(() => '/api/movies');
  readonly all = computed(() => this.allRes.value()?.items ?? []);

  /** 홈 추천(featured) 목록. */
  private readonly featuredRes = httpResource<Movie[]>(() => '/api/movies/featured');
  readonly featured = computed(() => this.featuredRes.value() ?? []);
}
