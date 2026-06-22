import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** 로그인 세션 사용자. */
export interface SessionUser {
  id: string;
  name: string;
}

/**
 * 인증 (ADR-0004).
 * 업무: HttpOnly 쿠키 세션으로 로그인 상태를 관리한다. 쿠키는 JS가 읽을 수 없으므로
 * 현재 사용자는 `/api/me`로 확인한다. 개인화 화면(위시리스트·내 평점)은 CSR이라(ADR-0002)
 * 상태 확인은 브라우저에서 일어난다 — SSR 쿠키 포워딩은 필요하지 않다.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly session = signal<SessionUser | null>(null);
  readonly user = this.session.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userId = computed(() => this.session()?.id ?? null);

  /** /me 호출은 한 번만 수행하고 캐시한다(가드·초기화가 공유). */
  private loadPromise?: Promise<boolean>;

  constructor() {
    // 브라우저 시작 시 현재 세션을 확인해 둔다.
    if (isPlatformBrowser(this.platformId)) void this.ensureLoaded();
  }

  /** 현재 세션을 /api/me로 확인한다. 가드에서 await해 인증 여부를 판단한다. */
  ensureLoaded(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve(false);
    if (!this.loadPromise) {
      this.loadPromise = firstValueFrom(this.http.get<{ user: SessionUser }>('/api/me'))
        .then((r) => {
          this.session.set(r.user);
          return true;
        })
        .catch(() => {
          this.session.set(null);
          return false;
        });
    }
    return this.loadPromise;
  }

  /** 데모 계정 로그인. 성공하면 세션 쿠키가 발급되고 사용자 상태를 갱신한다. */
  async login(id: string, password: string): Promise<boolean> {
    try {
      const r = await firstValueFrom(
        this.http.post<{ user: SessionUser }>('/api/auth/login', { id, password }),
      );
      this.session.set(r.user);
      this.loadPromise = Promise.resolve(true);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } catch {
      // 네트워크 실패해도 로컬 상태는 비운다.
    }
    this.session.set(null);
    this.loadPromise = Promise.resolve(false);
  }
}
