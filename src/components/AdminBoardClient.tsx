'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ContentsLayout from './ContentsLayout';
import DashboardCalendarArea from './DashboardCalendarArea';
import { useModal } from '@/contexts/ModalContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';
import { formatKoreanDate, calculateDday } from '@/utils/dateUtils';

// ────────── Helper Types & Utilities ──────────

const formatCleanCrewName = (name: string) => {
  if (!name) return '';
  return name.replace(/\([^)]*\)/g, '').trim();
};

const getTypeStyle = (typeStr: string, team?: string) => {
  let label = typeStr || '기타';
  if (typeStr === '영상(롱폼)') label = '롱폼';
  else if (typeStr === '영상(숏폼)') label = '숏폼';
  else if (typeStr === '글 기사') label = '기사';

  // 모바일 로고 색상 체계와 일치 (유튜브: 레드, 인스타: 노랑/앰버 #FCAF45, 블로그: 그린 #03C75A, 단장팀: 블루)
  switch(team) {
    case '유튜브': 
      return { bg: '#FEE2E2', text: '#DC2626', label };
    case '인스타': 
      return { bg: '#FEF3C7', text: '#D97706', label };
    case '블로그': 
      return { bg: '#DCFCE7', text: '#15803D', label };
    case '단장 팀':
    case '단장단 팀': 
      return { bg: '#EFF6FF', text: '#1D4ED8', label };
    default: 
      return { bg: '#F1F5F9', text: '#475569', label };
  }
};

const getPlatformStyle = (team: string) => {
  if (team === '유튜브') {
    return {
      icon: <YoutubeIcon className="w-3.5 h-3.5 flex-shrink-0" />,
      label: '유튜브'
    };
  }
  if (team === '인스타') {
    return {
      icon: <InstagramIcon className="w-3.5 h-3.5 flex-shrink-0" />,
      label: '인스타'
    };
  }
  if (team === '블로그') {
    return {
      icon: <NaverBlogIcon className="w-3.5 h-3.5 flex-shrink-0" />,
      label: '블로그'
    };
  }
  return {
    icon: <GenericPostIcon className="w-3.5 h-3.5 flex-shrink-0" />,
    label: team || '단장 팀'
  };
};

const getTeamFilterStyle = (_team: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-white/5';
  }
  return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs';
};

const getTypeFilterStyle = (_type: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-white/5';
  }
  return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs';
};

const getUrgencyFilterStyle = (_urgencyKey: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-white/5';
  }
  return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs';
};

const getItemTriggerInfo = (item: any) => {
  let bodyObj: any = {};
  try {
    bodyObj = JSON.parse(item.content_body || '{}');
  } catch {}

  const discussions: any[] = bodyObj.discussions || [];
  const lastComment = discussions.length > 0 ? discussions[discussions.length - 1] : null;

  if (item.status === 'pending') {
    if (discussions.length > 0 && lastComment?.role === 'writer') {
      return { text: `단원 댓글: "${lastComment.text}"`, isAction: true };
    }
    return { text: '최초 제출된 기획안', isAction: true };
  }

  if (item.status === 'review_required') {
    if (lastComment?.role === 'writer') {
      return { text: `단원 댓글: "${lastComment.text}"`, isAction: true };
    }
    return { text: '단원이 내용 수정함 (재검토 필요)', isAction: true };
  }

  if (item.status === 'revision') {
    if (lastComment?.role === 'admin') {
      return { text: `피드백 전달됨: "${lastComment.text}"`, isAction: false };
    }
    return { text: '기획안 수정 대기 중', isAction: false };
  }

  if (item.status === 'approved') {
    return { text: '기획안 승인 완료 · 완성본 제작 중', isAction: false };
  }

  if (item.status === 'final_submitted') {
    return { text: '완성본 제출됨 (최종 검토 필요)', isAction: true };
  }

  if (item.status === 'final_revision') {
    if (lastComment?.role === 'admin') {
      return { text: `완성본 피드백: "${lastComment.text}"`, isAction: false };
    }
    return { text: '완성본 수정 대기 중', isAction: false };
  }

  if (item.status === 'completed') {
    const desiredDate = bodyObj.desiredDate;
    return {
      text: desiredDate ? `희망 업로드일: ${desiredDate}` : '완성본 승인됨 (업로드 대기)',
      isAction: true
    };
  }

  if (item.status === 'uploaded') {
    const uploadedDate = item.updated_at ? formatKoreanDate(item.updated_at, false) : '';
    return {
      text: `업로드 완료 ${uploadedDate ? `(${uploadedDate})` : ''}`,
      isAction: false
    };
  }

  if (item.status === 'rejected') {
    return { text: '반려된 콘텐츠', isAction: false };
  }

  return { text: '상태 대기 중', isAction: false };
};

