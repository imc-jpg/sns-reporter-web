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
      let isAdmin = urlParams.get('admin') === 'true';

      if (isAdmin) {
        sessionStorage.setItem('isAdminBypass', 'true');
      } else {
        isAdmin = sessionStorage.getItem('isAdminBypass') === 'true';
      }

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
    sessionStorage.removeItem('isAdminBypass');
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
      color: isActive ? '#001430' : 'rgba(255, 255, 255, 0.7)',
      backgroundColor: isActive ? 'white' : 'transparent',
      transition: 'all 0.2s',
      display: 'block',
      textDecoration: 'none'
    };
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#002454', 
        borderRight: '1px solid #001430', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        color: 'white'
      }}>
        
        <div style={{ padding: '2rem 1.5rem 1rem 1.5rem' }}>
          {/* Logo with text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
             <img src="/yonsei_media_logo.png" alt="연세대학교 미디어센터" style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '180px', filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 style={{ fontWeight: 800, color: 'white', fontSize: '1rem', lineHeight: 1.35, letterSpacing: '-0.02em', opacity: 0.9 }}>
            와이온 기획안 통합 시스템
          </h1>
        </div>

        <nav style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>MAIN</div>
          <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
            내 콘텐츠 현황
          </Link>
          <Link href="/proposals" style={getLinkStyle('/proposals')}>
            전체 기획안
          </Link>
          <Link href="/final-works" style={getLinkStyle('/final-works')}>
            전체 완성본
          </Link>

          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem' }}>INFO</div>
          <Link href="/guidelines" style={getLinkStyle('/guidelines')}>
            콘텐츠 가이드라인
          </Link>
          <Link href="/notices" style={getLinkStyle('/notices')}>
            공지사항
          </Link>
          <Link href="/resources" style={getLinkStyle('/resources')}>
            자료실
          </Link>

          <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem' }}>ADMIN</div>
          <Link href="/admin/users" style={getLinkStyle('/admin/users')}>
            👥 회원 명단 관리
          </Link>
          <Link href="/admin/settings" style={getLinkStyle('/admin/settings')}>
            ⚙️ 마감일 설정
          </Link>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>테스트 모드 전환</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link 
              href="/dashboard?admin=true"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              관리자 현황 뷰
            </Link>
            <Link 
              href="/dashboard"
              style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 600, color: 'white' }}
            >
              일반 현황 뷰
            </Link>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '70px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
          {/* Search Bar */}
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const q = formData.get('q');
              if (q) {
                router.push(`/dashboard?q=${encodeURIComponent(q as string)}${window.location.search.includes('admin=true') ? '&admin=true' : ''}`);
              } else {
                router.push(`/dashboard${window.location.search.includes('admin=true') ? '?admin=true' : ''}`);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', padding: '0.5rem 1rem', width: '360px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" name="q" placeholder="Search" defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : ''} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '0.5rem', width: '100%', fontSize: '0.9rem', color: '#334155' }} />
          </form>

          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #f1f5f9' }}></span>
            </button>
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                    {profileData?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]} 님
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                  <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.name || 'User'}&background=random`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <button onClick={handleLogout} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '0.5rem', textDecoration: 'underline' }}>로그아웃</button>
              </div>
            ) : (
              <Link href="/login" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>로그인</Link>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: '#f1f5f9' }}>
          <div className="container" style={{ padding: 0, width: '100%', maxWidth: '1800px', margin: '0 auto' }}>
            {isRedirecting ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 600 }}>
                로그인 화면으로 이동합니다...
              </div>
            ) : isCheckingProfile ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94a3b8' }}>
                사용자 접근 권한을 확인 중입니다...
              </div>
            ) : children}
          </div>
        </main>
      </div>
    </div>
  );
}
