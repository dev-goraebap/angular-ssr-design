import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@/shared/auth';

interface NavItem {
  path: string;
  label: string;
  exact: boolean;
  icon: 'home' | 'heart' | 'star' | 'gear';
}

/**
 * 앱 내비게이션 — 적응형(ADR-0004).
 * 업무: 같은 항목을 모바일에선 하단 탭바, 데스크톱(lg+)에선 좌측 사이드 레일로 보여 준다.
 * 회원이면 위시리스트·내 평점이 추가되고, 끝에 로그인/로그아웃이 붙는다. 활성 탭은 primary.
 */
@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'block' },
  template: `
    <nav
      class="flex justify-around border-t border-border bg-background
             lg:h-full lg:w-20 lg:flex-col lg:justify-start lg:gap-2 lg:border-t-0 lg:border-e lg:py-5"
      style="padding-bottom: env(safe-area-inset-bottom)"
      aria-label="주요 메뉴"
    >
      @for (item of items(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="text-primary"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          [class]="cellClass"
        >
          <span aria-hidden="true">
            @switch (item.icon) {
              @case ('home') {
                <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 11l9-8 9 8" />
                  <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
                </svg>
              }
              @case ('heart') {
                <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7A5 5 0 1 0 3.2 12.7l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z" />
                </svg>
              }
              @case ('star') {
                <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
                </svg>
              }
              @case ('gear') {
                <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              }
            }
          </span>
          <span class="text-xs whitespace-nowrap">{{ item.label }}</span>
        </a>
      }

      <!-- 로그인/로그아웃 -->
      @if (auth.isAuthenticated()) {
        <button type="button" [class]="cellClass" (click)="auth.logout()">
          <span aria-hidden="true">
            <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            </svg>
          </span>
          <span class="text-xs whitespace-nowrap">로그아웃</span>
        </button>
      } @else {
        <a routerLink="/login" routerLinkActive="text-primary" [class]="cellClass">
          <span aria-hidden="true">
            <svg [attr.width]="24" [attr.height]="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span class="text-xs whitespace-nowrap">로그인</span>
        </a>
      }
    </nav>
  `,
})
export class AppNav {
  protected readonly auth = inject(AuthService);

  protected readonly cellClass =
    'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-3 py-3 text-muted-foreground transition-colors lg:flex-none';

  protected readonly items = computed<NavItem[]>(() => {
    const base: NavItem[] = [{ path: '/', label: '홈', exact: true, icon: 'home' }];
    if (this.auth.isAuthenticated()) {
      base.push(
        { path: '/wishlist', label: '위시리스트', exact: false, icon: 'heart' },
        { path: '/me/ratings', label: '평점', exact: false, icon: 'star' },
      );
    }
    base.push({ path: '/settings', label: '설정', exact: false, icon: 'gear' });
    return base;
  });
}
