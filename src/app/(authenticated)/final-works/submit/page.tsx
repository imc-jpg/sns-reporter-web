'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function FinalSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialId = searchParams?.get('id');

  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    proposalId: '',
    finalUrl: '',
    postContent: '',
    desiredDate: '',
    discussions: [] as any[]
  });
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      // 1. 통과된 기획안 목록 가져오기
      const { data: props } = await supabase
        .from('contents')
        .select('id, title, author_name, content_type')
        .eq('status', 'approved');
      
      let allProps = props || [];

      // 관리자가 아니면 내 것만 보이게 필터링
      const isAdminFlag = searchParams?.get('admin') === 'true';
      if (!isAdminFlag && userEmail) {
          const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
          const userName = profile?.author_name;
          allProps = allProps.filter(p => 
            p.author_name === userEmail || 
            (userName && p.author_name?.includes(userName))
          );
      }

      // 2. 이미 제출된 건 수정 모드일 때
      if (initialId) {
        const { data: current, error } = await supabase.from('contents').select('*').eq('id', initialId).single();
        if (current) {
          // 목록에 없으면 추가
          if (!allProps.find(p => p.id.toString() === initialId)) {
            allProps = [{ id: current.id, title: current.title, author_name: current.author_name, content_type: current.content_type }, ...allProps];
          }

          let discussions = [];
          let postContent = '';
          let desiredDate = '';
          try {
            const body = JSON.parse(current.content_body);
            discussions = body.discussions || [];
            postContent = body.postContent || '';
            desiredDate = body.desiredDate || '';
          } catch(e) {}

          setFormData({
            proposalId: current.id.toString(),
            finalUrl: current.final_url || '',
            postContent: postContent,
            desiredDate: desiredDate,
            discussions: discussions
          });

          // 권한 확인
          const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
          const userName = profile?.author_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null;
          const isOwn = currentUser && (current.author_name === userEmail || (userName && current.author_name?.includes(userName)));
          
          setIsAuthor(!!isOwn);
          setIsReadOnly(true);
        }
      }

      setAvailableProposals(allProps);
      setIsAdmin(searchParams?.get('admin') === 'true');
      setIsLoadingProps(false);
    };

    fetchInitialData();
  }, [initialId, searchParams, supabase]);

  const handleDelete = async () => {
    if (!initialId) return;
    if (!confirm('완성본 제출 기록을 삭제하시겠습니까? 기획안 자체는 삭제되지 않으며 상태만 되돌아갑니다.')) return;
    
    setIsSubmitting(true);
    // 완성본 정보를 지우고 상태를 기획안 통과(approved)로 되돌림
    const { error } = await supabase.from('contents').update({
        status: 'approved',
        final_url: null
    }).eq('id', initialId);
    
    setIsSubmitting(false);

    if (error) {
        alert('삭제(되돌리기) 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('성공적으로 삭제되었습니다. 해당 기획안은 다시 완성본 대기 상태로 변경됩니다.');
        router.push('/final-works');
        router.refresh();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !initialId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
    const displayName = profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Unknown';

    const message = {
      id: Date.now(),
      role: isAdmin ? 'admin' : 'writer',
      text: newComment,
      createdAt: new Date().toISOString(),
      author: displayName
    };
    
    const updatedDiscussions = [...formData.discussions, message];
    setFormData(prev => ({ ...prev, discussions: updatedDiscussions }));
    setNewComment('');

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', initialId).single();
    let updatedBody = {};
    if (current?.content_body) updatedBody = JSON.parse(current.content_body);

    await supabase.from('contents').update({
        content_body: JSON.stringify({
            ...updatedBody,
            discussions: updatedDiscussions
        })
    }).eq('id', initialId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proposalId) {
      alert('대상 기획안을 선택해주세요.');
      return;
    }
    setIsSubmitting(true);

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', formData.proposalId).single();
    let bodyData = {};
    try {
      if (current?.content_body) bodyData = JSON.parse(current.content_body);
    } catch(e) {}

    const updatedBody = {
      ...bodyData,
      postContent: formData.postContent,
      desiredDate: formData.desiredDate,
      discussions: formData.discussions
    };

    const { error } = await supabase.from('contents')
      .update({
        final_url: formData.finalUrl,
        content_body: JSON.stringify(updatedBody),
        status: 'final_submitted'
      })
      .eq('id', formData.proposalId);

    if (error) {
      alert('제출 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert('완성본이 성공적으로 제출되었습니다.');
      router.push('/final-works');
      router.refresh();
    }
    setIsSubmitting(false);
  };

  if (isLoadingProps) return <div className="container">데이터 불러오는 중...</div>;

  return (
    <div className="container flex-col gap-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
        {initialId ? (isReadOnly ? '완성본 상세보기' : '완성본 수정하기') : '새 완성본 등록'}
      </h2>
      
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        기획안이 통과된 항목에 대해 최종 결과물 링크와 포스팅 본문을 등록합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex-col gap-6">
        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div className="flex-col gap-4">
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>대상 기획안 선택</label>
              <select 
                value={formData.proposalId} 
                onChange={(e) => setFormData({...formData, proposalId: e.target.value})}
                required
                style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                disabled={!!initialId || isReadOnly || isSubmitting}
              >
                <option value="">-- 기획안을 선택하세요 --</option>
                {availableProposals.map(p => (
                  <option key={p.id} value={p.id}>{`[${p.author_name}] ${p.title}`}</option>
                ))}
              </select>
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>최종 결과물 URL (유튜브/블로그/인스타 링크)</label>
              <input 
                type="url" 
                value={formData.finalUrl} 
                onChange={(e) => setFormData({...formData, finalUrl: e.target.value})}
                placeholder="https://..."
                required
                disabled={isReadOnly || isSubmitting}
              />
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>업로드 희망일</label>
              <input 
                type="date" 
                value={formData.desiredDate} 
                onChange={(e) => setFormData({...formData, desiredDate: e.target.value})}
                disabled={isReadOnly || isSubmitting}
              />
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>게시물 본문 (포스팅 텍스트)</label>
              <textarea 
                value={formData.postContent} 
                onChange={(e) => setFormData({...formData, postContent: e.target.value})}
                placeholder="게시물에 실제로 올릴 문구를 작성해주세요."
                rows={10}
                disabled={isReadOnly || isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* 실시간 논의 공간 (채팅) */}
        {initialId && (isAdmin || isAuthor) && (
          <div style={{ marginTop: '1rem', borderTop: '2px solid var(--color-border)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💬 실시간 논의 공간
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>작성자와 관리자만 볼 수 있습니다.</span>
            </h3>
            
            <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '1rem', minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {formData.discussions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>아직 대화 내용이 없습니다.</div>
              ) : (
                formData.discussions.map((msg) => (
                  <div key={msg.id} style={{ alignSelf: msg.role === (isAdmin ? 'admin' : 'writer') ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem', color: '#64748b', textAlign: msg.role === (isAdmin ? 'admin' : 'writer') ? 'right' : 'left' }}>
                      {msg.author} ({msg.role === 'admin' ? '관리자' : '글쓴이'})
                    </div>
                    <div style={{ backgroundColor: msg.role === 'admin' ? '#1e3a8a' : 'white', color: msg.role === 'admin' ? 'white' : 'black', padding: '0.7rem 1rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="의견을 입력하세요... (Enter로 전송)"
                style={{ flex: 1, minHeight: '50px', maxHeight: '100px', padding: '0.7rem' }}
              />
              <button 
                type="button" 
                onClick={handleAddComment}
                style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 600 }}
              >
                전송
              </button>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => router.back()} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', fontWeight: 600 }}>
            뒤로가기
          </button>

          {initialId && (isAdmin || isAuthor) && isReadOnly && (
            <>
              <button type="button" onClick={() => setIsReadOnly(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700 }}>
                ⚙️ 내용 수정하기
              </button>
              <button type="button" onClick={handleDelete} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fff5f5', color: '#ef4444', fontWeight: 600 }}>
                🗑️ 삭제하기
              </button>
            </>
          )}

          {!isReadOnly && (
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
              {isSubmitting ? '제출 중...' : (initialId ? '수정 완료' : '완성본 제출')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function FinalWorksSubmitPage() {
    return (
        <Suspense fallback={<div>로딩 중...</div>}>
            <FinalSubmitForm />
        </Suspense>
    );
}
