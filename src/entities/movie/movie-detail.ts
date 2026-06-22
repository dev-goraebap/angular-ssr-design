import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { AuthService } from '@/shared/auth';
import {
  GENRE_LABELS,
  MovieRepository,
  RatingRepository,
  WishlistRepository,
  type Movie,
} from '@/shared/api';
import { AdaptiveSheetService } from '@/shared/ui/adaptive-sheet';
import { RateMovieSheet } from './rate-movie-sheet';

/**
 * 영화 상세 콘텐츠 — 표현(모달/페이지)을 모른다.
 * 업무: 한 영화의 정보와 회원 액션(위시리스트·평점·공유)을 보여 준다. movieId는 입력(페이지)이나
 * 다이얼로그 컨텍스트(모달)에서 받는다. 같은 콘텐츠를 데스크톱 모달과 모바일 페이지가 함께 쓴다(ADR-0002).
 */
@Component({
  selector: 'movie-detail',
  imports: [HlmButton, HlmBadge],
  host: { class: 'block' },
  template: `
    @if (movie(); as m) {
      <article class="flex flex-col gap-5">
        <div class="flex gap-5">
          <div
            class="aspect-2/3 w-28 shrink-0 rounded-xl ring-1 ring-border sm:w-36"
            [style.background-color]="m.posterColor"
          ></div>
          <div class="flex min-w-0 flex-col gap-2">
            <div>
              <h2 class="text-2xl font-bold text-foreground">{{ m.title }}</h2>
              @if (m.originalTitle) {
                <p class="text-sm text-muted-foreground">{{ m.originalTitle }}</p>
              }
            </div>
            <p class="text-sm text-muted-foreground">{{ m.year }} · {{ m.runtime }}분</p>
            <p class="text-sm">
              <span class="font-semibold text-foreground">★ {{ m.ratingAverage }}</span>
              <span class="text-muted-foreground">({{ m.ratingCount }}명)</span>
            </p>
            <div class="flex flex-wrap gap-1.5">
              @for (g of m.genres; track g) {
                <button hlmBadge variant="secondary" (click)="goGenre(g)">{{ genreLabel(g) }}</button>
              }
            </div>
          </div>
        </div>

        <p class="text-sm leading-relaxed text-foreground">{{ m.synopsis }}</p>

        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-muted-foreground">감독</dt>
          <dd class="text-foreground">{{ m.director }}</dd>
          <dt class="text-muted-foreground">출연</dt>
          <dd class="text-foreground">{{ m.cast.join(', ') }}</dd>
        </dl>

        <!-- 회원 액션 -->
        <div class="flex flex-col gap-3 border-t border-border pt-4">
          @if (auth.isAuthenticated()) {
            <div class="flex flex-wrap items-center gap-2">
              <button
                hlmBtn
                [variant]="inWishlist() ? 'secondary' : 'default'"
                (click)="toggleWishlist(m)"
              >
                {{ inWishlist() ? '♥ 위시리스트에 있음' : '♡ 위시리스트에 담기' }}
              </button>
              <button hlmBtn variant="outline" (click)="openRating(m)">
                {{ myRating() > 0 ? '내 평점 ★ ' + myRating() + ' · 수정' : '평점 남기기' }}
              </button>
              <button hlmBtn variant="outline" (click)="share(m)">공유</button>
            </div>
          } @else {
            <div class="flex flex-wrap items-center gap-2">
              <button hlmBtn variant="outline" (click)="share(m)">공유</button>
            </div>
            <p class="text-sm text-muted-foreground">
              <button type="button" class="text-primary underline" (click)="goLogin(m)">로그인</button>
              하면 찜하고 평점을 남길 수 있습니다.
            </p>
          }

          @if (shareMessage()) {
            <span class="text-sm text-muted-foreground" role="status" aria-live="polite">
              {{ shareMessage() }}
            </span>
          }
        </div>
      </article>
    } @else if (!loading()) {
      <p class="py-10 text-center text-muted-foreground">영화를 찾을 수 없습니다.</p>
    }
  `,
})
export class MovieDetail {
  private readonly repo = inject(MovieRepository);
  private readonly wishlist = inject(WishlistRepository);
  private readonly rating = inject(RatingRepository);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sheet = inject(AdaptiveSheetService);
  // 모달로 열렸을 때만 컨텍스트가 있다(페이지로 열리면 null).
  private readonly ctx = injectBrnDialogContext<{ movieId?: string }>({ optional: true });

