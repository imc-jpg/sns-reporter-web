'use client';

import React, { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

// PC의 ThemeToggle과 별개로, 모바일 뷰에서만 쓰는 다크모드 설정이다 — PC의
// data-theme 속성을 그대로 재사용하면 PC에서 다크모드를 켠 채 모바일로 넘어올 때
// (같은 <html>을 공유하는 구조라) 그 값이 그대로 새어 들어가므로, 별도의
// data-mobile-theme 속성 + localStorage 키(mobile-theme-preference)로 분리했다.
export default function MobileThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as Theme;
    setTheme(saved);
    applyTheme(saved);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const current = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as Theme;
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const applyTheme = (next: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = next === 'dark' || (next === 'system' && prefersDark);

    if (isDark) {
      root.setAttribute('data-mobile-theme', 'dark');
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-mobile-theme', 'light');
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
  };

  const cycleTheme = () => {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
    localStorage.setItem('theme-preference', next);
    localStorage.setItem('mobile-theme-preference', next);
    applyTheme(next);
  };

  if (!mounted) {
    return <div className="w-9 h-9 flex-shrink-0" />;
  }

  const label = theme === 'dark' ? '다크 모드' : theme === 'light' ? '라이트 모드' : '시스템 설정 동기화';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="glass-cta w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
      title={`현재 테마: ${label} (탭하여 다크/라이트/자동 전환)`}
      aria-label={`화면 테마: ${label}`}
    >
      {theme === 'dark' ? (
        <svg className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : theme === 'light' ? (
        <svg className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 18h2" />
        </svg>
      )}
    </button>
  );
}
