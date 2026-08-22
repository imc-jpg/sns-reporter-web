'use client';

import React, { useState, useEffect, useRef } from 'react';
import MobileDashboard from './MobileDashboard';
import MobileCalendar from './MobileCalendar';
import MobileFullList from './MobileFullList';
import MobileProfile from './MobileProfile';
import MobileTrioModal from './MobileTrioModal';
import MobileSubmitModal from './MobileSubmitModal';

interface MobileShellProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  user: any;
  onLogout?: () => void;
}

export default function MobileShell({ contents, notices, deadlines = {}, allProfiles = [], user, onLogout }: MobileShellProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'list' | 'profile'>('dashboard');

  // 기획안(0)/완성본(1)/채팅방(2) 3요소를 "같은 위계"의 화면으로 취급해 하나의
  // 틀(MobileTrioModal) 안에서 서로 오간다 — 예전엔 상세보기(item/type/isOpen/
  // originRect/startPeek)와 코멘트(item/isOpen)가 별도 오버레이 2개(총 7개
  // useState)로 나뉘어 있어, 코멘트를 닫을 때 상세보기까지 함께 닫아야 하는 등
  // 서로의 상태를 매번 손으로 맞춰줘야 했고 그 과정에서 실제 버그(코멘트→상세보기
  // 전환이 도로 닫히던 문제)도 있었다. 두 컴포넌트를 하나의 틀로 합친 것과 맞춰
  // 셸 쪽 상태도 하나의 오버레이(screen 필드로 지금 3요소 중 뭘 보고 있는지까지
  // 포함)로 통합했다 — 한 번의 setState로만 갱신되므로 부분 갱신 경합이 구조적으로
  // 불가능하다.
  const [trioOverlay, setTrioOverlay] = useState<{
    isOpen: boolean;
    item: any;
    screen: 0 | 1 | 2;
    originRect: DOMRect | null;
    startPeek: boolean;
  }>({ isOpen: false, item: null, screen: 0, originRect: null, startPeek: false });
  // peek 시작 지점(%) — 이제 peek을 여는 진입점이 없어(요청 반영으로 대시보드
  // 캐러셀도 상세보기로 직행) 항상 기본값에 머문다. MobileTrioModal의 peek
  // prop 자체는 그대로 남겨두되(startPeek이 항상 false라 실질적으로 비활성),
  // 값을 바꿀 호출자가 없으므로 상태 대신 상수로 둔다.
  const detailPeekTopVh = 69.2;
  // GNB 돋보기 아이콘을 누를 때마다 증가 — 전체 리스트 탭으로 이동시키고, 그 화면 자체의
  // 검색 필터 섹션을 펼치며 검색창에 포커스를 주는 신호로 쓴다(MobileFullList 참고).
  const [listSearchTrigger, setListSearchTrigger] = useState(0);

  // Submit Modal state — mode/targetItem을 하나의 객체로 묶었다(항상 handleOpenSubmit
  // 한 곳에서만 함께 바뀜).
  const [submitOverlay, setSubmitOverlay] = useState<{ mode: 'proposal' | 'final' | 'none'; targetItem: any }>({
    mode: 'none',
    targetItem: null,
  });

  // 전체 리스트 또는 캘린더 리스트뷰에서 선택된 콘텐츠 — 하단 액션바(기획안/완성본
  // 아이콘 버튼)가 이 값을 읽는다. 두 화면이 같은 상태를 공유하므로 셸 레벨에서
  // 렌더링해야 스크롤 컨테이너가 아닌 화면에 고정된다(기존 퀵액션 버튼과 동일한 이유).
  const [selectedListItem, setSelectedListItem] = useState<any>(null);
  // 캘린더 화면 자체의 그리드/리스트 전환 상태를 셸로 끌어올렸다 — 하단 액션바를
  // "캘린더가 지금 리스트뷰인지"에 따라 보여줄지 말지 셸에서 판단해야 하기 때문
  // (그리드뷰에서는 이제 날짜팝업 자체가 전체 리스트와 동일한 인라인 확장 방식을
  // 쓰므로 이 플로팅 액션바가 필요 없다).
  const [calendarViewType, setCalendarViewType] = useState<'grid' | 'list'>('grid');

  // 탭을 전환하거나 캘린더 그리드/리스트뷰를 오가면 이전 화면에서 선택했던 콘텐츠가
  // 그대로 남아있지 않도록 선택 상태를 정리한다.
  useEffect(() => {
    setSelectedListItem(null);
  }, [activeTab, calendarViewType]);

  // <main> 스크롤 컨테이너는 탭이 바뀌어도(대시보드↔캘린더↔전체리스트) 같은 DOM
  // 엘리먼트가 재사용돼 scrollTop이 그대로 남는다 — 특히 캘린더 리스트뷰(스크롤 가능)를
  // 내린 채로 그리드뷰로 돌아오면, 그리드뷰는 overflow-hidden이라 사용자가 다시 스크롤을
  // 되돌릴 방법이 없어 그리드 위쪽 줄(요일 헤더·첫 주)이 화면 밖으로 밀려난 채 "잘려서"
  // 보이는 버그가 있었다(실측: main.scrollTop이 리스트뷰에서 남은 값 그대로 유지됨).
  // 탭/뷰타입이 바뀔 때마다 스크롤 위치를 0으로 되돌려 항상 맨 위부터 보이게 한다.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab, calendarViewType]);

  // 하단 4탭+돋보기 바 — 인스타그램처럼 아래로 스크롤해 내려가면 75% 크기로
  // 줄어들고, 위로 스크롤하면 원래 크기로 돌아온다(요청 반영). 매 스크롤 이벤트마다
  // 이전 scrollTop과 비교해 방향을 판단하고, 아주 작은 흔들림에 반응하지 않도록
  // 4px 문턱값을 둔다. 맨 위(scrollTop 0 근처)로 돌아오면 스크롤 방향과 무관하게
  // 항상 원래 크기로 되돌린다.
  const lastMainScrollTop = useRef(0);
  const [navShrunk, setNavShrunk] = useState(false);
  const handleMainScroll = () => {
    const el = mainRef.current;
    if (!el) return;
    const current = el.scrollTop;
    const last = lastMainScrollTop.current;
    if (current <= 4) setNavShrunk(false);
    else if (current > last + 4) setNavShrunk(true);
    else if (current < last - 4) setNavShrunk(false);
    lastMainScrollTop.current = current;
  };
  useEffect(() => { setNavShrunk(false); }, [activeTab, calendarViewType]);

  // Figma spec is authored at a 16px rem base (402px frame); the app-wide
  // html font-size is 17px for the PC layout, so scope the 16px base to
  // exactly the lifetime of this shell.
  useEffect(() => {
    document.documentElement.classList.add('mobile-rem-base');
    return () => document.documentElement.classList.remove('mobile-rem-base');
  }, []);

  // 모바일 뷰의 다크모드는 PC의 data-theme와 별개 속성(data-mobile-theme)으로
  // 관리한다 — 같은 <html>을 PC/모바일이 공유하는 구조라, PC 다크모드 토글을 켠
  // 채로 모바일로 넘어오면 그 값이 그대로 남아있어 독립적인 제어가 안 됐다.
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyCurrentTheme = () => {
      const saved = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as 'system' | 'light' | 'dark';
      const isDark = saved === 'dark' || (saved === 'system' && mediaQuery.matches);

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

    applyCurrentTheme();
    mediaQuery.addEventListener('change', applyCurrentTheme);
    return () => mediaQuery.removeEventListener('change', applyCurrentTheme);
  }, []);

  // 웹앱 전반에서 "브라우저 문서 자체"의 상하 스크롤을 막는다(요청 반영 — 예전엔
  // MobileCalendar 안에서 그리드뷰/날짜팝업일 때만 조건부로 걸었는데, 화면마다
  // 따로 챙기기보다 이 셸이 떠 있는 동안은 항상 걸어두는 게 맞다는 요청). 이 앱은
  // 항상 h-dvh로 뷰포트를 꽉 채우고 각 화면이 자기 안의 <main>(overflow-y-auto)
  // 으로 내부 스크롤을 이미 처리하므로, document.body/html 자체가 스크롤될 일이
  // 없어야 한다 — 실제로 스크롤이 필요한 화면(예: 캘린더 리스트뷰, 전체 리스트)의
  // 내부 스크롤 컨테이너는 이 잠금과 무관하게 각자의 overflow 설정대로 정상
  // 동작한다(document 레벨 잠금은 자식 스크롤 컨테이너의 동작에 영향을 주지 않음).
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // 3요소 중 하나에서 다른 하나로 넘어갈 때는 좌우로 슬라이드하는 모션을(탭
  // 전환처럼), 이 틀이 아예 안 보이는 상태에서 처음 열릴 때만 기존의 아래→위
  // 시트 모션을 쓰도록 구분한다 — 순서는 하단 탭 배치와 같은 기획안(0)/완성본(1)/
  // 채팅방(2), 인덱스가 커지는 방향으로 이동하면 오른쪽에서, 작아지는 방향으로
  // 이동하면 왼쪽에서 새 화면이 들어오는 것으로 정의했다. 이제 화면(screen) 자체가
  // trioOverlay 안의 단일 값이라, "이전 화면"은 그냥 열려있던 trioOverlay.screen을
  // 그대로 비교하면 된다(예전처럼 별도 trioScreen 상태를 따로 추적할 필요가 없다).
  const [trioEnterAnim, setTrioEnterAnim] = useState<'sheet' | 'slide-left' | 'slide-right'>('sheet');
  const openTrio = (screen: 0 | 1 | 2, item: any, originRect?: DOMRect) => {
    setTrioEnterAnim(
      !trioOverlay.isOpen
        ? 'sheet'
        : screen === trioOverlay.screen
        ? 'sheet'
        : screen > trioOverlay.screen
        ? 'slide-right'
        : 'slide-left'
    );
    setTrioOverlay({ isOpen: true, item, screen, originRect: originRect || null, startPeek: false });
  };
  const handleOpenDetail = (item: any, type: 'proposal' | 'final', originRect?: DOMRect) => {
    openTrio(type === 'proposal' ? 0 : 1, item, originRect);
  };
  const handleOpenComments = (item: any) => {
    openTrio(2, item);
  };

  const handleOpenSubmit = (mode: 'proposal' | 'final', targetItem?: any) => {
    setSubmitOverlay({ mode, targetItem: targetItem || null });
  };

  const navItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: '캘린더',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'list',
      label: '전체 리스트',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-white' : 'text-[#757575]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    }
  ];
  // 프로필 탭은 하단 4탭 캡슐에서 제거하고, 대신 대시보드 맨 아래 Family site/
  // 프로필 링크에서 진입한다(요청 반영) — activeTab의 'profile' 값 자체와 그
  // 렌더 분기는 그대로 유지, 진입 경로만 하단 nav에서 대시보드 하단 버튼으로 바뀐다.

  return (
    <div className="w-full h-dvh bg-[#F4F5F7] lg:bg-slate-200/80 flex items-center justify-center p-0 lg:p-6 overflow-x-hidden lg:overflow-y-auto">
      {/* Mobile Screen Container Frame */}
      <div className="font-mobile-body w-full h-full min-h-dvh lg:w-[440px] lg:h-[900px] bg-[#F4F5F7] lg:rounded-[44px] lg:shadow-2xl lg:border-[8px] lg:border-slate-900 overflow-hidden flex flex-col relative">
        
        {/* iPhone Speaker Notch for Desktop View */}
        <div className="hidden lg:flex justify-center items-center pt-2.5 pb-1 bg-white border-b border-slate-100 z-40">
          <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-end px-2.5 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
          </div>
        </div>

        {/* Figma 원본(863:168576 대시보드 섹션)을 조사해보니 로고/타이틀·알림 벨을 담은
            상단 헤더 자체가 아예 없다 — 화면 맨 위는 상태바 뒤로 흐리게 페이드되는
            블러 스트립뿐. 그래서 헤더를 완전히 제거하고, 헤더에 있던 검색 기능만
            하단 네비게이션으로 옮긴다(아래 nav 참고). */}

        {/* Main Content Body — 더 이상 상단에 떠 있는 헤더가 없으므로 safe-area만큼만
            여백을 준다(노치 대응). 캘린더 그리드뷰는 상하 스크롤 자체가 필요 없다는
            요청으로 overflow-hidden — 월 이동은 좌우 스와이프로만 하고, 리스트뷰(항목이
            많아 스크롤이 필요)는 그대로 overflow-y-auto 유지. */}
        <main
          ref={mainRef}
          onScroll={handleMainScroll}
          className={`flex-1 safe-pt p-4 relative min-h-0 ${
            activeTab === 'calendar' && calendarViewType === 'grid' ? 'overflow-hidden' : 'overflow-y-auto'
          } ${
            activeTab === 'dashboard'
              ? 'pb-[calc(10rem+env(safe-area-inset-bottom))]'
              : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
          }`}
        >
          {activeTab === 'dashboard' && (
            <MobileDashboard
              contents={contents}
              notices={notices}
              deadlines={deadlines}
              allProfiles={allProfiles}
              onNavigateToList={() => setActiveTab('list')}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
              onOpenProfile={() => setActiveTab('profile')}
            />
          )}

          {activeTab === 'calendar' && (
            <MobileCalendar
              contents={contents}
              allProfiles={allProfiles}
              viewType={calendarViewType}
              onViewTypeChange={setCalendarViewType}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
            />
          )}

          {activeTab === 'list' && (
            <MobileFullList
              contents={contents}
              selectedItem={selectedListItem}
              onSelectItem={setSelectedListItem}
              revealSearch={listSearchTrigger}
              user={user}
              onOpenDetail={handleOpenDetail}
              onOpenSubmit={handleOpenSubmit}
              onOpenComments={handleOpenComments}
            />
          )}

          {activeTab === 'profile' && (
            <MobileProfile user={user} onLogout={onLogout} />
          )}
        </main>

        {/* 하단 2버튼 액션 바 — 이제 대시보드(선택 없는 기본 상태)에서만 쓰인다.
            전체 리스트/캘린더(그리드 날짜팝업·리스트뷰 모두)/대시보드 승인대기
            리스트는 전부 "선택 시 그 블록 자체가 늘어나며 인라인 아이콘이 나타나는"
            방식으로 통일됐다(MobileFullList 참고) — 이 플로팅 바는 콘텐츠 생성
            진입점(기획안 작성/완성본 업로드) 전용으로만 남았다. fixed to the shell
            so it never scrolls away. */}
        {/* 이 줄의 모든 flex-1 버튼은 px-4를 똑같이 갖고 있어야 한다 — 아이콘 전용
            버튼(패딩 없음)과 아이콘+텍스트 버튼(px-4 있음)을 나란히 두면, 겉보기엔
            flex-basis:0%/min-w-0로 정확히 반반 나뉠 것 같지만 실제로는 패딩이 있는
            쪽이 패딩만큼 더 넓게 자라는 걸 실측으로 확인했다(패딩을 양쪽 다 0으로
            맞추면 즉시 정확히 반반이 됨) — 그래서 폭을 맞추려면 padding 자체를
            대칭으로 맞추는 것 말고는 방법이 없다. */}
        {/* 승인대기 리스트에서 내 콘텐츠를 선택하면(그 블록이 인라인으로 확장되는 동안)
            이 생성 버튼 바가 화면 아래로 살짝 가라앉으며 사라지고, 선택을 해제하면
            다시 떠오른다(요청 반영) — 탭 전환(activeTab)과는 별개로, 같은 대시보드
            탭 안에서 selectedListItem 유무에 따라 항상 마운트된 채 opacity/위치만
            전환한다(트랜지션이 끊기지 않도록 mount/unmount 대신 순수 CSS transition). */}
        {activeTab === 'dashboard' && (
          <div
            className={`absolute left-3.5 right-3.5 z-20 flex items-center gap-3 bottom-[calc(5.125rem+env(safe-area-inset-bottom))] ${
              selectedListItem ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{
              // scale(0.75)는 transform-origin(아래쪽)을 축으로 줄어들어 이 버튼 그룹
              // 자신의 아래쪽 끝은 그대로 있고 위쪽만 내려온다 — 그런데 바로 아래 있는
              // 하단 nav도 같은 방식으로 줄어들면서 그쪽 "위쪽 끝"이 더 많이 내려가버려,
              // 두 UI 사이 간격이 줄어들기는커녕 오히려 벌어져 보였다(실측: 0.75rem→
              // 1.66rem). translateY로 하단 nav가 내려간 만큼(3.625rem 높이의 25% =
              // 0.906rem) 이 버튼 그룹도 함께 내려보내 간격을 원래대로 유지한다.
              transform: `translateY(${selectedListItem ? '1rem' : navShrunk ? '0.906rem' : '0'}) scale(${navShrunk ? 0.75 : 1})`,
              transformOrigin: 'bottom center',
              transition: 'transform 200ms ease-out, opacity 200ms ease-out',
            }}
          >
            <button
              onClick={() => handleOpenSubmit('proposal')}
              className="glass-cta glass-cta-strong flex-1 min-w-0 h-[2.625rem] px-4 font-medium text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>✍️</span>
              <span>기획안 작성</span>
            </button>
            <button
              onClick={() => handleOpenSubmit('final')}
              className="glass-cta-sky flex-1 min-w-0 h-[2.625rem] px-4 font-normal text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>📤</span>
              <span>완성본 업로드</span>
            </button>
          </div>
        )}

        {/* Bottom App Navigation Bar — Figma 원본(852:34431 "bottom navbar" 컴포넌트)을
            직접 조사해보니 4탭 캡슐(287×58)과 검색 위젯(58×58)이 8px 간격으로 나란히
            배치된 하나의 그룹이었다(정사각형 검색 위젯 한 변이 캡슐 높이와 정확히
            같음). 예전엔 검색을 상단 헤더 쪽에 뒀었는데, 헤더 자체가 Figma에 없어서
            검색만 이 위치로 옮기고 헤더는 완전히 제거했다. 캡슐 재질은 그대로
            .glass-navbar(liquid-glass: 5%-opacity white + 10px backdrop blur + layered
            ambient/inner shadows, 활성 탭은 40%-black 틴트), 검색 위젯은 다른 개별
            아이콘 버튼들과 같은 .glass-cta. */}
        <div
          className={`font-mobile-sf absolute inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 transition-transform duration-200 ease-out ${navShrunk ? 'scale-75' : 'scale-100'}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <nav className="flex-1 min-w-0">
            <div className="glass-navbar flex items-center h-[3.625rem] rounded-full p-1 gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      // 검색 아이콘으로 전체 리스트에 들어갔다가(revealSearch가 0이
                      // 아닌 값으로 남음) 다른 탭을 거쳐 이 캡슐의 "전체 리스트"
                      // 버튼으로 다시 들어오면, MobileFullList가 리마운트되며
                      // "이미 처리한 값"을 기억하던 내부 ref도 함께 초기화돼 그
                      // 오래된 revealSearch 값을 새 요청으로 착각해 검색/필터
                      // 섹션이 저절로 펼쳐지는 버그가 있었다 — 일반 탭 버튼으로
                      // 이동할 때는 항상 0으로 되돌려, 다음에 이 탭 버튼으로 들어올
                      // 때 검색 섹션이 열리지 않게 한다(검색 아이콘 버튼만 열어야 함).
                      setListSearchTrigger(0);
                    }}
                    className={`flex flex-1 flex-col items-center justify-center h-full rounded-full transition-[transform,background-color] duration-300 active:scale-95 ${
                      isActive ? 'glass-navbar-active' : ''
                    }`}
                  >
                    {item.icon(isActive)}
                    <span className={`text-[0.6rem] mt-0.5 font-bold tracking-tight ${isActive ? 'text-white' : 'text-[#757575]'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
          <button
            onClick={() => {
              setActiveTab('list');
              setListSearchTrigger(t => t + 1);
            }}
            aria-label="검색"
            className="glass-cta w-[3.625rem] h-[3.625rem] rounded-full flex items-center justify-center text-slate-700 text-lg flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            🔍
          </button>
        </div>

        {/* 기획안/완성본/채팅방 통합 오버레이 — 하나의 틀 안에서 화면만 바뀐다 */}
        <MobileTrioModal
          isOpen={trioOverlay.isOpen}
          screen={trioOverlay.screen}
          onScreenChange={(screen) => setTrioOverlay(prev => ({ ...prev, screen }))}
          onClose={() => setTrioOverlay(prev => ({ ...prev, isOpen: false }))}
          item={trioOverlay.item}
          originRect={trioOverlay.originRect}
          startPeek={trioOverlay.startPeek}
          peekTopVh={detailPeekTopVh}
          user={user}
          onEdit={(editItem, editType) => {
            setTrioOverlay(prev => ({ ...prev, isOpen: false }));
            handleOpenSubmit(editType, editItem);
          }}
          enterAnim={trioEnterAnim}
        />

        {/* Mobile Submission Form Modal */}
        <MobileSubmitModal
          isOpen={submitOverlay.mode !== 'none'}
          onClose={() => setSubmitOverlay({ mode: 'none', targetItem: null })}
          mode={submitOverlay.mode === 'final' ? 'final' : 'proposal'}
          targetItem={submitOverlay.targetItem}
          user={user}
          allProfiles={allProfiles}
          contents={contents}
        />
      </div>
    </div>
  );
}
