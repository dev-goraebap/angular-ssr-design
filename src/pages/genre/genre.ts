import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { GENRE_LABELS, MovieRepository, type Movie } from '@/shared/api';
import { NavExitService } from '@/shared/lib';
import { MovieCard } from '@/entities/movie';
import { OpenMovieService } from '@/features/open-movie';

/**
 * 장르별 목록(`/genre/:key`).
 * 업무: 한 장르의 영화를 그리드로 보여 준다. 상세의 장르 배지나 홈의 장르 칩에서 진입한다.
 */
@Component({
  selector: 'page-genre',
  imports: [HlmButton, MovieCard],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6 px-5 py-6">
      <header class="flex items-center gap-2">
        <button hlmBtn variant="ghost" size="sm" (click)="back()">← 뒤로</button>
        <h1 class="text-2xl font-bold text-foreground">{{ label() }}</h1>
      </header>

      @if (movies().length) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          @for (m of movies(); track m.id) {
            <movie-card [movie]="m" (open)="open($event)" />
          }
        </div>
      } @else {
        <p class="text-muted-foreground">이 장르의 영화가 없습니다.</p>
      }
    </div>
  `,
})
export default class Genre {
  // /genre/:key (withComponentInputBinding)
  readonly key = input.required<string>();

  private readonly repo = inject(MovieRepository);
  private readonly opener = inject(OpenMovieService);
  private readonly navExit = inject(NavExitService);

  protected readonly movies = signal<Movie[]>([]);
  protected readonly label = computed(() => GENRE_LABELS[this.key()] ?? this.key());

  constructor() {
    effect(() => {
      const key = this.key();
      void this.repo.byGenre(key).then((ms) => this.movies.set(ms));
    });
  }

  protected open(movie: Movie): void {
    this.opener.open(movie.id);
  }

  protected back(): void {
    this.navExit.backOrHome();
  }
}
