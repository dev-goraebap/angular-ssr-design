import { Component, inject, input } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { MovieDetail } from '@/entities/movie';
import { NavExitService } from '@/shared/lib';

/**
 * 영화 상세 페이지 — `/movies/:id`의 canonical 풀스크린 표현.
 * 업무: 모바일에서의 기본 진입, 그리고 직접 링크·새로고침 시의 표현이다(ADR-0002).
 * 데스크톱에서 목록을 통해 들어오면 같은 콘텐츠를 모달로 띄운다(OpenMovieService).
 */
@Component({
  selector: 'page-movie-detail',
  imports: [MovieDetail, HlmButton],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col">
      <header
        class="sticky top-0 z-10 flex items-center border-b border-border bg-background/80 px-4 py-3 backdrop-blur"
      >
        <button hlmBtn variant="ghost" size="sm" (click)="back()">← 뒤로</button>
      </header>
      <div class="p-5">
        <movie-detail [movieId]="id()" />
      </div>
    </div>
  `,
})
export default class MovieDetailPage {
  // 라우트 파라미터 :id를 입력으로 받는다(withComponentInputBinding).
  readonly id = input.required<string>();
  private readonly navExit = inject(NavExitService);

  protected back(): void {
    this.navExit.backOrHome();
  }
}
