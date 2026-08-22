'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FeedbackBanner({ feedbacks }: { feedbacks: any[] }) {
  const [visibleItems, setVisibleItems] = useState<any[]>([]);

  useEffect(() => {
    // Only show feedbacks that haven't been dismissed for their current status
    const dismissed = JSON.parse(localStorage.getItem('dismissedFeedbacks') || '[]');
    const toShow = feedbacks.filter(f => !dismissed.includes(`${f.id}_${f.status}`));
    setVisibleItems(toShow);
  }, [feedbacks]);

  const dismiss = (id: string, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    const key = `${id}_${status}`;
    const dismissed = JSON.parse(localStorage.getItem('dismissedFeedbacks') || '[]');
    if (!dismissed.includes(key)) {
      dismissed.push(key);
    }
    localStorage.setItem('dismissedFeedbacks', JSON.stringify(dismissed));
    setVisibleItems(prev => prev.filter(f => f.id !== id));
  };

  if (visibleItems.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {visibleItems.map(item => (
        <Link 
          key={item.id} 
          href={`/${item.status.includes('final') ? 'final-works' : 'proposals'}/submit?id=${item.id}`}
          style={{ 
            textDecoration: 'none', 
            background: 'linear-gradient(to right, rgba(255, 251, 235, 0.95), rgba(254, 243, 199, 0.9))', 
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '18px', 
            padding: '0.9rem 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)'
          }}
          className="motion-row motion-btn"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ background: '#F59E0B', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', flexShrink: 0, boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)' }}>
              !
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#92400E', letterSpacing: '-0.01em', marginBottom: '0.15rem' }}>
                새로운 피드백이 도착했습니다: <span style={{ color: '#78350F' }}>{item.title}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#B45309', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                {item.feedback_comment || '수정 요청이 등록되었습니다. 확인해주세요.'}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => dismiss(item.id, item.status, e)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#B45309', 
              fontSize: '1.3rem', 
              padding: '0.35rem', 
              lineHeight: 1,
              flexShrink: 0 
            }}
            className="motion-scale"
            aria-label="닫기"
          >
            &times;
          </button>
        </Link>
      ))}
    </div>
  );
}
