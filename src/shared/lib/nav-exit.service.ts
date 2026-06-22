import { Service, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * 풀스크린 페이지/오버레이의 "닫기·뒤로".
 * 업무: 앱 안에서 한 번이라도 이동해 들어왔으면 이전 화면으로 돌아가고(스크롤·상태 보존),
 * 외부에서 직접 링크로 진입해 돌아갈 앱 화면이 없으면 홈으로 보낸다. 풀스크린 검색·상세를
 * 빠져나갈 때 갇히거나(뒤로 없음) 앱 밖으로 튕기지(외부 사이트) 않게 한다.
 */
@Service()
export class NavExitService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  // 앱 내 성공한 네비게이션 수. 최초 라우트 해석이 1. 사용자가 앱에서 이동하면 2 이상.
  private appNavigations = 0;

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.appNavigations++);
  }

  backOrHome(): void {
    // 기술: history.length는 외부 사이트 기록까지 포함해 오판한다. 앱 내 네비 횟수로 판단한다.
    if (this.appNavigations > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/']);
    }
  }
}