  readonly movieId = input<string>();
  private readonly resolvedId = computed(() => this.movieId() ?? this.ctx?.movieId ?? '');

  readonly movie = signal<Movie | undefined>(undefined);
  readonly loading = signal(true);
  readonly inWishlist = signal(false);
  readonly myRating = signal(0);
  readonly shareMessage = signal('');

  constructor() {
    effect(() => {
      const id = this.resolvedId();
      if (!id) return;
      this.loading.set(true);
      void this.repo.get(id).then((m) => {
        this.movie.set(m);
        this.loading.set(false);
      });

      // 회원이면 이 영화의 위시리스트/평점 상태를 함께 불러온다(로그인/로그아웃에 반응).
      const uid = this.auth.userId();
      if (uid) {
        void this.wishlist.has(uid, id).then((v) => this.inWishlist.set(v));
        void this.rating.get(uid, id).then((r) => this.myRating.set(r?.score ?? 0));
      } else {
        this.inWishlist.set(false);
        this.myRating.set(0);
      }
    });
  }

  protected genreLabel(key: string): string {
    return GENRE_LABELS[key] ?? key;
  }

  /** 장르 배지 → 장르별 목록으로. 모달이면 라우터 이동이 모달을 닫는다(OpenMovieService). */
  protected goGenre(key: string): void {
    void this.router.navigate(['/genre', key]);
  }

  protected async toggleWishlist(m: Movie): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) return;
    if (this.inWishlist()) {
      await this.wishlist.remove(uid, m.id);
      this.inWishlist.set(false);
    } else {
      await this.wishlist.add(uid, m.id, new Date().toISOString());
      this.inWishlist.set(true);
    }
  }

  /** 평점 입력을 적응형 시트로 연다(모바일 바텀시트 / 데스크톱 모달). 결과로 내 점수를 갱신한다. */
  protected openRating(m: Movie): void {
    const ref = this.sheet.open<number>(RateMovieSheet, {
      movieId: m.id,
      title: m.title,
      score: this.myRating(),
    });
    ref.closed.subscribe((result) => {
      if (typeof result === 'number') this.myRating.set(result);
    });
  }

  /** 비로그인 상태에서 회원 기능 유도 → 로그인 후 이 영화로 복귀.
   *  모달이면 라우터 이동이 OpenMovieService에서 모달을 닫는다(여기서 직접 닫지 않음 → 이중 back 방지). */
  protected goLogin(m: Movie): void {
    void this.router.navigate(['/login'], { queryParams: { returnUrl: `/movies/${m.id}` } });
  }

  /** 공유(ADR-0008): 네이티브 공유 시트 → 링크 복사 순으로 폴백한다. */
  protected async share(m: Movie): Promise<void> {
    const url = `${location.origin}/movies/${m.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: m.title, text: m.synopsis, url });
      } catch {
        // 사용자가 공유를 취소한 경우 — 무시한다.
      }
      return;
    }
    const copied = await this.copyToClipboard(url);
    this.flash(copied ? '링크가 복사되었습니다' : '이 환경에서는 공유를 지원하지 않습니다');
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 권한 거부 등 — 레거시로 폴백한다.
      }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  private flash(message: string): void {
    this.shareMessage.set(message);
    setTimeout(() => this.shareMessage.set(''), 2500);
  }
}
