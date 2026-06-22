import { Service } from '@angular/core';

/**
 * 카탈로그(홈) 화면 상태 보관소.
 * 업무: 모바일에서 상세로 이동했다 돌아올 때 스크롤 위치와 펼친 개수를 복원하기 위한 것이다.
 * 홈 컴포넌트는 떠날 때 저장하고 돌아올 때 복원한다. root 서비스라 홈이 파괴돼도 살아남는다.
 */
@Service()
export class CatalogStateService {
  scrollTop = 0;
  visibleCount = 0;
}
