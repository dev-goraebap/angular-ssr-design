import { Component, input, output } from '@angular/core';
import type { Movie } from '@/shared/api';

/**
 * 영화 카드 — 목록 그리드의 한 칸.
 * 업무: 포스터(목 데이터라 컬러 블록)와 제목·연도·평점을 보여 주고, 누르면 상세를 연다.
 * 상세를 모달로 띄울지 페이지로 띄울지는 카드가 모른다(open 이벤트만 낸다).
 */
@Component({
  selector: 'movie-card',
  host: { class: 'block' },
  template: `
    <button
      type="button"
      class="group block w-full text-left"
      (click)="open.emit(movie())"
      [attr.aria-label]="movie().title + ' 상세 보기'"
    >
      <div
        class="flex aspect-2/3 items-end overflow-hidden rounded-xl p-3 ring-1 ring-border transition group-hover:ring-ring group-active:scale-[0.98]"
        [style.background-color]="movie().posterColor"
      >
        <span class="line-clamp-3 text-lg font-bold text-white drop-shadow">{{ movie().title }}</span>
      </div>
      <p class="mt-2 truncate text-sm font-medium text-foreground">{{ movie().title }}</p>
      <p class="text-xs text-muted-foreground">{{ movie().year }} · ★ {{ movie().ratingAverage }}</p>
    </button>
  `,
})
export class MovieCard {
  readonly movie = input.required<Movie>();
  readonly open = output<Movie>();
}
