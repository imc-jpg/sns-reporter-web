'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function FeedbackBanner({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const supabase = createClient();

  const handleDismiss = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // UI에서 즉시 제거
    setItems(prev => prev.filter(i => i.id !== id));

    // DB에 읽음 표시 기록 (content_body JSON 업데이트)
    const { data: currentItem } = await supabase.from('contents').select('content_body').eq('id', id).single();
    let updatedBody = {};
    if (currentItem && currentItem.content_body) {
        try {
            updatedBody = JSON.parse(currentItem.content_body);
        } catch(e) {}
    }
    
    await supabase.from('contents').update({
        content_body: JSON.stringify({
            ...updatedBody,
            feedbackRead: true
        })
    }).eq('id', id);
  };

  if (items.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#c53030', margin: 0 }}>관리자 피드백 (미확인: {items.length}건)</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map(item => {
          const isApproved = item.status === 'approved' || item.status === 'completed';
          const bgColor = isApproved ? '#f0f9ff' : '#ffffff';
          const borderColor = isApproved ? '#bae6fd' : '#fecaca';
          const badgeColor = isApproved ? '#0369a1' : '#dc2626';
          
          return (
            <div 
              key={item.id} 
              style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: bgColor, padding: '0.75rem 1.5rem 0.75rem 1rem', borderRadius: '8px', border: `1px solid ${borderColor}` }}
            >
              <Link 
                href={item.status === 'final_revision' ? `/final-works/submit?id=${item.id}` : `/proposals/submit?id=${item.id}`}
                style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: badgeColor, marginRight: '0.5rem' }}>
                    [{item.status === 'final_revision' ? '완성본 수정' : (item.status === 'revision' ? '기획안 수정' : '보충 의견')}]
                  </span>
                  <span style={{ fontWeight: 600, color: '#2d3748' }}>{item.title}</span>
                  <div style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.2rem', paddingLeft: '0.5rem', borderLeft: `2px solid ${isApproved ? '#7dd3fc' : '#feb2b2'}` }}>
                    관리자 의견: {item.feedback_comment}
                  </div>
                </div>
              </Link>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                 {!isApproved && (
                   <Link 
                     href={item.status === 'final_revision' ? `/final-works/submit?id=${item.id}` : `/proposals/submit?id=${item.id}`} 
                     style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.4rem 1.2rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)', transition: 'transform 0.1s' }}
                     onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                     onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                   >
                     수정
                   </Link>
                 )}
                 {isApproved && <span style={{ color: '#0369a1', fontSize: '0.8rem', fontWeight: 600 }}>확인 완료</span>}
                 
                 <button 
                  onClick={(e) => handleDismiss(item.id, e)}
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.25rem', fontWeight: 400, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', transition: 'color 0.1s', padding: '0 0.2rem' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                  title="알림 확인 및 숨기기"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
