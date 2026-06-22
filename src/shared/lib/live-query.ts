import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';

/**
 * Dexie `liveQuery`를 시그널로 잇는다.
 * 업무: DB가 바뀌면 쿼리가 자동으로 다시 돌고, 그 결과가 시그널로 흘러 UI가 따라간다.
 *
 * 주입 컨텍스트에서 호출해야 한다(`toSignal`이 `DestroyRef`를 쓴다) — 서비스 필드 초기화 등.
 */
export function liveQuerySignal<T>(
  querier: () => T | Promise<T>,
  initialValue: T,
): Signal<T> {
  return toSignal(from(liveQuery(querier)), { initialValue });
}
