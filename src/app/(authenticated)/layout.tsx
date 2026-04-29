'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<{name: string, team: string} | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const restoreProfile = async (currentUser: any) => {
      const urlParams = new URLSearchParams(window.location.search);
      const isAdmin = urlParams.get('admin') === 'true';

      if (!currentUser && !isAdmin) {
        setIsCheckingProfile(false);
        setIsRedirecting(true);
        router.push('/login');
        return;
      }
      
      if (!currentUser && isAdmin) {
        setIsCheckingProfile(false);
        setUser({ email: 'admin', user_metadata: { name: '관리자' } });
        setProfileData({ name: '관리자', team: '운영진' });
        return;
      }
      const metaTeam = currentUser.user_metadata?.team;
      const metaName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
      const localTeam = localStorage.getItem(`team_${currentUser.email}`);
      const localName = localStorage.getItem(`name_${currentUser.email}`);

      if (!metaTeam) {
        if (localTeam) {
          const newName = localName || metaName;
          await supabase.auth.updateUser({ data: { team: localTeam, name: newName, full_name: newName } });
          setProfileData({ name: newName, team: localTeam });
          router.refresh();
        } else {
          const { data: profile } = await supabase.from('contents').select('team, author_name').eq('title', `PROFILE_${currentUser.email}`).single();
          if (profile && profile.team) {
            const newName = profile.author_name || metaName;
            await supabase.auth.updateUser({ data: { team: profile.team, name: newName, full_name: newName } });
            localStorage.setItem(`team_${currentUser.email}`, profile.team);
            if (newName) localStorage.setItem(`name_${currentUser.email}`, newName);
            setProfileData({ name: newName, team: profile.team });
            router.refresh();
          } else if (pathname !== '/profile') {
            router.push('/profile');
          }
        }
      } else {
        localStorage.setItem(`team_${currentUser.email}`, metaTeam);
        if (metaName) localStorage.setItem(`name_${currentUser.email}`, metaName);
        
        // Load from DB to ensure UI shows the latest DB name regardless of Google overwrite
        const { data: profile } = await supabase.from('contents').select('team, author_name').eq('title', `PROFILE_${currentUser.email}`).single();
        if (profile) {
          setProfileData({ name: profile.author_name || metaName, team: profile.team || metaTeam });
        } else {
          setProfileData({ name: metaName, team: metaTeam });
        }
      }
      setIsCheckingProfile(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      restoreProfile(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      setUser(currentUser || null);
      if (currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
        restoreProfile(currentUser);
      }
    });
    return () => authListener?.subscription.unsubscribe();
  }, [pathname, router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

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
        
        <div style={{ padding: '2rem 1.5rem 1rem 1.5rem' }}>
          <img src="/yonsei_media_logo.png" alt="연세대학교 미디어센터" style={{ width: '100%', height: 'auto', marginBottom: '1rem', display: 'block', maxWidth: '180px' }} />
          <h1 style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.15rem', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
            연세대학교 SNS기자단<br/>기획안 시스템
          </h1>
        </div>

        <nav style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginTop: '0.5rem' }}>MAIN</div>
          <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
            내 콘텐츠 현황
          </Link>
          <Link href="/proposals" style={getLinkStyle('/proposals')}>
            전체 기획안
          </Link>
          <Link href="/final-works" style={getLinkStyle('/final-works')}>
            전체 완성본
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

          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginTop: '1.5rem' }}>ADMIN</div>
          <Link href="/admin/users" style={getLinkStyle('/admin/users')}>
            👥 회원 명단 관리
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

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: '#f9fafb', flexShrink: 0 }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{profileData?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님</span>
                <Link href="/profile" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 500 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '2px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  설정
                </Link>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <button 
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>로그인이 필요합니다</div>
              <Link 
                href="/login"
                style={{ display: 'block', padding: '0.4rem', border: '1px solid var(--color-primary)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'white', backgroundColor: 'var(--color-primary)', textDecoration: 'none' }}
              >
                로그인 하러 가기
              </Link>
            </div>
          )}
        </div>

      </aside>

      <main style={{ flex: 1, padding: '3rem 2.5rem', height: '100vh', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
        <div className="container" style={{ padding: 0, width: '100%', maxWidth: '1800px', margin: '0 auto' }}>
          {isRedirecting ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>
              로그인 화면으로 이동합니다...
            </div>
          ) : isCheckingProfile ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-text-muted)' }}>
              사용자 접근 권한을 확인 중입니다...
            </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}
