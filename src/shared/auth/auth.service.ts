import { Service, computed } from '@angular/core';
import { localStorageSignal } from '@/shared/lib';

/** 로그인 세션 사용자. */
export interface SessionUser {
  id: string;
  name: string;
}

// 데모 계정(시연 단순화). 실제 인증은 범위 밖(ADR-0006).
const DEMO = { id: 'demo', password: 'demo1234', name: '데모 사용자' } as const;

/**
 * 인증(ADR-0006).
 * 업무: CSR 전용 데모 로그인이다. 세션을 localStorage에 영속화하고 시그널로 노출한다.
 * 보안 목적이 아니라 회원/비회원 흐름을 시연하기 위한 것이다.
 */
@Service()
export class AuthService {
  private readonly session = localStorageSignal<SessionUser | null>('session', null);

  readonly user = computed(() => this.session());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userId = computed(() => this.session()?.id ?? null);

  /** 데모 계정 검증. 성공하면 세션을 발급한다. */
  login(id: string, password: string): boolean {
    if (id === DEMO.id && password === DEMO.password) {
      this.session.set({ id: DEMO.id, name: DEMO.name });
      return true;
    }
    return false;
  }

  logout(): void {
    this.session.set(null);
  }
}