// ────────── Main Component ──────────

export default function AdminBoardClient({
  contents: initialContents = [],
  allProfiles = []
}: {
  contents: any[];
  allProfiles?: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { openContentModal } = useModal();

  const [contentsList, setContentsList] = useState<any[]>(initialContents);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent_deadline' | 'unresolved_feedback'>('all');
  const [showRejected, setShowRejected] = useState<boolean>(false);
  const [showOnly7DaysCompleted, setShowOnly7DaysCompleted] = useState<boolean>(true);
  const [showFullTable, setShowFullTable] = useState<boolean>(false);

  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any } | null>(null);

  useEffect(() => {
    setContentsList(initialContents);
  }, [initialContents]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const toggleColumnCollapse = (colId: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const updateStatus = async (item: any, newStatus: string) => {
    if (!item || item.status === newStatus) return;

    setContentsList(prev =>
      prev.map(c => (c.id === item.id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c))
    );

    const { error } = await supabase
      .from('contents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      alert('상태 변경 실패: ' + error.message);
      setContentsList(initialContents);
    } else {
      router.refresh();
    }
  };

  const formatCrewWithGeneration = (name: string) => {
    if (!name) return '';
    const clean = formatCleanCrewName(name);
    if (/^\d+기\s+/.test(clean)) return clean;
    if (/^\d+\s+/.test(clean)) return clean.replace(/^(\d+)\s+/, '$1기 ');
    const pureName = clean.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === pureName || p.author_name === clean);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${pureName}`;
    }
    return pureName;
  };

  const filteredContents = useMemo(() => {
    return contentsList.filter(item => {
      if (!showRejected && item.status === 'rejected') return false;
      if (selectedTeam !== 'all') {
        if (!item.team || !item.team.includes(selectedTeam)) return false;
      }
      if (selectedType !== 'all') {
        if (item.content_type !== selectedType) return false;
      }
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(item.content_body || '{}');
      } catch {}
      const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.deadline;
      const dDay = targetDate ? calculateDday(targetDate) : null;
      const discussions: any[] = bodyObj.discussions || [];
      if (urgencyFilter === 'urgent_deadline') {
        if (dDay === null || dDay > 3 || item.status === 'uploaded' || item.status === 'rejected') return false;
      }
      if (urgencyFilter === 'unresolved_feedback') {
        const hasWriterFeedback = discussions.length > 0 && discussions[discussions.length - 1]?.role === 'writer';
        const isRevisionStatus = (item.status || '').includes('revision');
        if (!hasWriterFeedback && !isRevisionStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const authorMatch = item.author_name?.toLowerCase().includes(q);
        const teamMatch = item.team?.toLowerCase().includes(q);
        const crewMatch = bodyObj.crew?.toLowerCase().includes(q);
        if (!titleMatch && !authorMatch && !teamMatch && !crewMatch) return false;
      }
      return true;
    });
  }, [contentsList, showRejected, selectedTeam, selectedType, urgencyFilter, searchQuery]);

  const colReviewRequired = useMemo(() => filteredContents.filter(c => ['pending', 'final_submitted', 'review_required'].includes(c.status)), [filteredContents]);
  const colRevisionPending = useMemo(() => filteredContents.filter(c => ['revision', 'final_revision'].includes(c.status)), [filteredContents]);
  const colAwaitingFinal = useMemo(() => filteredContents.filter(c => c.status === 'approved'), [filteredContents]);
  const colNeedsUpload = useMemo(() => filteredContents.filter(c => c.status === 'completed'), [filteredContents]);
  const nowMs = Date.now();
  const colCompleted = useMemo(() => {
    return filteredContents.filter(c => {
      if (c.status !== 'uploaded') return false;
      if (!showOnly7DaysCompleted) return true;
      const itemDate = new Date(c.updated_at || c.created_at).getTime();
      return nowMs - itemDate <= 7 * 24 * 60 * 60 * 1000;
    });
  }, [filteredContents, showOnly7DaysCompleted, nowMs]);
  const colRejected = useMemo(() => filteredContents.filter(c => c.status === 'rejected'), [filteredContents]);

  const KANBAN_COLUMNS = [
    { id: 'review_required', title: '검토 필요', count: colReviewRequired.length, isActionColumn: true, items: colReviewRequired, dropTargetStatus: 'pending' },
    { id: 'revision_pending', title: '수정 대기', count: colRevisionPending.length, isActionColumn: false, items: colRevisionPending, dropTargetStatus: 'revision' },
    { id: 'awaiting_final', title: '완성본 대기', count: colAwaitingFinal.length, isActionColumn: false, items: colAwaitingFinal, dropTargetStatus: 'approved' },
    { id: 'needs_upload', title: '업로드 필요', count: colNeedsUpload.length, isActionColumn: true, items: colNeedsUpload, dropTargetStatus: 'completed' },
    { id: 'completed', title: '완료 (최근 7일)', count: colCompleted.length, isActionColumn: false, items: colCompleted, dropTargetStatus: 'uploaded' }
  ];

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => { e.preventDefault(); if (dragOverColumn !== columnId) setDragOverColumn(columnId); };
  const handleDragLeave = (e: React.DragEvent) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setDragOverColumn(null); };
  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedItemId(null);
    const idStr = e.dataTransfer.getData('text/plain');
    if (!idStr) return;
    const contentId = parseInt(idStr, 10);
    const item = contentsList.find(c => c.id === contentId);
    if (item) updateStatus(item, targetStatus);
  };

  const renderKanbanCard = (item: any) => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
    const triggerInfo = getItemTriggerInfo(item);
    const mainAuthor = item.author_name || '';
    let allCrew = [mainAuthor];
    if (bodyObj.crew && typeof bodyObj.crew === 'string') {
      allCrew = bodyObj.crew.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const mainAuthorNameOnly = formatCleanCrewName(mainAuthor).replace(/^\d+(기)?\s+/, '');
    const others = allCrew.filter(c => {
      const cClean = formatCleanCrewName(c).replace(/^\d+(기)?\s+/, '');
      return cClean !== mainAuthorNameOnly && !mainAuthorNameOnly.includes(cClean);
    });
    const articleType = bodyObj.articleType || item.articleType || '개인기사';
    const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.deadline;
    const dDay = targetDate ? calculateDday(targetDate) : null;
    const isDone = item.status === 'uploaded' || item.status === 'rejected';
    const isDragging = draggedItemId === item.id;
    const typeLabel = item.content_type || '콘텐츠';
    const platformStyle = getPlatformStyle(item.team);

    return (
      <div
        key={item.id}
        draggable
        onDragStart={e => handleDragStart(e, item.id)}
        onDragEnd={() => setDraggedItemId(null)}
        onClick={() => openContentModal(item.id.toString())}
        onContextMenu={e => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, item });
        }}
        className={`group relative rounded-xl bg-white dark:bg-[#282A30] p-3 mb-2.5 transition-[opacity,transform,background-color,box-shadow] duration-150 select-none cursor-pointer flex flex-col gap-2 ${
          isDragging
            ? 'opacity-30 scale-95 shadow-none'
            : 'shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_rgba(0,0,0,0.35)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.09),0_2px_6px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.55)] hover:bg-white dark:hover:bg-[#30333B] hover:-translate-y-0.5'
        }`}
      >
        {/* Top Anchor Row: Standalone Brand Logo + Content Format Chip + D-Day */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            {/* Standalone Brand Visual Anchor */}
            <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-[#202227] flex items-center justify-center flex-shrink-0">
              {platformStyle.icon}
            </div>

        {/* Clean Content Format Chip */}
            <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-[#202227] px-2 py-0.5 rounded-md text-[11px] truncate">
              {typeLabel}
            </span>
          </div>

          {/* D-Day Tag */}
          {!isDone && dDay !== null && (
            <div className="flex-shrink-0 font-bold">
              {dDay < 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                  D+{Math.abs(dDay)} 지연
                </span>
              ) : dDay === 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                  D-Day 오늘
                </span>
              ) : dDay <= 3 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                  D-{dDay} 임박
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                  D-{dDay}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Title: 14px Strong Visual Center */}
        <h4 className="m-0 text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-colors tracking-tight">
          {item.title}
        </h4>

        {/* Author / Crew Meta Line */}
        <div className="text-[12px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {formatCrewWithGeneration(mainAuthor)}
            {others.length > 0 ? `, ${others.map(formatCrewWithGeneration).join(', ')}` : ''}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11.5px]">{articleType}</span>
        </div>

        {/* Status / Trigger Description */}
        <div className="text-[11.5px] font-medium flex items-center gap-1.5 min-w-0 bg-slate-100/90 dark:bg-[#1E2025] text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#002454] dark:text-sky-400 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">{triggerInfo.text}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="card motion-card rounded-2xl p-3.5 sm:p-4 mb-1 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">콘텐츠 현황 관리</h2>
            <div className="flex items-center gap-1.5">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold shadow-2xs">검토 필요 {colReviewRequired.length}</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold shadow-2xs">업로드 필요 {colNeedsUpload.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRejected(!showRejected)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-[color,background-color,border-color,box-shadow] flex items-center gap-1.5 motion-btn ${
                showRejected
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span>🚫</span>
              <span>반려함 ({colRejected.length})</span>
            </button>
            <button
              onClick={() => setShowFullTable(!showFullTable)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-[color,background-color,border-color,box-shadow] flex items-center gap-1.5 motion-btn ${
                showFullTable
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span>📋</span>
              <span>전체 목록</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <input 
              type="text" 
              placeholder="제목, 작성자 검색..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-[#002454] dark:focus:border-[#003378] focus:ring-1 focus:ring-[#002454] dark:focus:ring-[#003378] transition-[border-color,box-shadow] shadow-2xs" 
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold">✕</button>}
          </div>
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-transparent p-1 rounded-lg border border-slate-200 dark:border-transparent">
            {['all', '유튜브', '인스타', '블로그', '단장 팀'].map(team => (
              <button 
                key={team} 
                onClick={() => setSelectedTeam(team)} 
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-[color,background-color,box-shadow] ${getTeamFilterStyle(team, selectedTeam === team)}`}
              >
                {team === 'all' ? '전체 팀' : team}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-transparent p-1 rounded-lg border border-slate-200 dark:border-transparent">
            {['all', '영상(롱폼)', '영상(숏폼)', '카드뉴스', '글 기사'].map(type => (
              <button 
                key={type} 
                onClick={() => setSelectedType(type)} 
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-[color,background-color,box-shadow] ${getTypeFilterStyle(type, selectedType === type)}`}
              >
                {type === 'all' ? '전체 유형' : type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-transparent p-1 rounded-lg border border-slate-200 dark:border-transparent">
            <button 
              onClick={() => setUrgencyFilter('all')} 
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-[color,background-color,box-shadow] ${getUrgencyFilterStyle('all', urgencyFilter === 'all')}`}
            >
              전체
            </button>
            <button 
              onClick={() => setUrgencyFilter('urgent_deadline')} 
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-[color,background-color,box-shadow] ${getUrgencyFilterStyle('urgent_deadline', urgencyFilter === 'urgent_deadline')}`}
            >
              마감 임박
            </button>
            <button 
              onClick={() => setUrgencyFilter('unresolved_feedback')} 
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-[color,background-color,box-shadow] ${getUrgencyFilterStyle('unresolved_feedback', urgencyFilter === 'unresolved_feedback')}`}
            >
              피드백 대기
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 overflow-x-auto pb-2 items-start">
        {KANBAN_COLUMNS.map(col => {
          const isOver = dragOverColumn === col.id;
          const isCollapsed = collapsedColumns[col.id];
          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.dropTargetStatus)}
              className={`rounded-2xl p-2.5 transition-[background-color,box-shadow] duration-150 flex flex-col min-w-[250px] ${
                isOver
                  ? 'bg-blue-50/80 dark:bg-blue-950/50 shadow-inner'
                  : 'bg-slate-100/70 dark:bg-[#202227]/60 backdrop-blur-md'
              }`}
              style={{ minHeight: isCollapsed ? 'auto' : '650px' }}
            >
              <div className="bg-white/90 dark:bg-[#282A30]/90 backdrop-blur-sm rounded-xl p-2.5 mb-2 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{col.title}</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#202227] text-slate-700 dark:text-slate-200">{col.count}</span>
                </div>
                <button onClick={() => toggleColumnCollapse(col.id)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 p-0.5 text-xs font-bold transition-colors" title={isCollapsed ? '컬럼 펼치기' : '컬럼 접기'}>{isCollapsed ? '+' : '−'}</button>
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-y-auto pr-0.5 max-h-[780px]">
                  {col.items.length === 0 ? (
                    <div
                      className={`rounded-xl p-8 text-center text-xs font-bold transition-colors ${
                        isOver
                          ? 'bg-blue-100/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                          : 'bg-white/40 dark:bg-[#282A30]/40 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <div className="text-2xl mb-1.5">{isOver ? '📥' : '✨'}</div>
                      <div>{isOver ? '여기에 놓으세요' : '해당 항목 없음'}</div>
                    </div>
                  ) : (
                    col.items.map(item => renderKanbanCard(item))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── REJECTED ITEMS DRAWER ── */}
      {showRejected && colRejected.length > 0 && (
        <div className="bg-red-50/90 dark:bg-red-950/40 rounded-2xl p-4 border border-red-200 dark:border-red-800/80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="m-0 text-sm font-black text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <span>🚫</span> 반려된 콘텐츠 목록 ({colRejected.length})
            </h3>
            <button
              onClick={() => setShowRejected(false)}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {colRejected.map(item => renderKanbanCard(item))}
          </div>
        </div>
      )}

      {/* ── FULL CONTENT TABLE VIEW ── */}
      {showFullTable && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-black text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>📋 전체 콘텐츠 테이블 목록 ({filteredContents.length})</span>
            <button
              onClick={() => setShowFullTable(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          <div className="flex p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300 gap-2.5">
            <div className="w-20">유형</div>
            <div className="flex-2">제목</div>
            <div className="flex-1">팀 / 플랫폼</div>
            <div className="flex-1">작성자</div>
            <div className="w-24 text-center">상태</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {filteredContents.map(item => (
              <div
                key={item.id}
                onClick={() => openContentModal(item.id.toString())}
                className="flex p-3 gap-2.5 items-center cursor-pointer text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="w-20">
                  {(() => {
                    const typeStyle = getTypeStyle(item.content_type, item.team);
                    return (
                      <span 
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold inline-block whitespace-nowrap"
                        style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
                      >
                        {typeStyle.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex-2 font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
                <div className="flex-1 font-medium text-slate-700 dark:text-slate-200">{item.team}</div>
                <div className="flex-1 text-slate-600 dark:text-slate-300 font-medium">
                  {formatCrewWithGeneration(item.author_name)}
                </div>
                <div className="w-24 text-center font-bold text-slate-700 dark:text-slate-300">{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CALENDAR + LIST BIDIRECTIONAL VIEW ── */}
      <div className="mt-2">
        <DashboardCalendarArea
          rawContents={contentsList}
          myContents={contentsList}
          allProfiles={allProfiles}
        />
      </div>

      {/* ── RIGHT-CLICK CONTEXT MENU ── */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 min-w-[180px] flex flex-col gap-0.5 animate-in fade-in duration-100 text-xs font-medium"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
            상태 변경 및 조치
          </div>

          <button
            onClick={() => openContentModal(contextMenu.item.id.toString())}
            className="text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
          >
            상세보기 및 피드백
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-0.5"></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'pending')}
            className="text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            → [검토 필요]로 이동
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'revision')}
            className="text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            → [수정 대기]로 이동
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'approved')}
            className="text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            → [완성본 대기]로 이동
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'completed')}
            className="text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            → [업로드 필요]로 이동
          </button>

          <button
            onClick={() => updateStatus(contextMenu.item, 'uploaded')}
            className="text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            🎉 [최종 완료] 처리
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-0.5"></div>

          <button
            onClick={() => updateStatus(contextMenu.item, 'rejected')}
            className="text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors"
          >
            🚫 [반려] 처리
          </button>
        </div>
      )}

      {/* Modal Integration */}
      {selectedItem && (
        <ContentsLayout
          modalOnly={true}
          openModalId={selectedItem.id}
          onModalClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
