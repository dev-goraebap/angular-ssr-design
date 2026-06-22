import { DOCUMENT, Service, effect, inject } from '@angular/core';
import { localStorageSignal } from './local-storage-signal';

export type Theme = 'dark' | 'light';

/**
 * 테마 전환.
 * 업무: 다크(기본)와 라이트를 오간다. 선택은 localStorage에 남고, `<html>`의 `.dark` 클래스로
 * 반영돼 spartan 테마 변수(:root / :root.dark)가 따라 바뀐다. UI 인프라일 뿐 업무 규칙은 없다.
 */
@Service()
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly theme = localStorageSignal<Theme>('theme', 'dark');

  constructor() {
    // 기술: spartan은 :root.dark로 다크를 정의하므로 문서 루트에 .dark 클래스를 토글한다.
    effect(() => {
      this.doc.documentElement.classList.toggle('dark', this.theme() === 'dark');
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
