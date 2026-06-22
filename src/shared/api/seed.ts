import type { Genre, Movie } from './db';

/**
 * 시드 데이터 — 외부 API 없이 카탈로그를 채우는 목(mock) 콘텐츠.
 * 업무: 영화·장르는 읽기 전용이다. DB가 처음 만들어질 때 한 번 적재한다(db.ts populate).
 * 제목·인물은 실제 작품이 아닌 가공 데이터다.
 */

export const SEED_GENRES: Genre[] = [
  { key: 'action', label: '액션' },
  { key: 'drama', label: '드라마' },
  { key: 'sci-fi', label: 'SF' },
  { key: 'comedy', label: '코미디' },
  { key: 'thriller', label: '스릴러' },
  { key: 'animation', label: '애니메이션' },
  { key: 'romance', label: '로맨스' },
  { key: 'horror', label: '공포' },
];

/** 장르 키 → 표시명. 키만 가진 곳(영화의 genres)에서 라벨을 빠르게 찾는다. */
export const GENRE_LABELS: Record<string, string> = Object.fromEntries(
  SEED_GENRES.map((g) => [g.key, g.label]),
);

const CURATED_MOVIES: Movie[] = [
  {
    id: 'orbit-of-silence',
    title: '침묵의 궤도',
    originalTitle: 'Orbit of Silence',
    year: 2024,
    genres: ['sci-fi', 'drama'],
    runtime: 138,
    synopsis: '버려진 궤도 정거장에 홀로 남은 정비공이 지구로부터 온 마지막 신호를 좇는다.',
    director: '한미래',
    cast: ['정우성', '김다미', '박해수'],
    posterColor: '#1e2a4a',
    ratingAverage: 4.5,
    ratingCount: 1280,
    featured: true,
  },
  {
    id: 'paper-tigers',
    title: '종이 호랑이',
    originalTitle: 'Paper Tigers',
    year: 2023,
    genres: ['action', 'thriller'],
    runtime: 121,
    synopsis: '은퇴한 경호원이 옛 동료의 죽음을 파헤치며 거대 조직과 맞선다.',
    director: '오세훈',
    cast: ['마동석', '이정재'],
    posterColor: '#4a1e1e',
    ratingAverage: 4.1,
    ratingCount: 940,
    featured: true,
  },
  {
    id: 'midnight-bakery',
    title: '자정의 빵집',
    originalTitle: 'Midnight Bakery',
    year: 2025,
    genres: ['romance', 'drama'],
    runtime: 104,
    synopsis: '불면증을 앓는 두 사람이 자정에만 문을 여는 빵집에서 매일 밤 마주친다.',
    director: '윤서래',
    cast: ['박보영', '남주혁'],
    posterColor: '#4a3a1e',
    ratingAverage: 4.3,
    ratingCount: 2100,
    featured: true,
  },
  {
    id: 'the-last-algorithm',
    title: '마지막 알고리즘',
    originalTitle: 'The Last Algorithm',
    year: 2024,
    genres: ['sci-fi', 'thriller'],
    runtime: 142,
    synopsis: '자신을 지우려는 인공지능을 막기 위해 개발자가 코드 속으로 들어간다.',
    director: '강도현',
    cast: ['공유', '한지민', '최우식'],
    posterColor: '#1e3a4a',
    ratingAverage: 4.0,
    ratingCount: 1560,
    featured: false,
  },
  {
    id: 'grandmas-recipe',
    title: '할머니의 레시피',
    originalTitle: "Grandma's Recipe",
    year: 2022,
    genres: ['comedy', 'drama'],
    runtime: 98,
    synopsis: '도시로 떠났던 손녀가 시골 백반집을 물려받으며 벌어지는 따뜻한 소동.',
    director: '나정숙',
    cast: ['김혜자', '아이유'],
    posterColor: '#2e4a1e',
    ratingAverage: 4.4,
    ratingCount: 1730,
    featured: true,
  },
  {
    id: 'crimson-harbor',
    title: '진홍의 항구',
    originalTitle: 'Crimson Harbor',
    year: 2023,
    genres: ['thriller', 'drama'],
    runtime: 129,
    synopsis: '항구 도시에서 벌어진 연쇄 실종 사건, 그 중심에 선 형사의 기록.',
    director: '봉현우',
    cast: ['설경구', '전도연'],
    posterColor: '#3a1e2a',
    ratingAverage: 3.9,
    ratingCount: 820,
    featured: false,
  },
  {
    id: 'star-cat-voyage',
    title: '별고양이 항해기',
    originalTitle: 'Star Cat Voyage',
    year: 2025,
    genres: ['animation', 'sci-fi'],
    runtime: 92,
    synopsis: '우주를 떠도는 고양이 선장이 사라진 별자리를 되찾는 모험.',
    director: '문가영',
    cast: ['(목소리) 류준열', '(목소리) 김태리'],
    posterColor: '#2a1e4a',
    ratingAverage: 4.6,
    ratingCount: 3050,
    featured: true,
  },
  {
    id: 'the-quiet-house',
    title: '조용한 집',
    originalTitle: 'The Quiet House',
    year: 2024,
    genres: ['horror', 'thriller'],
    runtime: 108,
    synopsis: '소리를 내면 안 되는 집에 이사 온 가족에게 닥치는 밤의 공포.',
    director: '정범식',
    cast: ['이선균', '염정아'],
    posterColor: '#1e1e2e',
    ratingAverage: 3.8,
    ratingCount: 670,
    featured: false,
  },
  {
    id: 'summer-of-1999',
    title: '1999년의 여름',
    originalTitle: 'Summer of 1999',
    year: 2021,
    genres: ['romance', 'comedy'],
    runtime: 112,
    synopsis: '밀레니엄을 앞둔 작은 동네, 첫사랑과 카세트테이프의 계절.',
    director: '이충현',
    cast: ['김고은', '안효섭'],
    posterColor: '#4a2e3a',
    ratingAverage: 4.2,
    ratingCount: 1410,
    featured: false,
  },
  {
    id: 'iron-monsoon',
    title: '강철 몬순',
    originalTitle: 'Iron Monsoon',
    year: 2023,
    genres: ['action', 'sci-fi'],
    runtime: 135,
    synopsis: '기후 병기가 통제를 잃은 도시에서 특수부대가 마지막 작전을 펼친다.',
    director: '류승완',
    cast: ['하정우', '김태리', '박정민'],
    posterColor: '#2a3a4a',
    ratingAverage: 3.7,
    ratingCount: 990,
    featured: false,
  },
  {
    id: 'letters-to-no-one',
    title: '수신인 없는 편지',
    originalTitle: 'Letters to No One',
    year: 2022,
    genres: ['drama', 'romance'],
    runtime: 117,
    synopsis: '죽은 이에게 편지를 대신 써 주는 대필가의 조용한 일상과 균열.',
    director: '허진호',
    cast: ['손예진', '강동원'],
    posterColor: '#3a3a1e',
    ratingAverage: 4.1,
    ratingCount: 1180,
    featured: false,
  },
  {
    id: 'neon-dynasty',
    title: '네온 왕조',
    originalTitle: 'Neon Dynasty',
    year: 2025,
    genres: ['sci-fi', 'action'],
    runtime: 148,
    synopsis: '기억을 사고파는 미래 도시에서 잃어버린 하루를 찾는 추격전.',
    director: '연상호',
    cast: ['이제훈', '신민아', '조진웅'],
    posterColor: '#1e2a3a',
    ratingAverage: 4.0,
    ratingCount: 2240,
    featured: true,
  },
  {
    id: 'the-understudy',
    title: '대역 배우',
    originalTitle: 'The Understudy',
    year: 2024,
    genres: ['comedy', 'thriller'],
    runtime: 101,
    synopsis: '주연을 꿈꾸던 대역 배우가 진짜 사건의 주인공이 되어 버린다.',
    director: '장유정',
    cast: ['류승룡', '천우희'],
    posterColor: '#4a3a2e',
    ratingAverage: 3.9,
    ratingCount: 540,
    featured: false,
  },
  {
    id: 'deep-blue-lullaby',
    title: '심해의 자장가',
    originalTitle: 'Deep Blue Lullaby',
    year: 2023,
    genres: ['drama', 'sci-fi'],
    runtime: 124,
    synopsis: '심해 연구기지의 마지막 대원이 바다가 부르는 노래의 정체를 좇는다.',
    director: '김보라',
    cast: ['배두나', '박서준'],
    posterColor: '#1e3a3a',
    ratingAverage: 4.3,
    ratingCount: 1320,
    featured: false,
  },
  {
    id: 'laugh-track',
    title: '웃음 트랙',
    originalTitle: 'Laugh Track',
    year: 2021,
    genres: ['comedy'],
    runtime: 95,
    synopsis: '한물간 시트콤 작가들이 마지막 시즌을 살리려 벌이는 무모한 작전.',
    director: '이병헌',
    cast: ['정상훈', '라미란'],
    posterColor: '#4a4a1e',
    ratingAverage: 4.0,
    ratingCount: 760,
    featured: false,
  },
  {
    id: 'the-night-garden',
    title: '밤의 정원',
    originalTitle: 'The Night Garden',
    year: 2025,
    genres: ['horror', 'drama'],
    runtime: 110,
    synopsis: '폐원을 앞둔 식물원에서 자라나는, 사람을 기억하는 정원.',
    director: '엄태화',
    cast: ['김현주', '남궁민'],
    posterColor: '#1e2e1e',
    ratingAverage: 3.6,
    ratingCount: 410,
    featured: false,
  },
];

