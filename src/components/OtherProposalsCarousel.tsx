'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useModal } from '@/contexts/ModalContext';
import { createClient } from '@/utils/supabase/client';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';

interface ProposalItem {
  id: string | number;
  rawItem: any;
  author_name: string;
  generation: string;
  role: string;
  team: string;
  title: string;
  content_type: string;
  hashtags: string[];
  intent: string;
  body: string;
  likes: number;
  likedBy: string[];
  commentsCount: number;
  discussions: any[];
}

const getPlatformIcon = (team: string) => {
  if (team === '유튜브') return <YoutubeIcon className="w-3.5 h-3.5" />;
  if (team === '인스타') return <InstagramIcon className="w-3.5 h-3.5" />;
  if (team === '블로그') return <NaverBlogIcon className="w-3.5 h-3.5" />;
  return <GenericPostIcon className="w-3.5 h-3.5" />;
};

export default function OtherProposalsCarousel({ dbProposals = [] }: { dbProposals?: any[] }) {
  const supabase = createClient();
  const { openContentModal } = useModal();
  const [user, setUser] = useState<any>(null);
  const [likeOverrides, setLikeOverrides] = useState<Record<string | number, { likes: number; likedBy: string[] }>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
    });
  }, [supabase]);

  // Filter recent proposals (recent 2 weeks or fallback to latest)
  const formattedProposals: ProposalItem[] = useMemo(() => {
    if (!dbProposals || dbProposals.length === 0) return [];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recent = dbProposals
      .filter(c => c.created_at && new Date(c.created_at) >= twoWeeksAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const targetList = recent.length > 0 ? recent : [...dbProposals].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return targetList.slice(0, 10).map(p => {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(p.content_body || '{}');
      } catch {}

      const rawIntent = p.intent || bodyObj.intent || bodyObj.composition || bodyObj.summary || bodyObj.description || p.description || '';
      const intentText = rawIntent.replace(/<[^>]*>/g, '').trim();
      let bodyText = (bodyObj.contentBody || bodyObj.composition || bodyObj.summary || bodyObj.description || bodyObj.goal || p.description || p.title || '').replace(/<[^>]*>/g, '').trim();

      let hashtags: string[] = ['연세대학교'];
      if (bodyObj.keywords) {
        hashtags = typeof bodyObj.keywords === 'string'
          ? bodyObj.keywords.split(/[,\s]+/).map((k: string) => k.trim()).filter(Boolean)
          : Array.isArray(bodyObj.keywords) ? bodyObj.keywords : hashtags;
      }

      const discussions: any[] = (bodyObj.discussions || []).filter((d: any) => !d.isSecret);
      const commentsCount = discussions.length;

      // Like state shared with mobile (contentLikes & contentLikedBy)
      const storedLikes = typeof bodyObj.contentLikes === 'number' ? bodyObj.contentLikes : (typeof bodyObj.likes === 'number' ? bodyObj.likes : 0);
      const storedLikedBy = Array.isArray(bodyObj.contentLikedBy) ? bodyObj.contentLikedBy : [];

      return {
        id: p.id,
        rawItem: p,
        author_name: p.author_name || '기자',
        generation: p.keywords ? `${p.keywords}기` : '기자단',
        role: p.team ? `${p.team} 팀원` : '기자',
        team: p.team || '팀없음',
        title: p.title || '제목 없음',
        content_type: p.content_type || '기획안',
        hashtags: hashtags.filter(Boolean),
        intent: intentText || '기획 의도가 등록되지 않았습니다.',
        body: bodyText,
        likes: storedLikes,
        likedBy: storedLikedBy,
        commentsCount,
        discussions
      };
    });
  }, [dbProposals]);

  // Auto rotation timer (4.5s)
  useEffect(() => {
    if (formattedProposals.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % formattedProposals.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [formattedProposals.length, isHovered]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? formattedProposals.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === formattedProposals.length - 1 ? 0 : prev + 1));
  };

  // Toggle Like (Synchronized with Mobile)
  const toggleLike = async (e: React.MouseEvent, item: ProposalItem) => {
    e.preventDefault();
    e.stopPropagation();
    const userEmail = user?.email || 'anonymous';
    const override = likeOverrides[item.id];
    const currentLikes = override ? override.likes : item.likes;
    const currentLikedBy = override ? override.likedBy : item.likedBy;

    const hasLiked = currentLikedBy.includes(userEmail);
    const newLikedBy = hasLiked
      ? currentLikedBy.filter((em: string) => em !== userEmail)
      : [...currentLikedBy, userEmail];
    const newLikes = newLikedBy.length;

    setLikeOverrides(prev => ({
      ...prev,
      [item.id]: { likes: newLikes, likedBy: newLikedBy }
    }));

    try {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(item.rawItem.content_body || '{}');
      } catch {}

      const updatedBody = {
        ...bodyObj,
        contentLikes: newLikes,
        contentLikedBy: newLikedBy,
        likes: newLikes
      };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', item.id);

      if (error) throw error;

      item.rawItem.content_body = JSON.stringify(updatedBody);
    } catch (err) {
      console.error('Like toggle failed', err);
      setLikeOverrides(prev => ({
        ...prev,
        [item.id]: { likes: currentLikes, likedBy: currentLikedBy }
      }));
    }
  };

  if (formattedProposals.length === 0) {
    return (
      <div className="card bg-white rounded-2xl p-6 shadow-2xs border border-slate-200 flex flex-col justify-between h-[380px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900 m-0">다른 사람들의 기획안</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/70 rounded-xl my-3">
          <span className="text-2xl mb-1.5">📝</span>
          <span className="text-sm font-semibold text-slate-500">아직 등록된 기획안이 없습니다.</span>
          <span className="text-xs text-slate-600 mt-1">새로운 기획안을 등록하고 단원들과 공유해보세요!</span>
        </div>
      </div>
    );
  }

  const currentItem = formattedProposals[currentIndex % formattedProposals.length];
  const currentOverride = likeOverrides[currentItem.id];
  const currentLikes = currentOverride ? currentOverride.likes : currentItem.likes;
  const currentLikedBy = currentOverride ? currentOverride.likedBy : currentItem.likedBy;
  const isLiked = !!(user?.email && currentLikedBy.includes(user.email));

  return (
    <div
      className="card motion-card rounded-2xl p-5 flex flex-col h-[380px] bg-white/30 backdrop-blur-md border border-white/50 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header: Title & Carousel Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight m-0 flex items-center gap-2">
            다른 사람들의 기획안
          </h3>
          <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
            {currentIndex + 1} / {formattedProposals.length}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-600 flex items-center justify-center text-xs font-bold motion-btn motion-scale cursor-pointer shadow-2xs"
            title="이전 기획안"
          >
            ‹
          </button>
          <button
            onClick={handleNext}
            className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-600 flex items-center justify-center text-xs font-bold motion-btn motion-scale cursor-pointer shadow-2xs"
            title="다음 기획안"
          >
            ›
          </button>
        </div>
      </div>

      {/* 2-Column Main Body */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 mt-2 overflow-hidden min-h-0">
        {/* Left Column: Proposal Meta & Full Intent */}
        <div
          onClick={() => openContentModal(currentItem.id.toString())}
          className="md:col-span-6 flex flex-col justify-between cursor-pointer group min-h-0"
        >
          <div className="flex flex-col gap-2 min-w-0 flex-1 overflow-hidden">
            {/* Author / Platform Row */}
            <div className="flex items-center justify-between gap-1.5 text-xs flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-white/90 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  {getPlatformIcon(currentItem.team)}
                </div>
                <span className="font-bold text-slate-800 truncate">
                  {currentItem.author_name}
                </span>
                <span className="text-slate-600 text-[11px] font-medium">
                  {currentItem.team}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-md flex-shrink-0 shadow-2xs">
                {currentItem.content_type}
              </span>
            </div>

            {/* Title */}
            <h4 className="m-0 text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-900 transition-colors flex-shrink-0">
              {currentItem.title}
            </h4>

            {/* Keywords */}
            {currentItem.hashtags.length > 0 && (
              <div className="flex gap-1 flex-wrap flex-shrink-0">
                {currentItem.hashtags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10.5px] font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded shadow-2xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Intent Block: Fully visible, clean scrollable box */}
            <div className="flex-1 overflow-y-auto bg-white/70 backdrop-blur-sm p-3 rounded-xl text-xs text-slate-700 leading-relaxed min-h-[75px] shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <span>💡 기획 의도</span>
              </div>
              <p className="m-0 whitespace-pre-wrap break-words text-[11.5px] text-slate-600">
                {currentItem.intent}
              </p>
            </div>
          </div>

          {/* Action Row: Like & Comment Button */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 mt-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => toggleLike(e, currentItem)}
              className={`motion-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shadow-2xs ${
                isLiked
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-white/90 backdrop-blur-sm text-slate-600 hover:bg-white'
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span>추천 {currentLikes}</span>
            </button>

            <button
              onClick={() => openContentModal(currentItem.id.toString())}
              className="motion-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-bold cursor-pointer shadow-2xs"
            >
              <span>💬</span>
              <span>댓글 {currentItem.commentsCount}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Discussions & Reaction Feed */}
        <div className="md:col-span-6 flex flex-col justify-between border-l border-slate-200/50 pl-4 overflow-hidden">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between mb-2">
            <span>💬 기획안 피드백 및 반응</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
              {currentItem.discussions.length}개
            </span>
          </div>

          {/* Discussions List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[190px]">
            {currentItem.discussions.length === 0 ? (
              <div
                onClick={() => openContentModal(currentItem.id.toString())}
                className="motion-btn h-full flex flex-col items-center justify-center text-center p-4 bg-white/50 backdrop-blur-xs rounded-xl cursor-pointer hover:bg-white/70"
              >
                <span className="text-lg mb-1">👀</span>
                <span className="text-xs font-semibold text-slate-600">아직 남겨진 피드백이 없습니다.</span>
                <span className="text-[11px] text-slate-500 mt-0.5">가장 먼저 피드백과 코멘트를 남겨보세요!</span>
              </div>
            ) : (
              currentItem.discussions.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => openContentModal(currentItem.id.toString())}
                  className="motion-row bg-white/70 hover:bg-white/95 backdrop-blur-xs p-2.5 rounded-xl cursor-pointer text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-800 truncate">
                      {msg.author || '단원'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <p className="m-0 text-slate-600 line-clamp-2 leading-relaxed text-[11.5px]">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div style={{ marginTop: '0.75rem' }}>
             <button 
                onClick={() => openContentModal(currentItem.id.toString())}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1E40AF', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
             >
                직접 댓글 남기러 가기 →
             </button>
          </div>
        </div>
      </div>
      </div>
  );
}
