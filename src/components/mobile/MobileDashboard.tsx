'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { DriveColorIcon, DriveLockedIcon } from './driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from './platformIcons';
import MobileThemeToggle from './MobileThemeToggle';

const getTypeIcon = (contentType: string) => {
  if (!contentType) return <GenericPostIcon className="w-12 h-12" />;
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return <YoutubeIcon className="w-12 h-12" />;
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return <InstagramIcon className="w-12 h-12" />;
  if (contentType.includes('글') || contentType.includes('블로그')) return <NaverBlogIcon className="w-12 h-12" />;
  return <GenericPostIcon className="w-12 h-12" />;
};

// 승인 대기 중 리스트 카드용 — 전체 리스트(MobileFullList)의 아이콘 배지와 같은
// 작은 크기(w-5)로, 요청대로 이 목록에도 플랫폼 아이콘을 표시한다.
const getSmallPlatformIcon = (contentType: string) => {
  if (!contentType) return <GenericPostIcon className="w-5 h-5" />;
  if (contentType.includes('영상') || contentType.includes('유튜브') || contentType.includes('릴스') || contentType.includes('숏폼')) return <YoutubeIcon className="w-5 h-5" />;
  if (contentType.includes('카드뉴스') || contentType.includes('인스타')) return <InstagramIcon className="w-5 h-5" />;
  if (contentType.includes('글') || contentType.includes('블로그')) return <NaverBlogIcon className="w-5 h-5" />;
  return <GenericPostIcon className="w-5 h-5" />;
};

const parseBody = (item: any) => {
  try {
    if (item.content_body && item.content_body.startsWith('{')) {
      return JSON.parse(item.content_body);
    }
  } catch (e) {}
  return {};
};

// 콘텐츠 카드 우측 하단 "유형 · 참여인원" 표시용 — 참여인원(crew)이 있으면 그
// 전원(쉼표 구분)을, 없으면 작성자 한 명만 보여준다. 전체 리스트/캘린더 리스트뷰와
// 카드 레이아웃을 통일하며 함께 도입한 헬퍼로, 세 화면 모두 동일한 기준을 쓴다.
const getCrewLabel = (item: any) => {
  const bodyObj = parseBody(item);
  let names: string[] = [];
  if (bodyObj.crew) {
    if (typeof bodyObj.crew === 'string') names = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    else if (Array.isArray(bodyObj.crew)) names = bodyObj.crew;
  }
  return names.length > 0 ? names.join(', ') : item.author_name;
};

interface MobileDashboardProps {
  contents: any[];
  notices: any[];
  deadlines?: any;
  allProfiles?: any[];
  onNavigateToList: () => void;
  // 전체 리스트/캘린더 날짜팝업과 동일한 선택 메커니즘 — 승인 대기 중 항목을 탭하면
  // 그 항목 블록이 그 자리에서 늘어나며 인라인으로 액션 아이콘 3개가 나타난다
  // (더 이상 셸의 공용 플로팅 액션바를 쓰지 않음).
  selectedItem: any;
  onSelectItem: (item: any) => void;
  user?: any;
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  onOpenSubmit: (mode: 'proposal' | 'final', targetItem?: any) => void;
  onOpenComments: (item: any) => void;
  // 프로필 탭이 하단 4탭 캡슐에서 빠지면서, 대신 대시보드 맨 아래 Family site와
  // 순서대로 놓인 이 버튼이 유일한 진입점이 된다(셸의 activeTab을 'profile'로 전환).
  onOpenProfile: () => void;
}

