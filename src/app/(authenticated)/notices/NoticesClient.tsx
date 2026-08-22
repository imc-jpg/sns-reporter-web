'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import NoticeCreateModal from '@/components/NoticeCreateModal';
import { deleteNotice } from '@/app/actions/notice';

interface Notice {
  id: string;
  title: string;
  content_body: string;
  author_name: string;
  created_at: string;
  status: string;
}

export default function NoticesClient({ notices, isAdmin }: { notices: Notice[], isAdmin: boolean }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState<Notice | null>(null);
  const searchParams = useSearchParams();
  const initialId = searchParams?.get('id') || null;
  const [expandedId, setExpandedId] = useState<string | null>(initialId);

  useEffect(() => {
    if (initialId) setExpandedId(initialId);
  }, [initialId]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
    const res = await deleteNotice(id);
    if (!res.success) {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-enter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>공지사항</h2>
        
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="motion-btn" 
            style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#002454', color: 'white', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(0, 36, 84, 0.15)' }}
          >
            + 공지 작성하기
          </button>
        )}
      </div>

      <div className="card motion-card animate-enter stagger-1" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: 'rgba(248, 250, 252, 0.7)', backdropFilter: 'blur(10px)' }}>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '10%' }}>종류</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '60%' }}>제목</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '15%' }}>작성자</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {notices.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>등록된 공지사항이 없습니다.</td>
              </tr>
            ) : notices.map((notice) => {
              const isImportant = notice.status === 'IMPORTANT';
              const isExpanded = expandedId === notice.id;
              
              return (
                <React.Fragment key={notice.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(226, 232, 240, 0.6)', backgroundColor: isImportant ? 'rgba(239, 246, 255, 0.6)' : 'transparent', transition: 'all 0.2s' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {isImportant ? (
                        <span style={{ backgroundColor: '#EF4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>중요</span>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>일반</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: isImportant ? 700 : 600 }}>
                      <a onClick={(e) => { e.preventDefault(); toggleExpand(notice.id); }} href="#" style={{ cursor: 'pointer', color: '#0F172A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.01em', fontSize: '0.9rem' }}>
                        {notice.title}
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </a>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#64748B', fontSize: '0.85rem', fontWeight: 500 }}>{notice.author_name}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 500 }}>{new Date(notice.created_at).toLocaleDateString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: isImportant ? 'rgba(239, 246, 255, 0.7)' : 'rgba(248, 250, 252, 0.7)' }}>
                      <td colSpan={4} style={{ padding: '1.5rem 2rem' }}>
                        <div style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: isAdmin ? '1.5rem' : '0' }}>
                          {notice.content_body}
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button 
                              onClick={() => setEditData(notice)}
                              className="motion-btn"
                              style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid rgba(203, 213, 225, 0.8)', backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              수정
                            </button>
                            <button 
                              onClick={() => handleDelete(notice.id)}
                              className="motion-btn"
                              style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid rgba(254, 202, 202, 0.8)', backgroundColor: 'rgba(254, 242, 242, 0.9)', color: '#EF4444', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreateModal && <NoticeCreateModal onClose={() => setShowCreateModal(false)} />}
      {editData && <NoticeCreateModal onClose={() => setEditData(null)} editData={editData} />}
    </div>
  );
}
