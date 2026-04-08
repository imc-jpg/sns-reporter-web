'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ProposalSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const idToEdit = searchParams?.get('id');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    authorName: '',
    team: '',
    contentType: '',
    keywords: '',
    intent: '',
    targetDate: '',
    deadline: '',
    desiredDate: '',
    contentBody: '',
    composition: '',
    crew: '',
    docsUrl: '',
    description: '',
    status: '',
    discussions: [] as any[]
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      // 1. 프로필 정보 가져오기 (이름, 팀 자동 채우기)
      if (userEmail && !idToEdit) {
        const { data: profile } = await supabase.from('contents').select('author_name, team, keywords').eq('title', `PROFILE_${userEmail}`).single();
        if (profile) {
          const genPrefix = profile.keywords ? `${profile.keywords}기 ` : '';
          setFormData(prev => ({ 
            ...prev, 
            authorName: genPrefix + profile.author_name, 
            team: profile.team 
          }));
        }
      }

      // 2. 만약 수정 모드라면 데이터 불러오기
      if (idToEdit) {
        setIsLoadingData(true);
        const { data, error } = await supabase.from('contents').select('*').eq('id', idToEdit).single();
        if (data) {
          let emailInJson = '';
          let discussions = [];
          try {
            const body = JSON.parse(data.content_body);
            emailInJson = body.authorEmail;
            discussions = body.discussions || [];
            
            setFormData({
              title: data.title,
              authorName: data.author_name,
              team: data.team,
              contentType: data.content_type,
              keywords: data.keywords,
              intent: data.intent,
              targetDate: body.targetDate || '',
              deadline: body.deadline || '',
              desiredDate: body.desiredDate || '',
              contentBody: body.contentBody || '',
              composition: body.composition || '',
              crew: data.description?.split(' (참여:')[0] || '',
              docsUrl: body.docsUrl || '',
              description: data.description || '',
              status: data.status,
              discussions: discussions
            });
          } catch(e) {}

          const { data: { user } } = await supabase.auth.getUser();
          const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
          const userName = profileRow?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null;

          const isOwn = currentUser && (emailInJson === userEmail || data.author_name === userEmail || (userName && data.author_name?.includes(userName)));
          setIsAuthor(!!isOwn);
          setIsReadOnly(true); // 기본은 읽기 전용
        }
        setIsLoadingData(false);
      }
      
      setIsAdmin(searchParams?.get('admin') === 'true');
    };

    fetchInitialData();
  }, [idToEdit, searchParams, supabase]);

  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('contents').select('*').eq('status', 'draft').order('created_at', { ascending: false });
    const myDrafts = (data || []).filter(d => {
        try {
            return JSON.parse(d.content_body).authorEmail === user.email;
        } catch(e) { return false; }
    });
    setDrafts(myDrafts);
    setShowDrafts(true);
  };

  const useDraft = (draft: any) => {
    try {
        const body = JSON.parse(draft.content_body);
        setFormData({ ...formData, ...body, title: draft.title, team: draft.team, contentType: draft.content_type, keywords: draft.keywords });
    } catch(e) {}
    router.push(`/proposals/submit?id=${draft.id}`);
    setShowDrafts(false);
    setIsReadOnly(false);
  };

  const handleDelete = async () => {
    if (!idToEdit) return;
    if (!confirm('정말로 이 기획안을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('contents').delete().eq('id', idToEdit);
    setIsSubmitting(false);

    if (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('성공적으로 삭제되었습니다.');
        router.push('/proposals');
        router.refresh();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !idToEdit) return;
    
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

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', idToEdit).single();
    let updatedBody = {};
    if (current?.content_body) updatedBody = JSON.parse(current.content_body);

    await supabase.from('contents').update({
        content_body: JSON.stringify({
            ...updatedBody,
            discussions: updatedDiscussions
        })
    }).eq('id', idToEdit);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e?.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const contentBody = {
      ...formData,
      authorEmail: user?.email,
      isDraft
    };

    const payload = {
      title: formData.title,
      author_name: formData.authorName,
      team: formData.team,
      content_type: formData.contentType,
      keywords: formData.keywords,
      intent: formData.intent,
      description: formData.description,
      content_body: JSON.stringify(contentBody),
      status: isDraft ? 'draft' : 'pending'
    };

    let error;
    if (idToEdit) {
      const { error: updateError } = await supabase.from('contents').update(payload).eq('id', idToEdit);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('contents').insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert(isDraft ? '임시저장 되었습니다.' : '기획안이 성공적으로 제출되었습니다.');
      router.push('/proposals');
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isLocked = !!idToEdit && !isAdmin && !['pending', 'revision', 'draft'].includes(formData.status);
  
  const isDirectInputEmpty = !formData.intent && !formData.contentBody && !formData.composition && !formData.keywords;
  const shouldHideDirectInput = isReadOnly && !!formData.docsUrl && isDirectInputEmpty;

  if (isLoadingData) return <div className="container">데이터 불러오는 중...</div>;

  return (
    <div className="container flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          {idToEdit ? (isReadOnly ? '기획안 상세보기' : '기획안 수정하기') : '새 기획안 작성'}
        </h2>
        {isLocked && (
          <div style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#fef2f2', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            통과된 기획안은 수정이 불가능합니다. 수정이 필요한 경우 관리자에게 문의해 주세요.
          </div>
        )}
        {!idToEdit && (
            <button onClick={loadDrafts} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                임시저장 목록 불러오기
            </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-6">
        {/* 기본 정보 구역 */}
        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>기본 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>제목 (가제) <span style={{color: 'red'}}>*</span></label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="예: 봄맞이 캠퍼스 투어" required disabled={isReadOnly || isSubmitting} />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>작성자 <span style={{color: 'red'}}>*</span></label>
              <input type="text" name="authorName" value={formData.authorName} onChange={handleChange} placeholder="내 정보 자동으로 불러옴" required disabled={isReadOnly || isSubmitting} />
            </div>
            <div className="flex-col gap-2">
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>촬영/제작 인원 (크루) <span style={{color: 'red'}}>*</span></label>
                <input type="text" name="crew" value={formData.crew} onChange={handleChange} placeholder="여러 명일 경우 쉼표(,)로 구분 (예: 김철수, 홍길동)" required disabled={isReadOnly || isSubmitting} />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>소속 팀 <span style={{color: 'red'}}>*</span></label>
              <select name="team" value={formData.team} onChange={handleChange} required style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }} disabled={isReadOnly || isSubmitting}>
                <option value="" disabled>-- 팀 선택 --</option>
                <option value="유튜브">유튜브</option>
                <option value="인스타">인스타</option>
                <option value="블로그">블로그</option>
                <option value="단장 팀">단장 팀</option>
              </select>
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>콘텐츠 종류 <span style={{color: 'red'}}>*</span></label>
              <select name="contentType" value={formData.contentType} onChange={handleChange} required style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }} disabled={isReadOnly || isSubmitting}>
                <option value="" disabled>-- 분류 선택 --</option>
                <option value="영상(롱폼)">영상(롱폼)</option>
                <option value="영상(숏폼)">영상(숏폼)</option>
                <option value="카드뉴스">카드뉴스</option>
                <option value="글 기사">글 기사</option>
                <option value="사진/기타">사진/기타</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-primary-light)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📄 기획안 문서 URL 연결
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#475569' }}>
            상세 기획안 작성이 필요한 경우, 아래 양식을 복사하여 사용한 뒤 링크를 넣어주세요.
            <br />
            👉 <a href="https://docs.google.com/document/d/1yCJ5aO85_8E1vaXb5k4964-bcCGX-x50uMeGmAVgvU4/edit?usp=sharing" target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--color-primary)' }}>[기획안 공식 양식 바로가기]</a>
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="url" 
              name="docsUrl" 
              value={formData.docsUrl} 
              onChange={handleChange} 
              placeholder="구글 드라이브 기획안 링크를 입력하세요(보기 설정 공개 전환 필수)" 
              disabled={isReadOnly || isSubmitting}
              style={{ backgroundColor: 'white', flex: 1 }}
            />
            {formData.docsUrl && (
              <a 
                href={formData.docsUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ padding: '0.6rem 1rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                🔗 링크 열기
              </a>
            )}
          </div>
        </div>

        {!shouldHideDirectInput && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>또는</div>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
            </div>

            {/* 본문 에디터 구역 */}
            <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>📄 기획안 직접 내용 입력</h3>
              <div className="flex-col gap-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>취재 예정</label>
                    <input type="text" name="targetDate" value={formData.targetDate} onChange={handleChange} placeholder="예: 25.4.7" disabled={isReadOnly || isSubmitting} />
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>발행 예정일</label>
                    <input type="text" name="deadline" value={formData.deadline} onChange={handleChange} placeholder="예: 25.4.10" disabled={isReadOnly || isSubmitting} />
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>희망 예정일</label>
                    <input type="text" name="desiredDate" value={formData.desiredDate} onChange={handleChange} placeholder="가안 희망일 기입" disabled={isReadOnly || isSubmitting} />
                  </div>
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>취지</label>
                  <textarea name="intent" value={formData.intent} onChange={handleChange} placeholder="콘텐츠 취지를 작성해주세요." rows={3} disabled={isReadOnly || isSubmitting} />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>주요 내용 (아이템/구성 요약)</label>
                  <textarea name="contentBody" value={formData.contentBody} onChange={handleChange} placeholder="기획안의 핵심 내용을 작성해주세요." rows={5} disabled={isReadOnly || isSubmitting} />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>구성안</label>
                  <textarea name="composition" value={formData.composition} onChange={handleChange} placeholder="세부적인 구성안을 적어주세요." rows={6} disabled={isReadOnly || isSubmitting} />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>주요 태그/키워드</label>
                  <input type="text" name="keywords" value={formData.keywords} onChange={handleChange} placeholder="#축제 #학식 #꿀팁" disabled={isReadOnly || isSubmitting} />
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>관리자 참고 사항</h3>
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>비고/메모</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="관리자가 참고할 사항을 적어주세요." rows={2} disabled={isReadOnly || isSubmitting} />
          </div>
        </div>

        {/* 실시간 논의 공간 (채팅) - 작성자/관리자 전용 */}
        {idToEdit && (isAdmin || isAuthor) && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid var(--color-border)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💬 실시간 논의 공간
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>작성자와 관리자만 볼 수 있습니다.</span>
            </h3>
            
            <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '1rem', minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {formData.discussions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>아직 대화 내용이 없습니다. 궁금한 점을 물어보세요!</div>
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
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => router.back()} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', fontWeight: 600 }}>
            뒤로가기
          </button>
          
          {idToEdit && (isAdmin || isAuthor) && isReadOnly && (
            <>
              {!isLocked && (
                <button type="button" onClick={() => setIsReadOnly(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700 }}>
                  ⚙️ 내용 수정하기
                </button>
              )}
              <button type="button" onClick={handleDelete} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fff5f5', color: '#ef4444', fontWeight: 600 }}>
                🗑️ 삭제하기
              </button>
            </>
          )}

          {!isReadOnly && (
            <>
              <button type="button" onClick={() => handleSubmit(null as any, true)} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#f3f4f6', fontWeight: 600 }}>
                임시저장
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
                {isSubmitting ? '처리 중...' : (idToEdit ? '수정 완료' : '기획안 제출')}
              </button>
            </>
          )}
        </div>
      </form>

      {showDrafts && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '80%', maxWidth: '600px', maxHeight: '80%', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>임시저장 목록</h3>
            {drafts.length === 0 ? <p>저장된 초안이 없습니다.</p> : (
              <div className="flex-col gap-2">
                {drafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{d.title || '(제목 없음)'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(d.created_at).toLocaleString()}</div>
                    </div>
                    <button onClick={() => useDraft(d)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>불러오기</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowDrafts(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProposalSubmitPage() {
    return (
        <Suspense fallback={<div>로딩 중...</div>}>
            <ProposalSubmitForm />
        </Suspense>
    );
}