export default function MobileDashboard({ contents, notices, deadlines = {}, allProfiles = [], onNavigateToList, selectedItem, onSelectItem, user, onOpenDetail, onOpenSubmit, onOpenComments, onOpenProfile }: MobileDashboardProps) {
  const supabase = createClient();
  const router = useRouter();
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [lockedToastVisible, setLockedToastVisible] = useState(false);
  useEffect(() => {
    if (!lockedToastVisible) return;
    const t = setTimeout(() => setLockedToastVisible(false), 1800);
    return () => clearTimeout(t);
  }, [lockedToastVisible]);

  // Calculate D-Day Helper
  const calcDDay = (dateStr: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-DAY';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  // Matches the PC dashboard's fallback convention (src/app/(authenticated)/dashboard/page.tsx):
  // an unconfigured deadline shows "미설정", never a fabricated D-day count.
  const proposalDDay = calcDDay(deadlines.proposalDeadline) ?? '미설정';
  const finalDDay = calcDDay(deadlines.finalDeadline) ?? '미설정';
  const proposalTitle = deadlines.proposalTitle || '26-1분기 (5월 콘텐츠)';
  const finalTitle = deadlines.finalTitle || '마감일 없음';

  // Real Database Contents Pending Approvals
  const pendingItems = contents.filter(c => 
    ['pending', 'revision', 'final_submitted', 'final_revision', 'approved'].includes(c.status)
  ).slice(0, 6);

  // Preview Carousel — 다른 단원들의 기획안/아이디어를 구경하며 서로 코멘트를
  // 독려하는 것이 목적이라, 승인 상태와 무관하게 "최근 2주 안에 올라온 콘텐츠의
  // 기획안"을 최신순으로 슬라이드쇼처럼 보여준다(요청 반영 — 예전엔 승인대기
  // 상태 목록을 그대로 재사용하고 있었는데, 그 섹션과 성격이 달라 분리).
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const carouselItems = (() => {
    const recent = contents
      .filter(c => c.created_at && new Date(c.created_at) >= twoWeeksAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return recent.length > 0 ? recent : contents.slice(0, 6);
  })();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const activeCarouselItem = carouselItems.length > 0 ? carouselItems[carouselIndex % carouselItems.length] : null;

  useEffect(() => {
    setCarouselIndex(0);
  }, [carouselItems.length]);

  useEffect(() => {
    if (carouselItems.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(i => (i + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselItems.length]);

  // 이 블록의 목적이 "기획안·아이디어 구경"이라 완성본 여부와 무관하게 항상
  // 기획안 쪽을 미리보기로 연다.
  // peek(중간 미리보기) 단계를 생략하고 탭하면 바로 전체 상세보기로 진입한다(요청 반영).
  const openPreview = (item: any) => onOpenDetail(item, 'proposal');

  // 좌우 스와이프로도 콘텐츠 간 이동 — 자동 순환·점 인디케이터·탭 오픈과 별개로
  // 요청대로 추가. 스와이프로 판정되면 뒤이은 합성 click이 곧장 미리보기를 열지
  // 않도록 suppressNextClick으로 막는다(탭인지 스와이프인지 구분).
  const carouselSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressCarouselClick = useRef(false);
  const handleCarouselSwipeStart = (e: React.PointerEvent) => {
    carouselSwipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleCarouselSwipeEnd = (e: React.PointerEvent) => {
    const start = carouselSwipeStart.current;
    carouselSwipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setCarouselIndex(i => (i - 1 + carouselItems.length) % carouselItems.length);
      else setCarouselIndex(i => (i + 1) % carouselItems.length);
      suppressCarouselClick.current = true;
    }
  };
  const handleCarouselClick = (item: any) => {
    if (suppressCarouselClick.current) { suppressCarouselClick.current = false; return; }
    openPreview(item);
  };

  // 콘텐츠 좋아요 — 댓글 좋아요(MobileCommentsPage)와 동일한 저장 방식으로,
  // content_body에 contentLikes/contentLikedBy를 둔다(기존엔 좋아요를 뒷받침할
  // 실데이터가 없어 버튼 자체를 뺐었는데, 이번 요청으로 실제 토글 기능을 추가).
  const [likeOverrides, setLikeOverrides] = useState<Record<number, { likes: number; likedBy: string[] }>>({});
  const getContentLikeState = (item: any) => {
    const override = likeOverrides[item.id];
    if (override) return override;
    const bodyObj = parseBody(item);
    return { likes: bodyObj.contentLikes || 0, likedBy: bodyObj.contentLikedBy || [] };
  };
  const handleToggleContentLike = (item: any) => {
    const userEmail = user?.email || 'anonymous';
    const current = getContentLikeState(item);
    const hasLiked = current.likedBy.includes(userEmail);
    const newLikedBy = hasLiked ? current.likedBy.filter((e: string) => e !== userEmail) : [...current.likedBy, userEmail];
    const next = { likes: newLikedBy.length, likedBy: newLikedBy };
    setLikeOverrides(prev => ({ ...prev, [item.id]: next }));
    const bodyObj = parseBody(item);
    const updatedBody = { ...bodyObj, contentLikes: next.likes, contentLikedBy: next.likedBy };
    supabase.from('contents').update({ content_body: JSON.stringify(updatedBody) }).eq('id', item.id).then(() => router.refresh());
  };

  const carouselBodyObj = activeCarouselItem ? parseBody(activeCarouselItem) : {};
  const carouselIntent = (activeCarouselItem?.intent || carouselBodyObj.intent || '').replace(/<[^>]*>/g, '').trim();
  const carouselDiscussionCount = Array.isArray(carouselBodyObj.discussions) ? carouselBodyObj.discussions.length : 0;

  return (
    <div className="space-y-4 text-slate-900 select-none">
      {/* 0. Platform Header — 좌측에 연세대 로고+플랫폼명(상세보기의 작성자 표기와
          같은 방식: 작고 굵은 회색 두 줄), 우측에 아이콘 전용 글래스 프로필 버튼.
          이 앱은 Figma 원본에 상단 헤더 자체가 없어(위 주석 참고) 계속 헤더 없이
          왔지만, 요청대로 최소한의 플랫폼 아이덴티티 표시만 여기 추가한다. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {/* 옆에 있던 "연세대학교 미디어센터 / SNS기자단 기획안 대시보드" 텍스트를
              없애고, 그 텍스트가 차지하던 만큼 로고 자체를 키웠다(요청 반영, PC
              사이드바 로고와 동일한 방향). */}
          <img src="/yonsei_media_logo.png" alt="연세대학교 미디어센터" className="h-9 w-auto object-contain flex-shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <MobileThemeToggle />
          <button
            onClick={onOpenProfile}
            aria-label="프로필"
            className="glass-cta w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <svg className="w-4.5 h-4.5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 1. Top D-Day Banner Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Proposal Deadline Card */}
        <div className="bg-slate-100 dark:bg-[#202227] p-3.5 rounded-2xl shadow-xs flex flex-col justify-between border border-slate-200/60 dark:border-white/5">
          <div className="text-[0.65rem] font-bold text-slate-700 dark:text-slate-300 tracking-wide">기획안 마감</div>
          <div className="text-[1.68rem] leading-tight font-black text-slate-900 dark:text-white my-1 tracking-tight">{proposalDDay}</div>
          <div className="text-[0.65rem] font-medium text-slate-600 dark:text-slate-400 truncate">{proposalTitle}</div>
        </div>

        {/* Final Work Deadline Card */}
        <div className="bg-[#002454] dark:bg-[#16181E] p-3.5 rounded-2xl shadow-xs flex flex-col justify-between text-white border border-transparent dark:border-white/10">
          <div className="text-[0.65rem] font-bold text-blue-100 dark:text-slate-300 tracking-wide">완성본 마감</div>
          <div className="text-[1.68rem] leading-tight font-black text-white my-1 tracking-tight">{finalDDay}</div>
          <div className="text-[0.65rem] font-medium text-blue-200/80 dark:text-slate-400 truncate">{finalTitle}</div>
        </div>
      </div>

      {/* 2. 승인 대기 중 Section */}
      <div className="bg-white dark:bg-[#202227] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 border border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-slate-900 dark:text-slate-100">승인 대기 중</span>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-black rounded-full">
              {pendingItems.length}
            </span>
          </div>
          <button onClick={onNavigateToList} className="text-xs font-bold text-slate-400 hover-fine:text-slate-900 dark:hover-fine:text-white">
            전체보기 ›
          </button>
        </div>

        <div className="space-y-2.5">
          {pendingItems.length > 0 ? (
            pendingItems.map((item, idx) => {
              const isFinal = item.status === 'final_submitted' || item.status === 'final_revision' || item.status === 'completed';
              const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
              const hasUnresolvedFeedback = !!(item.feedback_comment && item.feedback_comment.trim() !== '') || (item.status || '').includes('revision');
              const isSelected = selectedItem?.id === item.id;
              let authorEmail = '';
              try { authorEmail = JSON.parse(item.content_body || '{}').authorEmail || ''; } catch {}
              const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;
              const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
              const canManage = isAdminUser || isOwnContent;
              return (
                <div
                  key={item.id || idx}
                  onClick={() => onSelectItem(isSelected ? null : item)}
                  className={`rounded-xl transition-[background-color,box-shadow] cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-white/10 ring-2 ring-slate-800 dark:ring-white/40'
                      : 'bg-slate-50 dark:bg-[#282A30]/70 hover-fine:bg-slate-100 dark:hover-fine:bg-[#282A30]'
                  }`}
                >
                  <div className="p-3.5 flex items-center justify-between gap-3 active:scale-[0.99]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                        {getSmallPlatformIcon(item.content_type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`min-w-0 text-sm font-bold truncate leading-snug ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>{item.title}</div>
                          {hasUnresolvedFeedback && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black tracking-wide new-badge-pulse">NEW</span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.content_type || '콘텐츠'} · {getCrewLabel(item)}
                        </div>
                      </div>
                    </div>
                    {!isSelected && isFinal && hasDriveLink && (
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-2xs" title="Google Drive Link">
                        <DriveColorIcon />
                      </div>
                    )}
                  </div>

                  {/* 선택 시 인라인 확장 3버튼 */}
                  {isSelected && (
                    <div
                      className="px-3.5 pb-3.5 pt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onOpenDetail(item, 'proposal')}
                        className="flex-1 h-10 rounded-lg bg-[#FFB800] border border-[#E6A600] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                        title="기획안 상세보기"
                      >
                        <span className="text-lg">📋</span>
                      </button>
                      {isFinal && hasDriveLink ? (
                        <button
                          onClick={() => onOpenDetail(item, 'final')}
                          className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                          title="완성본 상세보기"
                        >
                          <DriveColorIcon />
                        </button>
                      ) : canManage ? (
                        <button
                          onClick={() => onOpenSubmit('final', item)}
                          className="flex-1 h-10 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                          title="완성본 업로드"
                        >
                          <span className="text-lg">📤</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setLockedToastVisible(true)}
                          className="flex-1 h-10 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                          title="완성본이 아직 업로드되지 않았습니다"
                        >
                          <DriveLockedIcon />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenComments(item)}
                        className={`flex-1 h-10 rounded-lg border-2 flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-sm ${
                          hasUnresolvedFeedback ? 'chat-btn-new border-slate-800 dark:border-white/40' : 'bg-white border-slate-300'
                        }`}
                        title="코멘트"
                      >
                        <span className="text-base">💬</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 font-medium">
              현재 대기 중인 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. Preview Carousel */}
      {activeCarouselItem && (() => {
        const likeState = getContentLikeState(activeCarouselItem);
        const isLiked = !!(user?.email && likeState.likedBy.includes(user.email));
        return (
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xs"
          onPointerDown={handleCarouselSwipeStart}
          onPointerUp={handleCarouselSwipeEnd}
        >
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div
              onClick={() => handleCarouselClick(activeCarouselItem)}
              className="relative flex-shrink-0 w-[7.875rem] aspect-[126/202] rounded-xl overflow-hidden bg-gradient-to-br from-[#002454] to-[#003378] flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <span key={activeCarouselItem.id || carouselIndex} className="animate-in fade-in zoom-in-95 duration-300">
                {getTypeIcon(activeCarouselItem.content_type)}
              </span>
            </div>

            {/* Content column */}
            <div
              key={`content-${activeCarouselItem.id || carouselIndex}`}
              onClick={() => handleCarouselClick(activeCarouselItem)}
              className="min-w-0 flex-1 space-y-1.5 cursor-pointer animate-in fade-in duration-300"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[#002454] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                    {activeCarouselItem.author_name ? activeCarouselItem.author_name.replace(/^\d+기\s*/, '').slice(0, 1) : '기'}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeCarouselItem.author_name}</div>
                    <div className="text-[0.65rem] text-slate-500 dark:text-slate-400 truncate">{activeCarouselItem.team || 'SNS 기자단'}</div>
                  </div>
                </div>
                <span className="text-slate-300 dark:text-slate-600 text-xs flex-shrink-0">›</span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                {activeCarouselItem.title}
              </div>
              {activeCarouselItem.keywords && (
                <div className="text-[0.65rem] text-slate-500 dark:text-slate-400 truncate">
                  {String(activeCarouselItem.keywords).split(',').slice(0, 3).map((k: string) => `#${k.trim()}`).join(' ')}
                </div>
              )}
              {carouselIntent && (
                <div className="text-[0.65rem] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                  {carouselIntent}
                </div>
              )}
            </div>
          </div>

          {/* 좋아요 / 채팅방 */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleContentLike(activeCarouselItem); }}
              className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors active:scale-95 ${
                isLiked
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-[#002454] dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${isLiked ? 'text-[#002454] dark:text-blue-300' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none">
                <path d="M2 10h4v11H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M6 10l3.5-7a2 2 0 0 1 2-1v0a2 2 0 0 1 2 2.3L12.5 8H20a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 20H6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              {likeState.likes}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenComments(activeCarouselItem); }}
              className="flex-1 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#002454] dark:text-blue-300 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
            >
              💬 {carouselDiscussionCount}
            </button>
          </div>

          {carouselItems.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2.5">
              {carouselItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`h-1.5 rounded-full transition-[width,background-color] ${i === carouselIndex ? 'w-4' : 'w-1.5'}`}
                  style={{ backgroundColor: i === carouselIndex ? 'var(--m-blue-text-strong, #002454)' : 'var(--m-text-faint, #cbd5e1)' }}
                />
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* 4. 공지사항 Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-black text-base text-slate-900">공지사항</span>
          <button onClick={() => setShowAllNotices(true)} className="text-xs font-extrabold text-slate-400 hover-fine:text-blue-600">
            전체보기 ›
          </button>
        </div>

        <div className="space-y-2">
          {notices && notices.length > 0 ? (
            notices.slice(0, 4).map((notice, idx) => (
              <div key={notice.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded flex-shrink-0">
                    공지
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{notice.title}</span>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                  {notice.created_at ? notice.created_at.split('T')[0] : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </div>

      {/* Family site / 프로필 — 프로필 탭이 하단 4탭 캡슐에서 빠지면서(요청 반영),
          두 진입점을 대시보드 맨 아래에 순서대로 옮겨왔다. Family site 3개 링크는
          PC 사이드바(src/app/(authenticated)/layout.tsx)의 FAMILY SITES 블록과
          동일한 URL을 그대로 쓴다. */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-2">
        <div className="text-xs font-extrabold text-slate-400 px-2 py-1">FAMILY SITES 바로가기</div>
        <a
          href="https://ymcrental.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3.5 rounded-xl hover-fine:bg-slate-50 text-sm font-bold text-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🎥</span>
            <span>미디어센터 장비대여 시스템</span>
          </div>
          <span className="text-slate-400 font-bold">›</span>
        </a>
        <a
          href="https://www.youtube.com/@ysuniversity"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3.5 rounded-xl hover-fine:bg-slate-50 text-sm font-bold text-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">▶️</span>
            <span>연세대학교 공식 유튜브</span>
          </div>
          <span className="text-slate-400 font-bold">›</span>
        </a>
        <a
          href="https://www.instagram.com/yonsei_official/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3.5 rounded-xl hover-fine:bg-slate-50 text-sm font-bold text-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">📷</span>
            <span>연세대학교 공식 인스타그램</span>
          </div>
          <span className="text-slate-400 font-bold">›</span>
        </a>
      </div>

      {/* PC뷰로 전환 — 예전엔 이 자리에 프로필 정보 카드(아바타·이름·소속·권한)가
          있었는데, 프로필은 이제 최상단 헤더의 프로필 버튼으로 들어가므로 이
          자리는 중복이라 없애고 PC 데스크톱 화면 전환 버튼으로 바꿨다(전체
          프로필 화면의 것과 동일한 전환 방식). */}
      <button
        onClick={() => {
          localStorage.setItem('pref_view_mode', 'desktop');
          window.location.href = '/dashboard';
        }}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm font-bold text-slate-700 shadow-xs active:scale-[0.99] transition-transform cursor-pointer"
      >
        <span>💻</span>
        <span>PC 데스크톱 화면으로 전환</span>
      </button>

      {/* Full Notices List Overlay — mobile has no dedicated notices tab, so
          "전체보기" opens an in-shell sheet instead of leaving to the PC /notices route */}
      {showAllNotices && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center" onClick={() => setShowAllNotices(false)}>
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-3 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">공지사항 전체보기</h3>
              <button onClick={() => setShowAllNotices(false)} aria-label="닫기" className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2">
              {notices && notices.length > 0 ? (
                notices.map((notice, idx) => (
                  <div key={notice.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded shrink-0">공지</span>
                      <span className="text-sm font-semibold text-slate-800 truncate">{notice.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {notice.created_at ? notice.created_at.split('T')[0] : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">등록된 공지사항이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {lockedToastVisible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-8">
          <div className="bg-black/85 text-white text-sm font-bold px-5 py-3 rounded-2xl text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            완성본이 아직 업로드되지 않았습니다
          </div>
        </div>
      )}
    </div>
  );
}
