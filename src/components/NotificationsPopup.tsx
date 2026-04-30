'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function NotificationsPopup({ userEmail, userName }: { userEmail: string | null, userName: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem('isAdminBypass') === 'true');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const fetchFeedbacks = async () => {
        const { data: allData } = await supabase
          .from('contents')
          .select('id, title, status, feedback_comment, updated_at, author_name, content_body')
          .neq('feedback_comment', null)
          .neq('feedback_comment', '')
          .neq('status', 'draft')
          .order('updated_at', { ascending: false });

        if (allData) {
          const mine = allData.filter(item => {
            if (isAdmin) return true; // Show all for admins

            let emailInJson = '', crewString = '';
            if (item.content_body?.startsWith('{')) {
              try {
                const pb = JSON.parse(item.content_body);
                emailInJson = pb.authorEmail || '';
                if (typeof pb.crew === 'string') crewString = pb.crew;
                else if (Array.isArray(pb.crew)) crewString = pb.crew.map((c: any) => c.name || '').join(',');
              } catch {}
            }
            const cleanEmail = emailInJson.trim().toLowerCase();
            const myEmail = (userEmail || '').trim().toLowerCase();
            const isEmailMatch = myEmail && (cleanEmail === myEmail || item.author_name?.toLowerCase() === myEmail);
            
            const cleanName = (userName || '').replace(/\s/g, '');
            const cleanAuthor = (item.author_name || '').replace(/\s/g, '');
            let isNameMatch = false;
            if (cleanName && cleanAuthor) {
              isNameMatch = cleanAuthor.includes(cleanName) || cleanName.includes(cleanAuthor);
              if (!isNameMatch && cleanName.length >= 2 && cleanAuthor.length >= 2) {
                // Check if they share at least 2 consecutive characters (e.g. 용준)
                for (let i = 0; i < cleanName.length - 1; i++) {
                  if (cleanAuthor.includes(cleanName.substring(i, i+2))) {
                    isNameMatch = true;
                    break;
                  }
                }
              }
            }
            
            const isCrew = cleanName && crewString.replace(/\s/g, '').includes(cleanName);
            return isEmailMatch || isNameMatch || isCrew;
          });
          setNotifications(mine.slice(0, 15));
        }
        setLoading(false);
      };
      fetchFeedbacks();
    }
  }, [isOpen, userEmail, userName, supabase, isAdmin]);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b', display: 'flex' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #f1f5f9' }}></span>
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{ 
            position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', 
            backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
            border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', display: 'flex', flexDirection: 'column' 
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#1e293b' }}>
              최근 피드백 알림
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>불러오는 중...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>새로운 피드백이 없습니다.</div>
              ) : (
                notifications.map(noti => (
                  <Link 
                    key={noti.id} 
                    href={`/proposals/submit?id=${noti.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ 
                      display: 'block', padding: '1rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>{noti.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      💬 {noti.feedback_comment}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '0.5rem', textAlign: 'right' }}>
                      {new Date(noti.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
