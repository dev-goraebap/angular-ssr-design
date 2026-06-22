import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '@/shared/auth';

/**
 * 로그인(ADR-0006).
 * 업무: 데모 계정으로 로그인하고, returnUrl이 있으면 그 경로로 복귀한다(가드가 넘겨준다).
 */
@Component({
  selector: 'page-login',
  imports: [ReactiveFormsModule, HlmInput, HlmLabel, HlmButton],
  host: { class: 'block' },
  template: `
    <div class="mx-auto flex max-w-sm flex-col gap-6 px-5 py-10">
      <header>
        <h1 class="text-2xl font-bold text-foreground">로그인</h1>
        <p class="mt-1 text-sm text-muted-foreground">데모 계정 — 아이디 demo / 비밀번호 demo1234</p>
      </header>

      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="login-id">아이디</label>
          <input
            hlmInput
            id="login-id"
            formControlName="id"
            autocomplete="username"
            autocapitalize="off"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label hlmLabel for="login-pw">비밀번호</label>
          <input
            hlmInput
            id="login-pw"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </div>

        @if (error()) {
          <p class="text-sm text-destructive" role="alert">{{ error() }}</p>
        }

        <button hlmBtn type="submit" [disabled]="form.invalid">로그인</button>
      </form>
    </div>
  `,
})
export default class Login {
  // 가드가 넘긴 복귀 경로(쿼리 파라미터). withComponentInputBinding으로 바인딩된다.
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submit(): void {
    if (this.form.invalid) return;
    const { id, password } = this.form.getRawValue();
    if (this.auth.login(id, password)) {
      void this.router.navigateByUrl(this.returnUrl() || '/');
    } else {
      this.error.set('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  }
}
