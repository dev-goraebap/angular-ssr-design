import { PLATFORM_ID, WritableSignal, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * localStorage에 동기화되는 쓰기 가능 시그널.
 * 업무: 설정처럼 단순한 키-값을 영속화하는 추상화다. 도메인을 모른다(FSD: shared).
 * 값이 바뀔 때마다 직렬화해 저장하고, 초기값은 저장된 값이 있으면 그것을 쓴다.
 *
 * 주입 컨텍스트에서 호출해야 한다(`effect`·`inject` 사용) — 서비스 필드 초기화 등.
 *
 * SSR 가드(ADR-0001): 서버에는 localStorage가 없다. 서버에서는 초기값만 쓰고 저장을
 * 건너뛴다. 영속화는 브라우저에서만 일어난다.
 */
export function localStorageSignal<T>(key: string, initialValue: T): WritableSignal<T> {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const stored = isBrowser ? localStorage.getItem(key) : null;
  const state = signal<T>(stored !== null ? (JSON.parse(stored) as T) : initialValue);
  if (isBrowser) {
    effect(() => localStorage.setItem(key, JSON.stringify(state())));
  }
  return state;
}
