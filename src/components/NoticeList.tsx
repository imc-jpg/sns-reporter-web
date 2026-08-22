'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface NoticeItem {
  id: string;
  title: string;
  date: string;
  category: string;
  isImportant: boolean;
  content_body?: string;
}

const DEFAULT_NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    title: '[필독] 기획안 작성 시 주의사항',
    date: '2026-05-20',
    category: '미디어센터',
    isImportant: true
  },
  {
    id: 'notice-2',
    title: '캠퍼스 내 드론 촬영 관련 제한구역 안내',
    date: '2026-05-18',
    category: '미디어센터',
    isImportant: false
  },
  {
    id: 'notice-3',
    title: '상반기 우수 기자단 시상식 일정',
    date: '2026-05-12',
    category: '단장단',
    isImportant: false
  },
  {
    id: 'notice-4',
    title: '(신입부원 필독) 교내 주요 행사 프레스증 발급 신청 안내',
    date: '2026-05-08',
    category: '단장단',
    isImportant: false
  }
];

export default function NoticeList({ dbNotices = [] }: { dbNotices?: any[] }) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const noticeMouseDownOnBackdrop = useRef(false);

  // Load read notice IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('read_notices');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load read notices', e);
    }
  }, []);

  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const newRead = [...readIds, id];
    setReadIds(newRead);
    try {
      localStorage.setItem('read_notices', JSON.stringify(newRead));
    } catch (e) {
      console.error('Failed to save read notice', e);
    }
  };

  // Merge database notices if any exist, otherwise use defaults
  const notices: NoticeItem[] = dbNotices.map((n, idx) => ({
        id: n.id || `db-${idx}`,
        title: n.title,
        date: n.created_at ? n.created_at.split('T')[0] : '2026-05-20',
        category: n.team || n.author_name || '공지사항',
        content_body: n.content_body,
        isImportant: n.status === 'IMPORTANT'
      }));

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case '미디어센터': return { bg: '#E2E8F0', text: '#475569' };
      case '단장단': return { bg: '#E6EBF2', text: '#003378' };
      default: return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <div className="card motion-card" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      padding: '1.5rem',
      borderRadius: '24px',
      height: '400px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>공지사항</h3>
        <Link href="/notices" className="motion-btn" style={{ fontSize: '0.8rem', color: '#002454', textDecoration: 'none', fontWeight: 800 }}>
          전체보기 →
        </Link>
      </div>

      {/* List container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', flex: 1 }}>
        {notices.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>등록된 공지사항이 없습니다.</span>
          </div>
        ) : notices.map(notice => {
          const isUnread = !readIds.includes(notice.id);
          const catColors = getCategoryColor(notice.category);
          
          return (
            <div 
              key={notice.id} 
              style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
              onClick={() => { markAsRead(notice.id); setSelectedNotice(notice); }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '16px', 
                  backgroundColor: isUnread ? 'rgba(254, 243, 199, 0.9)' : 'rgba(255, 255, 255, 0.7)', 
                  boxShadow: isUnread ? '0 4px 14px rgba(253, 230, 138, 0.2)' : '0 2px 8px rgba(0, 36, 84, 0.03)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  position: 'relative'
                }}
                className="motion-row motion-btn"
              >
                {/* Category badge */}
                <span style={{ 
                  background: isUnread ? '#FCD34D' : catColors.bg, 
                  color: isUnread ? '#78350F' : catColors.text, 
                  borderRadius: '8px', 
                  padding: '3px 8px', 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  whiteSpace: 'nowrap', 
                  flexShrink: 0 
                }}>
                  {notice.category}
                </span>

                {/* Notice Title */}
                <span style={{ 
                  fontSize: '0.88rem', 
                  fontWeight: isUnread ? 800 : 600, 
                  color: isUnread ? '#78350F' : '#0F172A', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap', 
                  flex: 1
                }}>
                  {notice.title}
                </span>

                {/* Unread Exclamation Mark or Date */}
                {isUnread ? (
                  <div className="animate-pulse-subtle" style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                  }}>
                    !
                  </div>
                ) : (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: '#94A3B8', 
                    whiteSpace: 'nowrap', 
                    flexShrink: 0, 
                    fontWeight: 500
                  }}>
                    {notice.date}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedNotice && (
        <div 
          className="animate-backdrop"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} 
          onMouseDown={(e) => {
            noticeMouseDownOnBackdrop.current = (e.target === e.currentTarget);
          }}
          onClick={(e) => {
            if (noticeMouseDownOnBackdrop.current && e.target === e.currentTarget) {
              setSelectedNotice(null);
            }
            noticeMouseDownOnBackdrop.current = false;
          }}
        >
          <div className="animate-scale-in" style={{ backgroundColor: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 60px rgba(0, 36, 84, 0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', backgroundColor: '#EAF2FF', color: '#002454' }}>
                  {selectedNotice.category}
                </span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 850, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>{selectedNotice.title}</h2>
              </div>
              <button onClick={() => setSelectedNotice(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94A3B8', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} className="motion-btn hover:bg-slate-100">&times;</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1.25rem', fontWeight: 600 }}>
              <span>작성일: {selectedNotice.date}</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', padding: '1.25rem', backgroundColor: 'rgba(248, 250, 252, 0.85)', borderRadius: '16px' }}>
              {selectedNotice.content_body || '내용이 없습니다.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
