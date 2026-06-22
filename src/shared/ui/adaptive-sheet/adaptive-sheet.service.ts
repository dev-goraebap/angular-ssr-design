import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { InjectionToken, Injector, Service, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject, filter, take } from 'rxjs';
import { BreakpointService } from '@/shared/lib';

/** 시트에 주입되는 데이터(여는 쪽이 넘긴 값). */
export const ADAPTIVE_SHEET_DATA = new InjectionToken<unknown>('ADAPTIVE_SHEET_DATA');

/** 열린 적응형 시트의 핸들. 닫기와 닫힘 결과를 제공한다. */
export class AdaptiveSheetRef<R = unknown> {
  private readonly _closed = new Subject<R | undefined>();
  readonly closed = this._closed.asObservable();
  private cleanup?: () => void;
  private done = false;

  /** 열릴 때 결정된 표현 모드. 콘텐츠가 시트/모달 스타일을 같은 기준으로 고르게 한다. */
  constructor(
    private readonly overlayRef: OverlayRef,
    readonly isMobile: boolean,
  ) {}

  /** @internal 서비스가 정리 콜백을 등록한다. */
  _setCleanup(fn: () => void): void {
    this.cleanup = fn;
  }

  close(result?: R): void {
    if (this.done) return;
    this.done = true;
    this.cleanup?.();
    this.overlayRef.dispose();
    this._closed.next(result);
    this._closed.complete();
  }
}

interface CloseWatcherLike {
  onclose: (() => void) | null;
  destroy(): void;
}

/**
 * 적응형 시트(ADR-0002·0003).
 * 업무: 같은 콘텐츠를 모바일에선 하단 바텀시트로, 데스크톱에선 가운데 모달로 띄운다.
 * 분기 기준은 화면 폭(BreakpointService)이고, 콘텐츠 컴포넌트는 자신이 시트인지 모달인지 모른다.
 * 닫기는 백드롭·Esc·버튼과 함께 뒤로가기를 지원한다 — CloseWatcher 우선(중첩에 안전),
 * 없으면 라우터 이동 시 닫기로 폴백한다(오버레이가 다음 화면 위에 남지 않게).
 */
@Service()
export class AdaptiveSheetService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly bp = inject(BreakpointService);
  private readonly router = inject(Router);

  open<R = unknown>(component: ComponentType<unknown>, data?: unknown): AdaptiveSheetRef<R> {
    const isMobile = this.bp.isMobile();
    // 기술: 모바일 바텀시트는 콘텐츠가 position:fixed로 뷰포트에 직접 고정되므로(아래 컴포넌트 참고)
    // 오버레이 pane 크기에 기대지 않는다. CDK global-overlay-wrapper가 내용만큼 줄어드는(shrink-to-fit)
    // 특성 때문에 pane을 %로 키워도 좁아지기 때문이다. 데스크톱은 오버레이 중앙 배치 + 콘텐츠 폭.
    const positionStrategy = isMobile
      ? this.overlay.position().global().bottom('0').left('0')
      : this.overlay.position().global().centerHorizontally().centerVertically();

    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy,
      maxHeight: '90vh',
      panelClass: 'outline-none',
    });

    const ref = new AdaptiveSheetRef<R>(overlayRef, isMobile);

    // 뒤로가기 닫기: CloseWatcher 우선, 없으면 라우터 이동 시 닫기로 폴백.
    const watcherCtor = (globalThis as { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher;
    const watcher = watcherCtor ? new watcherCtor() : undefined;
    if (watcher) watcher.onclose = () => ref.close();

    const navSub = this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        take(1),
      )
      .subscribe(() => ref.close());

    ref._setCleanup(() => {
      watcher?.destroy();
      navSub.unsubscribe();
    });

    const sheetInjector = Injector.create({
      providers: [
        { provide: AdaptiveSheetRef, useValue: ref },
        { provide: ADAPTIVE_SHEET_DATA, useValue: data ?? null },
      ],
      parent: this.injector,
    });

    overlayRef.attach(new ComponentPortal(component, null, sheetInjector));
    overlayRef.backdropClick().subscribe(() => ref.close());
    overlayRef.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') ref.close();
    });

    return ref;
  }
}
