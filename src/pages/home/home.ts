import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GENRE_LABELS, MovieRepository, type Movie } from '@/shared/api';
import { BreakpointService } from '@/shared/lib';
import { MovieCard } from '@/entities/movie';
import { OpenMovieService } from '@/features/open-movie';
import { SearchBox } from '@/widgets/search-box/search-box';
import { CatalogStateService } from './catalog-state.service';

const PAGE_SIZE = 12;

/**
 * 홈 — 영화 카탈로그(추천 + 전체).
 * 업무: 전체 목록은 무한 스크롤로 점진 로드하고(접근성용 "더 보기"·aria-live 동반),
 * 상세에서 돌아오면 스크롤 위치를 복원하며, 모바일에서는 당겨서 새로고침을 지원한다(ADR-0007).
 * 상세를 모달/페이지 중 어떻게 열지는 OpenMovieService에 위임한다(ADR-0002).
 */
@Component({
  selector: 'page-home',
  imports: [MovieCard, SearchBox, RouterLink],
  host: {
    class: 'block',
    '(touchstart)': 'onTouchStart($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(touchend)': 'onTouchEnd()',
    '(touchcancel)': 'onTouchCancel()',
  },
  template: `
    <!-- 당겨서 새로고침 인디케이터(모바일) -->
    <div
      class="flex items-center justify-center overflow-hidden text-sm text-muted-foreground transition-[height] duration-150"
      [style.height.px]="indicatorHeight()"
      aria-hidden="true"
    >
      {{ refreshing() ? '새로고침 중…' : pull() > PULL_THRESHOLD ? '놓으면 새로고침' : '당겨서 새로고침' }}
    </div>

    <div class="flex flex-col gap-10 px-5 pb-6">
      <header class="flex flex-col gap-4 pt-6">
        <div>
          <h1 class="text-3xl font-bold text-foreground">영화 카탈로그</h1>
          <p class="mt-1 text-muted-foreground">
            데스크톱은 모달로, 모바일은 페이지로 — 같은 영화를 환경에 맞게 엽니다.
          </p>
        </div>
        <search-box class="lg:max-w-sm" />

        <nav class="flex flex-wrap gap-2" aria-label="장르 바로가기">
          @for (g of genres; track g[0]) {
            <a
              [routerLink]="['/genre', g[0]]"
              class="rounded-full border border-border px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent"
            >
              {{ g[1] }}
            </a>
          }
        </nav>
      </header>

      @if (movies.featured().length) {
        <section>
          <h2 class="mb-3 text-xl font-semibold text-foreground">추천</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            @for (m of movies.featured(); track m.id) {
              <movie-card [movie]="m" (open)="openMovie($event)" />
            }
          </div>
        </section>
      }

      <section>
        <h2 class="mb-3 text-xl font-semibold text-foreground">전체</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          @for (m of visibleMovies(); track m.id) {
            <movie-card [movie]="m" (open)="openMovie($event)" />
          }
        </div>

        @if (hasMore()) {
          <!-- 무한 스크롤 센티넬: 화면 근처에 들어오면 다음 묶음을 불러온다 -->
          <div #sentinel class="h-px"></div>
          <div class="mt-6 flex justify-center">
            <button
              type="button"
              class="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
              (click)="loadMore()"
            >
              더 보기
            </button>
          </div>
        }

        <!-- 스크린리더 알림 -->
        <p class="sr-only" role="status" aria-live="polite">{{ announce() }}</p>
      </section>
    </div>
  `,
})
export default class Home implements OnDestroy {
  protected readonly movies = inject(MovieRepository);
  private readonly opener = inject(OpenMovieService);
  private readonly bp = inject(BreakpointService);
  private readonly state = inject(CatalogStateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  protected readonly PULL_THRESHOLD = 60;
  protected readonly genres = Object.entries(GENRE_LABELS);

  protected readonly visibleCount = signal(this.state.visibleCount || PAGE_SIZE);
  protected readonly visibleMovies = computed(() => this.movies.all().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.visibleCount() < this.movies.all().length);
  protected readonly announce = signal('');

  protected readonly pull = signal(0);
  protected readonly refreshing = signal(false);
  protected readonly indicatorHeight = computed(() => (this.refreshing() ? 40 : this.pull()));

  private restored = false;
  private pullStartY: number | null = null;

  constructor() {
    // 데이터가 로드되면 저장해 둔 스크롤 위치를 한 번 복원한다(상세에서 복귀).
    effect(() => {
      if (this.restored) return;
      if (this.movies.all().length === 0) return;
      this.restored = true;
      const target = this.state.scrollTop;
      if (target > 0) {
        setTimeout(() => {
          const main = this.scroller();
          if (main) main.scrollTop = target;
        });
      }
    });

    // 센티넬이 (재)생성될 때마다 IntersectionObserver를 다시 연결한다.
    let io: IntersectionObserver | undefined;
    effect(() => {
      const el = this.sentinel()?.nativeElement;
      io?.disconnect();
      if (!el) return;
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) this.loadMore();
        },
        { root: this.scroller(), rootMargin: '300px' },
      );
      io.observe(el);
    });
    inject(DestroyRef).onDestroy(() => io?.disconnect());
  }

  ngOnDestroy(): void {
    const main = this.scroller();
    this.state.scrollTop = main?.scrollTop ?? 0;
    this.state.visibleCount = this.visibleCount();
  }

  protected openMovie(movie: Movie): void {
    this.opener.open(movie.id);
  }

  protected loadMore(): void {
    if (!this.hasMore()) return;
    this.visibleCount.update((n) => Math.min(n + PAGE_SIZE, this.movies.all().length));
    this.announce.set(`${this.visibleMovies().length}개 / ${this.movies.all().length}개 표시 중`);
  }

  // ── 당겨서 새로고침(모바일) ──────────────────────────────
  protected onTouchStart(e: TouchEvent): void {
    const main = this.scroller();
    // 멀티터치(핀치 줌 등)는 당겨서 새로고침으로 보지 않는다.
    if (this.bp.isMobile() && e.touches.length === 1 && main && main.scrollTop <= 0) {
      this.pullStartY = e.touches[0].clientY;
    } else {
      this.pullStartY = null;
    }
  }

  protected onTouchMove(e: TouchEvent): void {
    if (this.pullStartY === null || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - this.pullStartY;
    // 아래로 당길 때만, 저항감을 주며 최대 80px.
    this.pull.set(dy > 0 ? Math.min(dy * 0.5, 80) : 0);
  }

  protected onTouchEnd(): void {
    if (this.pullStartY !== null && this.pull() > this.PULL_THRESHOLD) this.refresh();
    this.pull.set(0);
    this.pullStartY = null;
  }

  /** 시스템 인터럽트로 터치가 취소되면 당김 상태를 초기화한다. */
  protected onTouchCancel(): void {
    this.pull.set(0);
    this.pullStartY = null;
  }

  private refresh(): void {
    this.refreshing.set(true);
    this.visibleCount.set(PAGE_SIZE);
    const main = this.scroller();
    if (main) main.scrollTop = 0;
    // 목 데이터라 실제 네트워크는 없다. 새로고침 느낌만 짧게 준다.
    setTimeout(() => this.refreshing.set(false), 600);
  }

  /** 실제 스크롤 컨테이너(app 셸의 main)를 찾는다. */
  private scroller(): HTMLElement | null {
    return this.host.nativeElement.closest('main');
  }
}
