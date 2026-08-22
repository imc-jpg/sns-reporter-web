'use client';

import React, { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as Theme;
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as Theme;
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
  };

  const cycleTheme = () => {
    const nextTheme: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(nextTheme);
    localStorage.setItem('theme-preference', nextTheme);
    localStorage.setItem('mobile-theme-preference', nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <div style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
    );
  }

  const getIconAndLabel = () => {
    switch (theme) {
      case 'dark':
        return { icon: '🌙', label: '다크 모드' };
      case 'light':
        return { icon: '☀️', label: '라이트 모드' };
      case 'system':
      default:
        return { icon: '💻', label: '시스템 설정 동기화' };
    }
  };

  const { icon, label } = getIconAndLabel();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="motion-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.45rem 0.75rem',
        borderRadius: '12px',
        backgroundColor: 'var(--input-glass-bg)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'var(--color-text-main)',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      title={`현재 테마: ${label} (클릭하여 시스템/다크/라이트 전환)`}
    >
      <span style={{ fontSize: '0.95rem' }}>{icon}</span>
      <span className="hidden sm:inline" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {theme === 'system' ? '자동' : theme === 'dark' ? '다크' : '라이트'}
      </span>
    </button>
  );
}
