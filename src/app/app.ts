import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppNav } from '@/widgets/app-nav/app-nav';
import { ThemeService } from '@/shared/lib';

/**
 * 앱 셸 — 내비게이션과 페이지를 배치한다.
 * 모바일은 세로 쌓기(콘텐츠 + 하단 탭바), laptop+는 가로(좌측 레일 + 콘텐츠).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppNav],
  host: { class: 'block' },
  template: `
    <div class="flex h-dvh flex-col-reverse lg:flex-row">
      <app-nav class="shrink-0" />
      <!-- 스크롤은 전체 폭의 main이 맡는다 → 스크롤바가 창 오른쪽 끝에 생긴다.
           콘텐츠는 안쪽에서 가운데 최대폭 컬럼으로 모은다(모바일 풀폭, 데스크톱 가운데). -->
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div class="relative mx-auto w-full max-w-5xl">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class App {
  // 저장된 테마를 시작 시 적용하기 위해 인스턴스화한다.
  private readonly theme = inject(ThemeService);
}
