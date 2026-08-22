'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ModalLink from '@/components/ModalLink';

interface DeadlineItem {
  id: number;
  title: string;
  deadline: string; // YYYY-MM-DD
  team?: string;
  content_type?: string;
}

interface FinalDeadlineCarouselProps {
  items: DeadlineItem[];
  globalFinalDeadline?: string | null;
  globalFinalLabel?: string | null;
  globalFinalSubLabel?: string | null;
}

export default function FinalDeadlineCarousel({ items, globalFinalDeadline, globalFinalLabel, globalFinalSubLabel }: FinalDeadlineCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const calcDDay = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const formatDDay = (d: number) => {
    if (d === 0) return 'D-Day';
    if (d < 0) return `D+${Math.abs(d)}`;
    return `D-${d}`;
  };

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  // If no individual deadlines, show global deadline
  if (items.length === 0) {
    const gDay = globalFinalDeadline ? calcDDay(globalFinalDeadline) : null;
    return (
      <div 
        className="motion-card final-card-bg"
        style={{ 
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px', 
          padding: '1.25rem 1.5rem', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
            {globalFinalLabel || '완성본 마감'}
          </span>
          {globalFinalDeadline && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
              {globalFinalDeadline}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--color-text-heading)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
            {gDay !== null ? formatDDay(gDay) : '미설정'}
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
            {globalFinalSubLabel || '마감일 없음'}
          </span>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const dDay = calcDDay(currentItem.deadline);
  const dDayColor = dDay <= 0 ? '#EF4444' : dDay <= 3 ? '#D97706' : 'var(--color-text-heading)';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = showAll && mounted ? createPortal(
    <div className="animate-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={() => setShowAll(false)} />
      <div className="animate-scale-in card" style={{ position: 'relative', backgroundColor: 'var(--color-card-bg)', borderRadius: '24px', padding: '1.5rem', width: '90%', maxWidth: '420px', boxShadow: '0 25px 60px rgba(0, 36, 84, 0.25)', zIndex: 10000 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          전체 마감일
          <button onClick={() => setShowAll(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {items
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .map((item) => {
              const d = calcDDay(item.deadline);
              const itemColor = d <= 0 ? '#ef4444' : d <= 3 ? '#f59e0b' : '#3b82f6';
              return (
                <ModalLink key={item.id} href={`/final-works/submit?id=${item.id}`} style={{ display: 'block', textDecoration: 'none', padding: '1.2rem', borderRadius: '14px', backgroundColor: 'var(--color-surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onClick={() => setShowAll(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '65%' }}>
                      <div style={{ color: 'var(--color-text-main)', fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      {(item.team || item.content_type) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.team} {item.team && item.content_type ? '·' : ''} {item.content_type}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.1rem' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.deadline}
                      </span>
                      <span style={{ color: itemColor, fontSize: '0.85rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        {formatDDay(d)}
                      </span>
                    </div>
                  </div>
                </ModalLink>
              );
            })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div 
      className="motion-card final-card-bg"
      style={{ 
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '24px', 
        padding: '1.25rem 1.5rem', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
          완성본 마감
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
          {currentItem.deadline}
        </span>
      </div>

      {/* D-Day Number + Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ 
          color: dDayColor, 
          fontSize: '2.4rem', 
          fontWeight: 800, 
          letterSpacing: '-1.5px', 
          lineHeight: '1.1',
          transition: 'color 0.3s ease'
        }}>
          {formatDDay(dDay)}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '55%' }}>
          <span style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.72rem',
            fontWeight: 600, 
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            display: 'block',
            textAlign: 'right'
          }}>
            {currentItem.title}
          </span>
          
          {/* Progress dots indicator */}
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {items.map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: idx === currentIndex ? '14px' : '5px',
                    height: '5px',
                    borderRadius: '3px',
                    backgroundColor: idx === currentIndex ? '#002454' : 'rgba(0, 36, 84, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "전체 보기" modal button */}
      <button
        onClick={() => setShowAll(true)}
        style={{
          marginTop: '8px',
          background: 'rgba(0, 36, 84, 0.08)',
          border: 'none',
          borderRadius: '8px',
          color: '#002454',
          fontSize: '0.68rem',
          fontWeight: 600,
          padding: '5px 10px',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 36, 84, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 36, 84, 0.08)';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        전체 마감일 ({items.length}건)
      </button>

      {/* Modal Popup for all deadlines list */}
      {modalContent}
    </div>
  );
}
