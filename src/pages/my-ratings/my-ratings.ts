import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { type Movie, type RatedMovie } from '@/shared/api';
import { MovieCard } from '@/entities/movie';
import { OpenMovieService } from '@/features/open-movie';

/**
 * 내 평점(회원 전용, ADR-0006 가드).
 * 업무: 내가 별점을 남긴 영화와 점수를 보여 준다. 사용자는 쿠키로 식별된다(ADR-0004).
 */
@Component({
  selector: 'page-my-ratings',
  imports: [MovieCard],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6 px-5 py-6">
      <h1 class="text-3xl font-bold text-foreground">내 평점</h1>

      @if (items().length) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          @for (r of items(); track r.movie.id) {
            <div>
              <movie-card [movie]="r.movie" (open)="open($event)" />
              <p class="mt-1 text-xs font-medium text-yellow-600">내 평점 ★ {{ r.score }}</p>
            </div>
          }
        </div>
      } @else {
        <p class="text-muted-foreground">아직 남긴 평점이 없습니다. 영화 상세에서 별점을 남겨 보세요.</p>
      }
    </div>
  `,
})
export default class MyRatings {
  private readonly opener = inject(OpenMovieService);

  private readonly itemsRes = httpResource<RatedMovie[]>(() => '/api/ratings');
  protected readonly items = computed(() => this.itemsRes.value() ?? []);

  protected open(movie: Movie): void {
    this.opener.open(movie.id);
  }
}
