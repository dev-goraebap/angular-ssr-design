import { Component, inject, signal } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '@/shared/auth';
import { RatingRepository } from '@/shared/api';
import { ADAPTIVE_SHEET_DATA, AdaptiveSheetRef } from '@/shared/ui/adaptive-sheet';

/** 시트를 여는 쪽이 넘기는 데이터. */
export interface RateMovieData {
  movieId: string;
  title: string;
  score: number;
}

/** 끌어서 닫기 임계값(px). */
const DISMISS_THRESHOLD = 100;

/**
 * 평점 입력 — 적응형 시트의 콘텐츠(ADR-0002).
 * 업무: 별점을 고르고 저장/지우기 한다. 시트/모달 분기는 AdaptiveSheetRef.isMobile 한 기준으로만
 * 결정해, 오버레이 위치와 컴포넌트 폭이 어긋나지 않게 한다. 모바일에선 핸들을 끌어 내려 닫는다.
 * 결과(점수, 지우면 0)를 닫힘으로 반환한다.
 */
@Component({
  selector: 'rate-movie-sheet',
  imports: [HlmButton, CdkTrapFocus],
  host: { class: 'block' },
  template: `
    <div
      cdkTrapFocus
      cdkTrapFocusAutoCapture
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="data.title + ' 평점'"
      [class]="containerClass"
      [class.transition-transform]="!dragging()"
      [style.transform]="dragY() ? 'translateY(' + dragY() + 'px)' : null"
      style="padding-bottom: max(1.25rem, env(safe-area-inset-bottom))"
    >
      @if (isMobile) {
        <!-- 끌어서 닫기: 핸들 영역에서만 드래그를 시작한다(별점 탭과 충돌하지 않게) -->
        <div
          class="-mt-1 mb-3 cursor-grab touch-none py-2"
          (touchstart)="onDragStart($event)"
          (touchmove)="onDragMove($event)"
          (touchend)="onDragEnd()"
          (touchcancel)="onDragCancel()"
        >
          <div class="mx-auto h-1 w-10 rounded-full bg-muted" aria-hidden="true"></div>
        </div>
      }

      <h2 class="text-lg font-semibold">평점 남기기</h2>
      <p class="mt-0.5 truncate text-sm text-muted-foreground">{{ data.title }}</p>

      <div class="mt-4 flex justify-center gap-1" role="group" aria-label="별점 선택">
        @for (n of stars; track n) {
          <button
            type="button"
            class="px-1 text-4xl leading-none"
            (click)="score.set(n)"
            [attr.aria-label]="n + '점'"
            [attr.aria-pressed]="score() >= n"
          >
            <span [class]="score() >= n ? 'text-yellow-500' : 'text-muted-foreground/40'">★</span>
          </button>
        }
      </div>

      <div class="mt-6 flex items-center justify-between gap-2">
        @if (data.score > 0) {
          <button hlmBtn variant="ghost" (click)="remove()">지우기</button>
        } @else {
          <span></span>
        }
        <div class="flex gap-2">
          <button hlmBtn variant="outline" (click)="ref.close()">취소</button>
          <button hlmBtn [disabled]="score() === 0" (click)="save()">저장</button>
        </div>
      </div>
    </div>
  `,
})
export class RateMovieSheet {
  protected readonly data = inject<RateMovieData>(ADAPTIVE_SHEET_DATA);
  protected readonly ref = inject<AdaptiveSheetRef<number>>(AdaptiveSheetRef);
  private readonly auth = inject(AuthService);
  private readonly rating = inject(RatingRepository);

  protected readonly isMobile = this.ref.isMobile;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly score = signal(this.data.score);

  // 끌어서 닫기 상태.
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private dragStartY: number | null = null;

  protected get containerClass(): string {
    const base = 'bg-popover p-5 text-popover-foreground shadow-lg outline-none animate-in fade-in-0';
    // 모바일: 뷰포트에 직접 고정(fixed inset-x-0 bottom-0)해 오버레이 박스와 무관하게 전폭 보장.
    return this.isMobile
      ? `${base} fixed inset-x-0 bottom-0 rounded-t-2xl slide-in-from-bottom-4`
      : `${base} w-[420px] max-w-[90vw] rounded-2xl zoom-in-95`;
  }

  protected onDragStart(e: TouchEvent): void {
    // 멀티터치는 무시한다(손가락이 바뀌면 clientY가 튀어 오작동).
    if (e.touches.length !== 1) {
      this.onDragCancel();
      return;
    }
    this.dragStartY = e.touches[0].clientY;
    this.dragging.set(true);
  }

  protected onDragMove(e: TouchEvent): void {
    if (this.dragStartY === null || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - this.dragStartY;
    this.dragY.set(dy > 0 ? dy : 0);
  }

  protected onDragEnd(): void {
    this.dragging.set(false);
    if (this.dragY() > DISMISS_THRESHOLD) {
      this.ref.close();
    } else {
      this.dragY.set(0); // 임계값 미만이면 제자리로(transition-transform로 부드럽게)
    }
    this.dragStartY = null;
  }

  /** 시스템 인터럽트(전화 등) 등으로 제스처가 취소되면 상태를 초기화한다. */
  protected onDragCancel(): void {
    this.dragging.set(false);
    this.dragY.set(0);
    this.dragStartY = null;
  }

  protected async save(): Promise<void> {
    const uid = this.auth.userId();
    if (!uid || this.score() === 0) return;
    await this.rating.set(uid, this.data.movieId, this.score(), new Date().toISOString());
    this.ref.close(this.score());
  }

  protected async remove(): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) return;
    await this.rating.remove(uid, this.data.movieId);
    this.ref.close(0);
  }
}
