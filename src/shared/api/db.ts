/**
 * 도메인 모델 타입 (FSD: shared/api).
 * 업무: 카탈로그·회원 데이터의 형태를 정의한다. 데이터 저장은 백엔드(ADR-0003)가 맡고,
 * 클라이언트는 이 타입으로 응답을 읽는다. (과거 IndexedDB(Dexie) 스키마가 있었으나
 * 백엔드 전환으로 제거했고, 파일은 타입 출처로 유지한다.)
 */

/**
 * 영화 한 편. 영화·장르는 읽기 전용 목 데이터다.
 */
export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  /** 장르 키 목록. */
  genres: string[];
  runtime: number;
  synopsis: string;
  director: string;
  cast: string[];
  /** 포스터 대체 색(목 데이터라 실제 이미지 대신 컬러 블록). */
  posterColor: string;
  posterUrl?: string;
  ratingAverage: number;
  ratingCount: number;
  featured: boolean;
}

/** 장르. */
export interface Genre {
  key: string;
  label: string;
}

/**
 * 위시리스트 항목. (userId, movieId)가 자연 키다.
 */
export interface WishlistItem {
  userId: string;
  movieId: string;
  addedAt: string;
}

/**
 * 내 평점. 회원이 한 영화에 남긴 별점(1~5). (userId, movieId)가 자연 키다.
 */
export interface Rating {
  userId: string;
  movieId: string;
  score: number;
  ratedAt: string;
}
