import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmInput } from '@spartan-ng/helm/input';
import { BreakpointService } from '@/shared/lib';
import { MovieRepository, type Movie } from '@/shared/api';
import { OpenMovieService } from '@/features/open-movie';

/**
 * 검색 입구 — 적응형(ADR-0002).
 * 업무: 데스크톱은 인라인 입력 + 결과 드롭다운으로 그 자리에서 탐색하고,
 * 모바일은 작은 화면을 가리지 않도록 버튼만 두고 풀스크린 검색 페이지로 보낸다.
 */
@Component({
  selector: 'search-box',
  imports: [HlmInput],
  host: { class: 'block' },
  template: `
    @if (bp.isMobile()) {
      <button
        type="button"
        class="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground"
        (click)="goToSearchPage()"
      >
        <span aria-hidden="true">🔍</span> 영화 검색
      </button>
    } @else {
      <div class="relative">
        <input
          hlmInput
          type="search"
          inputmode="search"
          placeholder="영화 검색"
          aria-label="영화 검색"
          class="w-full"
          [value]="query()"
          (input)="onInput($any($event.target).value)"
          (keydown.enter)="submit()"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        />
        @if (focused() && query().trim() && results().length) {
          <ul
            class="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
            role="listbox"
          >
            @for (m of results(); track m.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                  (mousedown)="select(m)"
                >
                  <span class="size-8 shrink-0 rounded" [style.background-color]="m.posterColor"></span>
                  <span class="min-w-0 flex-1 truncate text-sm text-popover-foreground">{{ m.title }}</span>
                  <span class="text-xs text-muted-foreground">{{ m.year }}</span>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    }
  `,
})
export class SearchBox {
  protected readonly bp = inject(BreakpointService);
  private readonly repo = inject(MovieRepository);
  private readonly opener = inject(OpenMovieService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly results = signal<Movie[]>([]);
  protected readonly focused = signal(false);

  protected async onInput(value: string): Promise<void> {
    this.query.set(value);
    this.results.set(value.trim() ? (await this.repo.search(value)).slice(0, 6) : []);
  }

  protected submit(): void {
    const q = this.query().trim();
    if (q) void this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected select(movie: Movie): void {
    this.focused.set(false);
    this.opener.open(movie.id);
  }

  protected goToSearchPage(): void {
    void this.router.navigate(['/search']);
  }

  protected onBlur(): void {
    // 결과의 mousedown이 blur보다 먼저 처리되도록 닫기를 살짝 늦춘다.
    setTimeout(() => this.focused.set(false), 150);
  }
}
