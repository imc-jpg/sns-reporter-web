'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getLinkStyle = (path: string) => {
    const isActive = pathname === path || (path !== '/dashboard' && pathname?.startsWith(path));
    return {
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: isActive ? 600 : 500,
      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
      backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
      transition: 'background-color 0.2s, color 0.2s',
      display: 'block',
      textDecoration: 'none'
    };
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <aside style={{ 
        width: '260px', 
        backgroundColor: 'var(--color-surface)', 
        borderRight: '1px solid var(--color-border)', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        
        <div style={{ padding: '2rem 1.5rem' }}>
          <h1 style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.25rem', lineHeight: 1.3 }}>
            연세대학교<br/>콘텐츠 검수 시스템
          </h1>
        </div>

        <nav style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginTop: '0.5rem' }}>MAIN</div>
          <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
            현황 보드
          </Link>
          <Link href="/proposals" style={getLinkStyle('/proposals')}>
            기획안
          </Link>
          <Link href="/final-works" style={getLinkStyle('/final-works')}>
            완성본
          </Link>

          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginTop: '1.5rem' }}>INFO</div>
          <Link href="/guidelines" style={getLinkStyle('/guidelines')}>
            콘텐츠 가이드라인
          </Link>
          <Link href="/notices" style={getLinkStyle('/notices')}>
            공지사항
          </Link>
          <Link href="/resources" style={getLinkStyle('/resources')}>
            자료실
          </Link>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem' }}>테스트 모드 전환</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link 
              href="/dashboard?admin=true"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)' }}
            >
              관리자 현황 뷰
            </Link>
            <Link 
              href="/dashboard"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}
            >
              일반 현황 뷰
            </Link>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '2rem' }}>
        <div className="container" style={{ padding: 0, maxWidth: '1200px', margin: '0 0 0 0' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
