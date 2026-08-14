'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import NotificationsPopup from "@/components/NotificationsPopup";
import { ModalProvider } from '@/contexts/ModalContext';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Automatic mobile redirect is turned off as requested

    const restoreProfile = async (currentUser: any) => {
      let isAdminUser = currentUser?.email === 'admin@admin.com' || currentUser?.user_metadata?.is_admin === true;
      setIsAdmin(isAdminUser);

      if (!currentUser && !isAdminUser) {
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
          const { data: profile } = await supabase.from('contents').select('team, author_name').eq('title', `PROFILE_${currentUser.email}`).maybeSingle();
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
        const { data: profile } = await supabase.from('contents').select('team, author_name').eq('title', `PROFILE_${currentUser.email}`).maybeSingle();
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

  const getLinkClass = (path: string) => {
    const isActive = pathname === path || (path !== '/dashboard' && pathname?.startsWith(path));
    return `sidebar-link ${isActive ? 'active' : ''}`;
  };

  if (pathname === '/mobile') {
    return (
      <ModalProvider>
        <div className="w-full min-h-screen bg-slate-100 p-0 m-0">
          {children}
        </div>
      </ModalProvider>
    );
  }

  return (
    <ModalProvider>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {isSidebarOpen && (
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
          color: 'white',
          flexShrink: 0
        }}>
        
        <div style={{ padding: '2rem 1.5rem 1.5rem 1.5rem' }}>
          {/* Logo with text */}
          <Link href="/dashboard" style={{ display: 'block', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
               <img src="/yonsei_media_logo.png" alt="연세대학교 미디어센터" style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '180px' }} />
            </div>
            <h1 style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem', lineHeight: 1.35, letterSpacing: '-0.02em', opacity: 0.9, whiteSpace: 'nowrap' }}>
              SNS기자단 기획안 통합관리 시스템
            </h1>
          </Link>
        </div>

        <nav style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', letterSpacing: '0.05em' }}>MAIN</div>
          <Link href="/dashboard" className={getLinkClass('/dashboard')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            대시보드
          </Link>
          <Link href="/contents" className={getLinkClass('/contents')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            전체 콘텐츠
          </Link>
          <Link href="/trainee-contents" className={getLinkClass('/trainee-contents')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            전체 콘텐츠(수습 단원용)
          </Link>
          <Link href="/mobile" className={getLinkClass('/mobile')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            📱 모바일 뷰
          </Link>

          <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>INFO</div>
          <Link href="/notices" className={getLinkClass('/notices')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
            공지사항
          </Link>
          <Link href="/guidelines" className={getLinkClass('/guidelines')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            가이드라인
          </Link>
          <Link href="/resources" className={getLinkClass('/resources')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            자료실
          </Link>

          <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>FAMILY SITES</div>
          <a href="https://ymcrental.vercel.app/" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', textDecoration: 'none', color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s', fontSize: '0.82rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            미디어센터 장비대여 시스템
          </a>
          <a href="https://www.youtube.com/@ysuniversity" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', textDecoration: 'none', color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s', fontSize: '0.82rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            연세대학교 공식 유튜브
          </a>
          <a href="https://www.instagram.com/yonsei_official/" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', textDecoration: 'none', color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s', fontSize: '0.82rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            연세대학교 공식 인스타그램
          </a>

          {isAdmin && (
            <>
              <div style={{ padding: '0 1.5rem 0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>ADMIN</div>
              <Link href="/admin/users" className={getLinkClass('/admin/users')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                회원 명단 관리
              </Link>
              <Link href="/admin/contents" className={getLinkClass('/admin/contents')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                콘텐츠 현황 관리
              </Link>
              <Link href="/admin/settings" className={getLinkClass('/admin/settings')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                마감일 설정
              </Link>
            </>
          )}
        </nav>

        {isAdmin && (
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
        )}
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '70px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 10 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Sidebar Toggle */}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            {/* Search Bar */}
            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const q = formData.get('q');
                if (q) {
                  router.push(`/search?q=${encodeURIComponent(q as string)}${window.location.search.includes('admin=true') ? '&admin=true' : ''}`);
                } else {
                  router.push(`/search${window.location.search.includes('admin=true') ? '?admin=true' : ''}`);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '6px', padding: '0 1rem', width: '320px', height: '40px', border: '1px solid #e2e8f0', transition: 'border-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <input type="text" name="q" placeholder="Search" autoComplete="off" defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : ''} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', flex: 1, fontSize: '0.9rem', color: '#334155' }} />
              <button type="submit" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </form>
          </div>

          {/* Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <NotificationsPopup userEmail={user?.email || null} userName={profileData?.name || user?.user_metadata?.name || null} />
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {profileData?.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]} 님
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                    <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.name || 'User'}&background=random`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </Link>
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
      </ModalProvider>
  );
}
