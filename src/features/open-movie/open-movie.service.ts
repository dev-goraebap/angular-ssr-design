import { Service, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { BreakpointService } from '@/shared/lib';
import { MovieDetail } from '@/entities/movie';

/**
 * 영화 상세 열기 — 환경에 맞는 표현으로 분기한다(ADR-0002·0003).
 * 업무: 모바일은 풀스크린 페이지로 이동하고, 데스크톱은 목록을 둔 채 라우트 기반 모달로 띄운다.
 * 어느 쪽이든 URL은 `/movies/:id`로 동일해 공유·새로고침·뒤로가기가 일관된다.
 */
@Service()
export class OpenMovieService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(HlmDialogService);
  private readonly bp = inject(BreakpointService);

  open(id: string): void {
    if (this.bp.isMobile()) {
      void this.router.navigate(['/movies', id]);
      return;
    }

    // 데스크톱: 목록을 두고 라우트 기반 모달로. URL을 바꿔 공유·새로고침을 살린다(canonical은 동일 라우트).
    const path = `/movies/${id}`;
    this.location.go(path);

    const ref = this.dialog.open(MovieDetail, {
      context: { movieId: id },
      contentClass: 'w-full sm:max-w-2xl',
    });

    // 닫는 경로는 세 가지다. URL 복원(location.back)은 "사용자가 직접 닫은 경우"에만 해야 한다.
    //  (a) 뒤로가기(popstate): URL이 이미 이전으로 갔으므로 복원하지 않는다.
    //  (b) 앱 내 라우터 이동(장르·로그인 등): 이동이 URL을 바꾸므로 복원하지 않는다(이중 back 방지).
    //  (c) X·스크림·Esc: 우리가 넣은 히스토리 항목을 location.back으로 되돌린다(desync 방지).
    let restoreUrl = true;
    const popSub = this.location.subscribe(() => {
      restoreUrl = false; // (a)
      ref.close();
    });
    const navSub = this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        take(1),
      )
      .subscribe(() => {
        restoreUrl = false; // (b)
        ref.close();
      });

    ref.closed$.subscribe(() => {
      popSub.unsubscribe();
      navSub.unsubscribe();
      if (restoreUrl && this.location.path() === path) this.location.back(); // (c)
    });
  }
}
