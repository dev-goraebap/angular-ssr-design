import { Service, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

/**
 * 화면 크기를 시그널로 노출합니다.
 * 업무: 모바일/데스크톱 적응형 분기의 단일 기준점입니다. tablet(768px)을 경계로 삼습니다.
 */
@Service()
export class BreakpointService {
  private readonly observer = inject(BreakpointObserver);

  /** tablet(768px) 미만이면 모바일로 본다. */
  readonly isMobile = toSignal(
    this.observer.observe('(max-width: 767.98px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );
}
