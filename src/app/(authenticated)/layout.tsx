'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { cleanAuthorName } from "@/utils/dateUtils";
import NotificationsPopup from "@/components/NotificationsPopup";
import ThemeToggle from "@/components/ThemeToggle";
import { ModalProvider } from '@/contexts/ModalContext';
import { RealtimeNotificationProvider } from '@/contexts/RealtimeNotificationContext';

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
      const rawMetaName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
      const metaName = cleanAuthorName(rawMetaName);
      const localTeam = localStorage.getItem(`team_${currentUser.email}`);
      const localName = cleanAuthorName(localStorage.getItem(`name_${currentUser.email}`));

      if (!metaTeam) {
        if (localTeam) {
          const newName = cleanAuthorName(localName || metaName);
          await supabase.auth.updateUser({ data: { team: localTeam, name: newName, full_name: newName } });
          setProfileData({ name: newName, team: localTeam });
          router.refresh();
        } else {
          const { data: profile } = await supabase.from('contents').select('team, author_name').eq('title', `PROFILE_${currentUser.email}`).maybeSingle();
          if (profile && profile.team) {
            const newName = cleanAuthorName(profile.author_name || metaName);
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
          setProfileData({ name: cleanAuthorName(profile.author_name || metaName), team: profile.team || metaTeam });
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

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

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
      <RealtimeNotificationProvider
        userEmail={user?.email || null}
        userName={profileData?.name || user?.user_metadata?.name || null}
        isAdmin={isAdmin}
      >
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent', position: 'relative' }}>
        
        {/* Left Screen Edge Hover Trigger Hotspot (메뉴바가 닫혀있을 때 호버 감지) */}
        <div 
          onMouseEnter={() => setIsSidebarHovered(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '20px',
            height: '100vh',
            zIndex: 90,
            cursor: 'pointer'
          }}
          title="마우스를 올리면 메뉴가 나타납니다"
        />

        {/* Transparent Push-Transition Sidebar */}
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          style={{ 
            width: isSidebarHovered ? '260px' : '0px', 
            minWidth: isSidebarHovered ? '260px' : '0px',
            maxWidth: isSidebarHovered ? '260px' : '0px',
            backgroundColor: 'transparent', 
            borderRight: isSidebarHovered ? '1px solid rgba(226, 232, 240, 0.6)' : 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'sticky', 
            top: 0, 
            height: '100vh', 
            overflowY: 'auto',
            overflowX: 'hidden', 
            flexShrink: 0, 
            opacity: isSidebarHovered ? 1 : 0,
            pointerEvents: isSidebarHovered ? 'auto' : 'none',
            transition: 'width 0.32s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
          }}
        >
          <div style={{ width: '260px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ padding: '2rem 1.25rem 1.25rem 1.25rem' }}>
              {/* Logo — 예전엔 로고 아래에 "SNS기자단 기획안 통합관리" 텍스트가 따로
                  있었는데, 텍스트를 없애고 그만큼의 세로 공간을 로고 자체를 키우는 데
                  쓴다(요청 반영). */}
              <Link href="/dashboard" style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                   <img src="/yonsei_media_logo.png" alt="연세대학교 미디어센터" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </Link>
            </div>

          <nav style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            <div style={{ padding: '0 0.75rem 0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginTop: '0.5rem', letterSpacing: '0.08em' }}>MAIN</div>
            <Link href="/dashboard" className={getLinkClass('/dashboard')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              대시보드
            </Link>
            <Link href="/contents" className={getLinkClass('/contents')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              전체 콘텐츠
            </Link>

            <div style={{ padding: '0 0.75rem 0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginTop: '1.25rem', letterSpacing: '0.08em' }}>INFO</div>
            <Link href="/notices" className={getLinkClass('/notices')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
              공지사항
            </Link>
            <Link href="/guidelines" className={getLinkClass('/guidelines')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              가이드라인
            </Link>
            <Link href="/resources" className={getLinkClass('/resources')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              자료실
            </Link>

            <div style={{ padding: '0 0.75rem 0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginTop: '1.25rem', letterSpacing: '0.08em' }}>FAMILY SITES</div>
            <a href="https://ymcrental.vercel.app/" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ fontSize: '0.82rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              미디어센터 장비대여
            </a>
            <a href="https://www.youtube.com/@ysuniversity" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ fontSize: '0.82rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              연세대학교 유튜브
            </a>
            <a href="https://www.instagram.com/yonsei_official/" target="_blank" rel="noopener noreferrer" className="sidebar-link" style={{ fontSize: '0.82rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              연세대학교 인스타그램
            </a>

            {isAdmin && (
              <>
                <div style={{ padding: '0 0.75rem 0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginTop: '1.25rem', letterSpacing: '0.08em' }}>ADMIN</div>
                <Link href="/admin/users" className={getLinkClass('/admin/users')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  회원 명단 관리
                </Link>
                <Link href="/admin/contents" className={getLinkClass('/admin/contents')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  콘텐츠 현황 관리
                </Link>
                <Link href="/admin/settings" className={getLinkClass('/admin/settings')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  마감일 설정
                </Link>
                <Link href="/mobile" className={getLinkClass('/mobile')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  📱 모바일 뷰
                </Link>
              </>
            )}
          </nav>

          {isAdmin && (
            <div style={{ padding: '1.25rem 1rem', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>테스트 모드 전환</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <Link 
                  href="/dashboard?admin=true"
                  style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 750, color: '#1E3A8A', backgroundColor: '#EFF6FF', textDecoration: 'none', transition: 'all 0.2s', border: 'none' }}
                  className="hover:bg-blue-100"
                >
                  관리자 현황 뷰
                </Link>
                <Link 
                  href="/dashboard"
                  style={{ width: '100%', textAlign: 'center', padding: '0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, color: '#475569', backgroundColor: '#F8FAFC', textDecoration: 'none', transition: 'all 0.2s', border: 'none' }}
                  className="hover:bg-slate-100"
                >
                  일반 현황 뷰
                </Link>
              </div>
            </div>
          )}
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
          <header className="pc-header-glass px-4 sm:px-6 lg:px-8" style={{ height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Sidebar Trigger Button */}
              <button 
                onMouseEnter={() => setIsSidebarHovered(true)}
                onClick={() => setIsSidebarHovered(!isSidebarHovered)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A8A', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '10px', backgroundColor: '#EFF6FF', transition: 'all 0.2s' }} 
                className="hover-scale"
                title="메뉴 열기"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
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
              className="w-[200px] sm:w-[280px] md:w-[340px]"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                backgroundColor: 'rgba(255, 255, 255, 0.75)', 
                backdropFilter: 'blur(10px)', 
                WebkitBackdropFilter: 'blur(10px)', 
                borderRadius: '12px', 
                padding: '0 1rem', 
                height: '42px', 
                border: '1px solid rgba(255, 255, 255, 0.9)', 
                transition: 'all 0.2s', 
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 36, 84, 0.03)' 
              }}
            >
              <input type="text" name="q" placeholder="콘텐츠, 작성자, 키워드 검색" autoComplete="off" defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : ''} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', flex: 1, fontSize: '0.88rem', color: '#0F172A', minWidth: 0 }} />
              <button type="submit" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '0.5rem', color: '#94A3B8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </form>
          </div>

          {/* Profile & Notifications & Theme */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <NotificationsPopup userEmail={user?.email || null} userName={profileData?.name || user?.user_metadata?.name || null} />
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '4px 8px', borderRadius: '12px', transition: 'background-color 0.2s' }} className="hover:bg-slate-200/50">
                  <div className="hidden md:block" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>
                      {cleanAuthorName(profileData?.name || user.user_metadata?.full_name || user.user_metadata?.name) || user.email?.split('@')[0]} 님
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{user.email}</div>
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--input-glass-bg)', border: '2px solid var(--color-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                    <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${profileData?.name || 'User'}&background=002454&color=fff`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </Link>
                <button onClick={handleLogout} style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.78rem', marginLeft: '0.25rem', fontWeight: 600 }} className="hover:text-red-500">로그아웃</button>
              </div>
            ) : (
              <Link href="/login" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>로그인</Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="container" style={{ padding: 0, width: '100%', maxWidth: '1800px', margin: '0 auto' }}>
            {isRedirecting ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 600 }}>
                로그인 화면으로 이동합니다...
              </div>
            ) : isCheckingProfile ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94a3b8' }}>
                사용자 접근 권한을 확인 중입니다...
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
    </RealtimeNotificationProvider>
  </ModalProvider>
  );
}