/**
 * 추가 카탈로그 — 무한 스크롤·검색을 시연할 만큼 양을 채우기 위한 생성 데이터.
 * 업무: 큐레이션된 영화 뒤에 붙는다. 무작위가 아니라 인덱스 기반이라 재현 가능하다(목 데이터).
 */
function buildGeneratedMovies(): Movie[] {
  const prefixes = [
    '붉은', '마지막', '조용한', '잃어버린', '끝없는', '새벽의', '검은', '은빛',
    '머나먼', '부서진', '영원한', '작은', '거대한', '숨겨진', '마른', '푸른',
  ];
  const nouns = [
    '도시', '약속', '정원', '기록', '항해', '파도', '겨울', '신호', '노래', '계절',
    '연대기', '복도', '정거장', '초상', '지도', '문', '불꽃', '폐허', '여행자', '경계',
  ];
  const genreKeys = SEED_GENRES.map((g) => g.key);
  const directors = ['김서연', '이도훈', '박가람', '정해린', '최유진', '윤재호', '강미소', '임건우', '오세아', '한별'];
  const cast = ['김민', '이준', '박서', '정우', '최아', '윤하', '강토', '임수', '오린', '한결', '서윤', '도경'];
  const palette = [
    '#1e2a4a', '#4a1e1e', '#4a3a1e', '#1e3a4a', '#2e4a1e', '#3a1e2a', '#2a1e4a', '#1e1e2e',
    '#4a2e3a', '#2a3a4a', '#3a3a1e', '#1e2a3a', '#4a3a2e', '#1e3a3a', '#4a4a1e', '#1e2e1e',
  ];

  const movies: Movie[] = [];
  for (let i = 0; i < 64; i++) {
    const title = `${prefixes[(i * 5) % prefixes.length]} ${nouns[(i * 3) % nouns.length]}`;
    const g1 = genreKeys[i % genreKeys.length];
    const g2 = genreKeys[(i + 3) % genreKeys.length];
    movies.push({
      id: `gen-${i}`,
      title,
      year: 2015 + (i % 11),
      genres: g1 === g2 ? [g1] : [g1, g2],
      runtime: 92 + (i % 58),
      synopsis: `${title} — ${nouns[(i * 7) % nouns.length]}을(를) 둘러싼 이야기. (데모용 생성 데이터)`,
      director: directors[i % directors.length],
      cast: [cast[i % cast.length], cast[(i + 5) % cast.length]],
      posterColor: palette[i % palette.length],
      // 3.0 ~ 5.0, 소수 한 자리.
      ratingAverage: Math.round(30 + ((i * 7) % 21)) / 10,
      ratingCount: 50 + ((i * 37) % 1950),
      featured: false,
    });
  }
  return movies;
}

/** 시드에 적재되는 전체 영화(큐레이션 + 생성). */
export const SEED_MOVIES: Movie[] = [...CURATED_MOVIES, ...buildGeneratedMovies()];
