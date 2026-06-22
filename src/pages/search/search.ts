import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Location } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';
import { type Movie } from '@/shared/api';
import { NavExitService } from '@/shared/lib';
import { MovieCard } from '@/entities/movie';
import { OpenMovieService } from '@/features/open-movie';

/**
 * 검색 페이지 — `/search?q=`의 canonical 표현(ADR-0002).
 * 업무: 모바일에서 풀스크린 검색의 본진이자, 직접 링크·새로고침 시의 결과 화면이다.
 * 입력은 URL의 q와 동기화돼 공유·복원이 가능하다.
 */
@Component({
  selector: 'page-search',
  imports: [HlmInput, HlmButton, MovieCard],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-6 px-5 py-6">
      <header class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">검색</h1>
          <button hlmBtn variant="ghost" size="icon" (click)="close()" aria-label="검색 닫기">
            ✕
          </button>
        </div>
        <input
          hlmInput
          type="search"
          inputmode="search"
          autofocus
          placeholder="제목으로 검색"
          aria-label="영화 검색"
          [value]="query()"
          (input)="onInput($any($event.target).value)"
        />
      </header>

      @if (query().trim()) {
        @if (results().length) {
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            @for (m of results(); track m.id) {
              <movie-card [movie]="m" (open)="open($event)" />
            }
          </div>
        } @else {
          <p class="text-muted-foreground">"{{ query() }}"에 대한 결과가 없습니다.</p>
        }
      } @else {
        <p class="text-muted-foreground">제목을 입력하면 결과가 나타납니다.</p>
      }
    </div>
  `,
})
export default class Search {
  // /search?q= (withComponentInputBinding). 공유·새로고침 시 결과를 복원한다.
  readonly q = input<string>();

  private readonly location = inject(Location);
  private readonly opener = inject(OpenMovieService);
  private readonly navExit = inject(NavExitService);

  protected readonly query = signal('');

  // query() 시그널에 반응해 검색 결과를 가져온다. 빈 검색어면 요청하지 않는다(ADR-0005).
  private readonly resultsRes = httpResource<Movie[]>(() => {
    const q = this.query().trim();
    return q ? `/api/search?q=${encodeURIComponent(q)}` : undefined;
  });
  protected readonly results = computed(() => this.resultsRes.value() ?? []);

  constructor() {
    // 라우트 q가 바뀔 때만(직접 진입·공유 링크) 입력을 동기화한다.
    // untracked로 query() 변경에는 반응하지 않게 해 타이핑이 되돌려지는 것을 막는다.
    effect(() => {
      const q = this.q() ?? '';
      untracked(() => {
        if (q !== this.query()) this.query.set(q);
      });
    });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    // 타이핑마다 URL의 q를 교체(replaceState)해 히스토리를 더럽히지 않으면서 공유 가능하게 둔다.
    // 결과는 query() 시그널에 반응하는 httpResource가 알아서 갱신한다.
    this.location.replaceState(value.trim() ? `/search?q=${encodeURIComponent(value)}` : '/search');
  }

  protected open(movie: Movie): void {
    this.opener.open(movie.id);
  }

  /** 검색 닫기 → 이전 화면(보통 홈)으로. 직접 진입했으면 홈으로. */
  protected close(): void {
    this.navExit.backOrHome();
  }
}
