import { Component, inject } from '@angular/core';
import { WishlistRepository, type Movie } from '@/shared/api';
import { AuthService } from '@/shared/auth';
import { MovieCard } from '@/entities/movie';
import { OpenMovieService } from '@/features/open-movie';

/**
 * 내 위시리스트(회원 전용, ADR-0006 가드).
 * 업무: 회원이 담은 영화를 그리드로 보여 준다. 담기/빼기는 자동 반영된다(liveQuery).
 */
@Component({
  selector: 'page-wishlist',
  imports: [MovieCard],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6 px-5 py-6">
      <h1 class="text-3xl font-bold text-foreground">내 위시리스트</h1>

      @if (items().length) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          @for (m of items(); track m.id) {
            <movie-card [movie]="m" (open)="open($event)" />
          }
        </div>
      } @else {
        <p class="text-muted-foreground">아직 담은 영화가 없습니다. 마음에 드는 영화를 위시리스트에 담아 보세요.</p>
      }
    </div>
  `,
})
export default class Wishlist {
  private readonly auth = inject(AuthService);
  private readonly wishlist = inject(WishlistRepository);
  private readonly opener = inject(OpenMovieService);

  // 가드로 보호되므로 userId는 존재한다.
  protected readonly items = this.wishlist.liveMovies(this.auth.userId() ?? '');

  protected open(movie: Movie): void {
    this.opener.open(movie.id);
  }
}
