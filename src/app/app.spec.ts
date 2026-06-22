import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ThemeService } from '@/shared/lib';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('생성된다', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('내비게이션을 렌더한다', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-nav')).toBeTruthy();
  });
});

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());

  it('다크가 기본이고 토글하면 라이트가 된다', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('dark');
    theme.toggle();
    expect(theme.theme()).toBe('light');
  });
});
