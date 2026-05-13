'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';

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
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

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
    articleType: '',
    targetMonth: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    discussions: [] as any[]
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      // 1. 프로필 정보 가져오기 (이름, 팀 자동 채우기 및 전체 프로필)
      const { data: profilesRow } = await supabase.from('contents').select('author_name, team, keywords').like('title', 'PROFILE_%');
      if (profilesRow) {
          setAllProfiles(profilesRow);
          
          if (userEmail && !idToEdit) {
            const { data: profile } = await supabase.from('contents').select('author_name, team, keywords').eq('title', `PROFILE_${userEmail}`).single();
            if (profile) {
              const genPrefix = profile.keywords ? `${profile.keywords}기 ` : '';
              const finalName = genPrefix + profile.author_name;
              setFormData(prev => ({ 
                ...prev, 
                authorName: finalName, 
                team: profile.team,
                crew: profile.author_name
              }));
            }
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
              crew: body.crew || (data.description ? data.description.split(' (참여:')[0] : ''),
              docsUrl: body.docsUrl || '',
              description: data.description || '',
              status: data.status,
              articleType: body.articleType || '',
              targetMonth: body.targetMonth || (new Date(data.created_at).getFullYear() + '-' + String(new Date(data.created_at).getMonth() + 1).padStart(2, '0')),
              discussions: discussions
            });
          } catch(e) {}

          const { data: { user } } = await supabase.auth.getUser();
          const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).single();
          const userName = profileRow?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null;

          let crewText = '';
          try {
            const body = JSON.parse(data.content_body);
            crewText = body.crew || (data.description ? data.description.split(' (참여:')[0] : '');
            if (Array.isArray(body.crew)) crewText = body.crew.map((c:any)=>c.name).join(',');
          } catch(e) {}

          const isAuthor = currentUser && (emailInJson === userEmail || data.author_name === userEmail || (userName && data.author_name?.includes(userName)));
          const isCrew = userName && crewText.includes(userName);
          const isOwn = isAuthor || isCrew;
          setIsAuthor(!!isOwn);
          setIsReadOnly(data.status !== 'draft');
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
    
    // 유저 정보 가져와서 다양한 패턴으로 확인
    const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).single();
    const userName = profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name || null;

    const { data } = await supabase.from('contents').select('*').eq('status', 'draft').order('created_at', { ascending: false });
    const myDrafts = (data || []).filter(d => {
        let emailInJson = '';
        try { emailInJson = JSON.parse(d.content_body).authorEmail; } catch(e) {}
        
        return emailInJson === user.email || d.author_name === user.email || d.author_name === userName || (userName && d.author_name?.includes(userName));
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

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('이 임시저장 내역을 삭제하시겠습니까?')) return;
    await supabase.from('contents').delete().eq('id', draftId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
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
      role: isAdmin ? 'admin' : (isAuthor ? 'writer' : 'crew'),
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
    
    const crewCount = formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).length : 0;
    const computedArticleType = crewCount > 1 ? '팀기사' : '개인기사';

    const contentBody = {
      ...formData,
      articleType: computedArticleType,
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
    <div className="container flex-col gap-6" style={{ maxWidth: '1000px' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '32px', padding: '3rem', color: 'white', boxShadow: '0 20px 40px -15px rgba(59, 130, 246, 0.4)', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 장식용 배경 원형 패턴들 */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', right: '15%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {idToEdit ? (formData.status === 'draft' ? '기획안 이어서 쓰기' : (isReadOnly ? '기획안 상세보기' : '기획안 수정')) : '기획안 작성'}
            </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem', zIndex: 1 }}>
            {isLocked && (
            <div style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(254, 226, 226, 0.1)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(254, 226, 226, 0.2)', backdropFilter: 'blur(4px)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                제출/통과되어 수정이 잠겼습니다
            </div>
            )}
            {(!idToEdit || formData.status === 'draft') && (
                <button type="button" onClick={loadDrafts} style={{ fontSize: '0.9rem', color: 'white', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '0.6rem 1.2rem', borderRadius: '12px', fontWeight: 600, backdropFilter: 'blur(4px)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    내 임시저장함 열기
                </button>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-6">
        {/* 기본 정보 구역 */}
        <div style={{ position: 'relative', zIndex: 50, padding: '2rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📌 기본 정보
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>제목 (가제) <span style={{color: '#ef4444'}}>*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="예: 봄맞이 캠퍼스 투어" required disabled={isReadOnly || isSubmitting} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }} />
              </div>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>작성자 <span style={{color: '#ef4444'}}>*</span></label>
                <input type="text" name="authorName" value={formData.authorName} onChange={handleChange} placeholder="내 정보 자동으로 불러옴" required disabled={isReadOnly || isSubmitting} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }} />
              </div>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>대상 월 (콘텐츠 반영월) <span style={{color: '#ef4444'}}>*</span></label>
                <input type="month" name="targetMonth" value={formData.targetMonth} onChange={handleChange} required disabled={isReadOnly || isSubmitting} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }} />
              </div>
            </div>
            
            <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>촬영/제작 인원 (크루) <span style={{color: '#ef4444'}}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', position: 'relative' }}>
                  <div style={{ flex: 1, padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '8px', minHeight: '48px', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).map(name => (
                      <span key={name} style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        {name}
                        {!isReadOnly && !isSubmitting && (
                          <button type="button" onClick={() => {
                            const newCrew = formData.crew.split(',').map(s=>s.trim()).filter(n => n !== name).join(', ');
                            setFormData({...formData, crew: newCrew});
                          }} style={{ background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        )}
                      </span>
                    )) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>명단에서 추가 버튼을 눌러 선택해주세요</span>}
                  </div>
                  
                  {!isReadOnly && !isSubmitting && (
                    <>
                      <button 
                        type="button" 
                        onClick={() => setShowMemberSelect(!showMemberSelect)}
                        style={{ padding: '0 1.2rem', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: showMemberSelect ? 'var(--color-primary)' : 'white', color: showMemberSelect ? 'white' : 'var(--color-primary)', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s', alignSelf: 'stretch' }}
                      >
                        👥 명단에서 추가
                      </button>
                      
                      {showMemberSelect && (
                        <div style={{ position: 'absolute', top: '110%', right: 0, width: '300px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ padding: '0.8rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                            <input 
                              type="text" 
                              placeholder="크루원 이름 검색..." 
                              value={memberSearchQuery} 
                              onChange={e => setMemberSearchQuery(e.target.value)} 
                              style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} 
                            />
                          </div>
                          <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
                            {allProfiles
                              .filter(p => p.author_name && (!memberSearchQuery || p.author_name.includes(memberSearchQuery)))
                              .sort((a, b) => {
                                const aSame = a.team === formData.team;
                                const bSame = b.team === formData.team;
                                if (aSame && !bSame) return -1;
                                if (!aSame && bSame) return 1;
                                return (a.author_name || '').localeCompare(b.author_name || '');
                              })
                              .map(p => {
                                const isSelected = formData.crew ? formData.crew.split(',').map(s=>s.trim()).includes(p.author_name) : false;
                                return (
                                  <div 
                                    key={p.author_name + p.team} 
                                    onClick={() => {
                                        let crewArray = formData.crew ? formData.crew.split(',').map(s => s.trim()).filter(Boolean) : [];
                                        if (crewArray.includes(p.author_name)) {
                                            crewArray = crewArray.filter(name => name !== p.author_name);
                                        } else {
                                            crewArray.push(p.author_name);
                                        }
                                        setFormData({ ...formData, crew: crewArray.join(', ') });
                                    }}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-primary)' : '#334155' }}
                                  >
                                    <span>{p.author_name} {p.team && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>({p.team})</span>}</span>
                                    {isSelected && <span>✓</span>}
                                  </div>
                                )
                            })}
                            {allProfiles.filter(p => p.author_name && (!memberSearchQuery || p.author_name.includes(memberSearchQuery))).length === 0 && (
                              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>검색 결과가 없습니다.</div>
                            )}
                          </div>
                          <div style={{ padding: '0.6rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                            <button type="button" onClick={() => setShowMemberSelect(false)} style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>닫기</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>소속 팀 <span style={{color: '#ef4444'}}>*</span></label>
                <select name="team" value={formData.team} onChange={handleChange} required style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }} disabled={isReadOnly || isSubmitting}>
                  <option value="" disabled>-- 팀 선택 --</option>
                  <option value="유튜브">유튜브</option>
                  <option value="인스타">인스타</option>
                  <option value="블로그">블로그</option>
                  <option value="단장 팀">단장 팀</option>
                </select>
              </div>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>콘텐츠 종류 <span style={{color: '#ef4444'}}>*</span></label>
                <select name="contentType" value={formData.contentType} onChange={handleChange} required style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }} disabled={isReadOnly || isSubmitting}>
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
        </div>

        <div style={{ padding: '2rem', borderRadius: '16px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', boxShadow: '0 4px 20px -5px rgba(56, 189, 248, 0.15)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.8rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📄 기획안 문서 URL 연결
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1.2rem', color: '#0c4a6e', lineHeight: 1.5 }}>
            상세 기획안 작성이 필요한 경우, 아래 양식을 복사하여 사용한 뒤 링크를 넣어주세요.
            <br />
            👉 <a href="https://docs.google.com/document/d/1yCJ5aO85_8E1vaXb5k4964-bcCGX-x50uMeGmAVgvU4/edit?usp=sharing" target="_blank" rel="noreferrer" style={{ fontWeight: 700, textDecoration: 'underline', color: '#0284c7' }}>[기획안 공식 양식 바로가기]</a>
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="url" 
              name="docsUrl" 
              value={formData.docsUrl} 
              onChange={handleChange} 
              placeholder="구글 드라이브 기획안 링크 (보기 설정 공개 전환 필수)" 
              disabled={isReadOnly || isSubmitting}
              style={{ backgroundColor: '#ffffff', flex: 1, border: '1px solid #bae6fd', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}
            />
            {formData.docsUrl && (
              <a 
                href={formData.docsUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ padding: '0 1.5rem', backgroundColor: '#0284c7', color: 'white', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '0.9rem', whiteSpace: 'nowrap', textDecoration: 'none', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}
              >
                🔗 이동
              </a>
            )}
          </div>
        </div>

        {!shouldHideDirectInput && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #cbd5e1)' }}></div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em' }}>OR DIRECT ENTRY</div>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #cbd5e1)' }}></div>
            </div>

            {/* 본문 에디터 구역 */}
            <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✍️ 직접 내용 작성
              </h3>
              <div className="flex-col gap-6">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>취재 예정</label>
                    <input type="text" name="targetDate" value={formData.targetDate} onChange={handleChange} placeholder="예: 25.4.7" disabled={isReadOnly || isSubmitting} style={{ backgroundColor: '#ffffff' }} />
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>발행 예정일</label>
                    <input type="text" name="deadline" value={formData.deadline} onChange={handleChange} placeholder="예: 25.4.10" disabled={isReadOnly || isSubmitting} style={{ backgroundColor: '#ffffff' }} />
                  </div>
                  <div className="flex-col gap-2">
                    <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>희망 예정일</label>
                    <input type="text" name="desiredDate" value={formData.desiredDate} onChange={handleChange} placeholder="가안 희망일 기입" disabled={isReadOnly || isSubmitting} style={{ backgroundColor: '#ffffff' }} />
                  </div>
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>취지</label>
                  <RichTextEditor 
                    value={formData.intent} 
                    onChange={(val) => setFormData({...formData, intent: val})} 
                    placeholder="콘텐츠 취지를 작성해주세요. (이미지 붙여넣기 가능)" 
                    disabled={isReadOnly || isSubmitting}
                    minHeight="100px"
                  />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>주요 내용 (아이템/구성 요약)</label>
                  <RichTextEditor 
                    value={formData.contentBody} 
                    onChange={(val) => setFormData({...formData, contentBody: val})} 
                    placeholder="기획안의 핵심 내용을 작성해주세요. (이미지 붙여넣기 가능)" 
                    disabled={isReadOnly || isSubmitting}
                    minHeight="150px"
                  />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>구성안</label>
                  <RichTextEditor 
                    value={formData.composition} 
                    onChange={(val) => setFormData({...formData, composition: val})} 
                    placeholder="세부적인 구성안을 적어주세요. (이미지 붙여넣기 가능, URL 복사 시 자동 링크)" 
                    disabled={isReadOnly || isSubmitting}
                    minHeight="200px"
                  />
                </div>
                
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>주요 태그/키워드</label>
                  <input type="text" name="keywords" value={formData.keywords} onChange={handleChange} placeholder="#축제 #학식 #꿀팁" disabled={isReadOnly || isSubmitting} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} />
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 관리자 참고 사항
          </h3>
          <div className="flex-col gap-2">
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="관리자가 참고할 사항을 적어주세요 (비고, 추가 요청사항 등)." rows={3} disabled={isReadOnly || isSubmitting} style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} />
          </div>
        </div>

        {/* 실시간 논의 공간 (채팅) - 모두 공개 */}
        {idToEdit && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid var(--color-border)', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💬 실시간 논의 공간
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>누구나 자유롭게 의견을 남기고 열람할 수 있습니다.</span>
            </h3>
            
            <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '1rem', minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {formData.discussions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem' }}>아직 대화 내용이 없습니다. 궁금한 점을 물어보세요!</div>
              ) : (
                formData.discussions.map((msg) => {
                  const isOpposite = msg.role === 'admin';
                  return (
                  <div key={msg.id} style={{ alignSelf: isOpposite ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem', color: '#64748b', textAlign: isOpposite ? 'right' : 'left' }}>
                      {msg.author} ({msg.role === 'admin' ? '관리자' : msg.role === 'writer' ? '작성자' : '크루'})
                    </div>
                    <div style={{ backgroundColor: isOpposite ? '#1e3a8a' : 'white', color: isOpposite ? 'white' : 'black', padding: '0.7rem 1rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  </div>
                )})
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
          
          {idToEdit && formData.status !== 'draft' && (isAdmin || isAuthor) && isReadOnly && (
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
              {(!idToEdit || formData.status === 'draft') && (
                  <button type="button" onClick={() => handleSubmit(null as any, true)} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#f3f4f6', fontWeight: 600 }}>
                    임시저장
                  </button>
              )}
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
                {isSubmitting ? '처리 중...' : ((idToEdit && formData.status !== 'draft') ? '수정 완료' : '기획안 제출')}
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
              <div className="flex-col gap-3">
                {drafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.3rem' }}>{d.title || '(제목 없음)'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(d.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={() => handleDeleteDraft(d.id)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600 }}>삭제</button>
                      <button type="button" onClick={() => useDraft(d)} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '8px' }}>불러오기</button>
                    </div>
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
