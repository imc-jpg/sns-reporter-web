'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';
import CalendarPicker from '@/components/CalendarPicker';

export interface ProposalSubmitFormProps {
  embeddedId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}



export default function ProposalSubmitForm({ embeddedId, onSuccess, onCancel, isModal = false }: ProposalSubmitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [currentId, setCurrentId] = useState<string | null>(embeddedId || (searchParams ? searchParams.get('id') : null));
  const idToEdit = currentId;

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
  const [activeTab, setActiveTab] = useState<'my_team' | 'other_teams'>('my_team');
  const [showCalendar, setShowCalendar] = useState(false);

  const [formData, setFormData] = useState(() => {
    let initialData = {
      title: '',
      authorName: '',
      team: '',
      contentType: '',
      keywords: '',
      intent: '',
      targetDate: '',
      deadline: '',
      desiredDate: '',
      desiredDateEnd: '',
      contentBody: '',
      composition: '',
      crew: '',
      docsUrl: '',
      description: '',
      status: '',
      articleType: '',
      timeliness: '중요',
      targetMonth: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
      discussions: [] as any[]
    };
    

    

    
    return initialData;
  });





  const hasFetchedId = useRef<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isReadOnly && !isSubmitting && (formData.title || formData.description)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    const handleModalClose = () => {
      handleClose();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('request-modal-close', handleModalClose);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('request-modal-close', handleModalClose);
    };
  }, [isReadOnly, isSubmitting, formData]);
  
  useEffect(() => {
    const currentId = idToEdit || 'new';
    if (hasFetchedId.current === currentId) return;
    hasFetchedId.current = currentId;

    const fetchInitialData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      // 1. 크루원 목록 가져오기 (참여인원 선택용)
      try {
        const crewRes = await fetch('/api/crew');
        if (crewRes.ok) {
          const crewData = await crewRes.json();
          const formattedProfiles = crewData.map((u: any) => ({
            author_name: u.name,
            team: u.team,
            keywords: u.email
          }));
          setAllProfiles(formattedProfiles);
        }
      } catch (e) {
        console.error('Failed to load crew members', e);
      }

      // 2. 현재 사용자 프로필 자동 채우기 (새 기획안 작성 시)
      if (userEmail && !idToEdit) {
        const { data: profile } = await supabase.from('contents').select('author_name, team, keywords').eq('title', `PROFILE_${userEmail}`).maybeSingle();
        if (profile) {
          const genPrefix = profile.keywords ? `${profile.keywords}기 ` : '';
          const finalName = genPrefix + profile.author_name;
          setFormData(prev => ({ 
            ...prev, 
            authorName: prev.authorName || finalName, 
            team: prev.team || profile.team,
            crew: prev.crew || profile.author_name
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
              desiredDateEnd: body.desiredDateEnd || '',
              contentBody: body.contentBody || '',
              composition: body.composition || '',
              crew: body.crew || (data.description ? data.description.split(' (참여:')[0] : ''),
              docsUrl: body.docsUrl || '',
              description: data.description || '',
              status: data.status,
              articleType: body.articleType || '',
              targetMonth: body.targetMonth || (new Date(data.created_at).getFullYear() + '-' + String(new Date(data.created_at).getMonth() + 1).padStart(2, '0')),
              discussions: discussions,
              timeliness: body.timeliness || '중요'
            });
          } catch(e) {}

          const { data: { user } } = await supabase.auth.getUser();
          const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).maybeSingle();
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
          
          const adminFlag = searchParams?.get('admin') === 'true' || userEmail === 'admin@ymc.com' || userEmail?.includes('admin');
          if (!adminFlag && !isOwn) {
              setIsReadOnly(true);
          } else {
              setIsReadOnly(data.status !== 'draft');
          }
        }
        setIsLoadingData(false);
      }
      
      setIsAdmin(searchParams?.get('admin') === 'true');
    };

    fetchInitialData();
  }, [idToEdit, supabase]);

  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // 유저 정보 가져와서 다양한 패턴으로 확인
    const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).maybeSingle();
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
        const body = draft.content_body ? JSON.parse(draft.content_body) : {};
        const mergedData = { ...formData, ...body, title: draft.title, team: draft.team, contentType: draft.content_type, keywords: draft.keywords, desiredDateEnd: body.desiredDateEnd || '' };
        setFormData(mergedData);
    } catch(e) {}
    setCurrentId(draft.id.toString());
    hasFetchedId.current = draft.id.toString();
    if (!isModal) {
      router.replace(`/proposals/submit?id=${draft.id}`);
    }
    setShowDrafts(false);
    setIsReadOnly(false);
  };

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('이 임시저장 내역을 삭제하시겠습니까?')) return;
    await supabase.from('contents').update({ status: 'deleted' }).eq('id', draftId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const handleDelete = async () => {
    if (!idToEdit) return;
    if (!confirm('정말로 이 기획안을 삭제하시겠습니까? 삭제 후에는 목록에서 숨김 처리됩니다.')) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('contents').update({ status: 'deleted' }).eq('id', idToEdit);
    setIsSubmitting(false);

    if (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('삭제되었습니다.');
        if (onSuccess) onSuccess(); else { 
            router.push('/contents'); router.refresh(); 
        }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !idToEdit) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).maybeSingle();
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

    if (!isDraft) {
      const isDocsUrlEmpty = !formData.docsUrl || formData.docsUrl.trim() === '';
      
      const stripHtml = (html: string) => (html || '').replace(/<[^>]*>?/gm, '').trim();
      const isIntentEmpty = stripHtml(formData.intent) === '';
      const isCompositionEmpty = stripHtml(formData.composition) === '';
      const isContentBodyEmpty = stripHtml(formData.contentBody) === '';
      
      const isRichTextAllFilled = !isIntentEmpty && !isCompositionEmpty && !isContentBodyEmpty;
      
      if (isDocsUrlEmpty && !isRichTextAllFilled) {
        alert('기획안 문서 URL을 입력하거나, 아래 기획의도, 구성 및 내용, 촬영 계획을 모두 작성해야 합니다.');
        setIsSubmitting(false);
        return;
      }

      if (['보통', '중요'].includes(formData.timeliness)) {
        if (!formData.desiredDate) {
          alert('시의성 중요도가 보통 또는 중요일 경우 희망 업로드 시기를 필수적으로 설정해야 합니다.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const crewCount = formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).length : 0;
    const computedArticleType = formData.articleType || (crewCount > 1 ? '팀기사' : '개인기사');

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
      alert('제출 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert(isDraft ? '임시저장 되었습니다.' : (idToEdit ? '기획안이 성공적으로 수정되었습니다.' : '기획안이 성공적으로 제출되었습니다.'));
      if (onSuccess) onSuccess(); else { 
        router.push('/contents'); router.refresh(); 
      }
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = useCallback((e?: any) => {
    if (!isReadOnly && !isSubmitting && (formData.title || formData.description)) {
      if (confirm('작성 중인 내용이 있습니다. 임시저장 하시겠습니까?')) {
        handleSubmit(e, true);
        return;
      }
    }
    if (onCancel) onCancel();
    else router.back();
  }, [isReadOnly, isSubmitting, formData.title, formData.description, onCancel, router, handleSubmit]);

  const isLocked = !!idToEdit && !isAdmin && !['pending', 'revision', 'draft'].includes(formData.status);
  
  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: isModal ? '1.5rem' : '3rem', boxShadow: isModal ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>기획안</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={loadDrafts} style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              임시저장함
            </button>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
              작성자: {formData.authorName || '이름 없음'} / {new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '')}
            </div>
          </div>
        </div>

        <form autoComplete="off" onSubmit={handleSubmit} className="flex-col gap-6">
          {/* 종류 선택 및 제목 */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="flex-col gap-2" style={{ flex: '0 0 160px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>종류 선택</label>
              <select name="contentType" value={formData.contentType} onChange={handleChange} required style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', color: formData.contentType ? '#0f172a' : '#94a3b8', outline: 'none', height: '100%', boxSizing: 'border-box', fontSize: '1rem' }} disabled={isReadOnly || isSubmitting}>
                <option value="" disabled>종류 선택</option>
                <option value="영상(롱폼)">영상(롱폼)</option>
                <option value="영상(숏폼)">영상(숏폼)</option>
                <option value="카드뉴스">카드뉴스</option>
                <option value="글 기사">글 기사</option>
                <option value="사진/기타">사진/기타</option>
              </select>
            </div>
            
            <div className="flex-col gap-2" style={{ flex: 1 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>제목 (가제)</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="내용을 입력해주세요" required disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none', height: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* 콘텐츠 분류 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>콘텐츠 분류</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <select name="team" value={formData.team} onChange={handleChange} required style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', color: formData.team ? '#0f172a' : '#94a3b8', outline: 'none' }} disabled={isReadOnly || isSubmitting}>
                <option value="" disabled>팀 선택</option>
                <option value="유튜브">유튜브</option>
                <option value="인스타">인스타</option>
                <option value="블로그">블로그</option>
                <option value="단장 팀">단장 팀</option>
              </select>
              
              <input type="month" name="targetMonth" value={formData.targetMonth} onChange={handleChange} required disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', color: '#0f172a', outline: 'none' }} />
              
              <select 
                name="articleType" 
                value={formData.articleType || (formData.crew && formData.crew.split(',').map(s=>s.trim()).filter(Boolean).length > 1 ? '팀기사' : '개인기사')} 
                onChange={handleChange} 
                disabled={isReadOnly || isSubmitting} 
                style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', color: '#0f172a', fontWeight: 600, outline: 'none', cursor: (isReadOnly || isSubmitting) ? 'default' : 'pointer' }}
              >
                <option value="개인기사">개인기사</option>
                <option value="팀기사">팀기사</option>
              </select>
            </div>
          </div>

          {/* 참여인원 */}
          <div className="flex-col gap-2" style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>참여인원 (크루)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
               {/* Avatars */}
               {formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).map(name => {
                 const cleanAuthorName = formData.authorName?.replace(/^\d+(기)?\s+/, '');
                 const cleanName = name.replace(/^\d+(기)?\s+/, '');
                 return (
                 <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{name}</span>
                    
                    {!isReadOnly && !isSubmitting && cleanName !== cleanAuthorName && (
                      <button type="button" onClick={() => {
                        const newCrew = formData.crew.split(',').map(s=>s.trim()).filter(n => n !== name).join(', ');
                        setFormData({...formData, crew: newCrew});
                      }} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}>
                        ✕
                      </button>
                    )}
                 </div>
               )}) : null}
               
               {!isReadOnly && !isSubmitting && (
                 <div style={{ position: 'relative' }}>
                   <button type="button" onClick={() => setShowMemberSelect(!showMemberSelect)} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px dashed #cbd5e1', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                   </button>
                   
                   {showMemberSelect && (
                     <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '10px', width: '320px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                         <button type="button" onClick={() => setActiveTab('my_team')} style={{ flex: 1, padding: '0.8rem', background: 'none', border: 'none', borderBottom: activeTab === 'my_team' ? '2px solid #1e3a8a' : '2px solid transparent', color: activeTab === 'my_team' ? '#1e3a8a' : '#64748b', fontWeight: activeTab === 'my_team' ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}>우리 팀 ({formData.team || '미지정'})</button>
                         <button type="button" onClick={() => setActiveTab('other_teams')} style={{ flex: 1, padding: '0.8rem', background: 'none', border: 'none', borderBottom: activeTab === 'other_teams' ? '2px solid #1e3a8a' : '2px solid transparent', color: activeTab === 'other_teams' ? '#1e3a8a' : '#64748b', fontWeight: activeTab === 'other_teams' ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}>다른 팀</button>
                       </div>
                       <div style={{ padding: '0.8rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                         <input 
                           type="text" 
                           placeholder="크루원 이름 검색..." 
                           value={memberSearchQuery} 
                           onChange={e => setMemberSearchQuery(e.target.value)} 
                           style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }} 
                         />
                       </div>
                       <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
                         {allProfiles
                           .filter(p => {
                             if (!p.author_name) return false;
                             if (memberSearchQuery && !p.author_name.includes(memberSearchQuery)) return false;
                             if (activeTab === 'my_team') {
                               return formData.team && p.team === formData.team;
                             } else {
                               return !formData.team || p.team !== formData.team;
                             }
                           })
                           .map(p => {
                             const isSelected = formData.crew ? formData.crew.split(',').map(s=>s.trim()).includes(p.author_name) : false;
                             return (
                               <div 
                                 key={p.author_name + p.team} 
                                 onClick={() => {
                                     let crewArray = formData.crew ? formData.crew.split(',').map(s => s.trim()).filter(Boolean) : [];
                                     const cleanPName = p.author_name.replace(/^\d+(기)?\s+/, '');
                                     const cleanAuthorName = formData.authorName?.replace(/^\d+(기)?\s+/, '');
                                     if (crewArray.includes(p.author_name)) {
                                         if (cleanPName !== cleanAuthorName) {
                                            crewArray = crewArray.filter(name => name !== p.author_name);
                                         }
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
                       </div>
                       <div style={{ padding: '0.6rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                         <button type="button" onClick={() => setShowMemberSelect(false)} style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>닫기</button>
                       </div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>

           {/* 기획안 URL 연결 */}
           <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📄 기획안 문서 URL 연결
            </label>
            <div style={{ padding: '1.2rem', borderRadius: '12px', border: 'none', backgroundColor: '#f0f9ff' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#0c4a6e', lineHeight: 1.5 }}>
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
                  style={{ backgroundColor: '#ffffff', flex: 1, border: 'none', padding: '0.75rem', borderRadius: '8px', outline: 'none', color: '#0f172a' }}
                />
                {formData.docsUrl && (
                  <a 
                    href={formData.docsUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ padding: '0 1.5rem', backgroundColor: '#0284c7', color: 'white', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', fontSize: '0.9rem', whiteSpace: 'nowrap', textDecoration: 'none' }}
                  >
                    🔗 이동
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Rich Texts */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>기획의도</label>
            <RichTextEditor value={formData.intent} onChange={(val) => setFormData({...formData, intent: val})} placeholder="내용을 입력해주세요" disabled={isReadOnly || isSubmitting} minHeight="120px" />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>구성 및 내용</label>
            <RichTextEditor value={formData.composition} onChange={(val) => setFormData({...formData, composition: val})} placeholder="내용을 입력해주세요" disabled={isReadOnly || isSubmitting} minHeight="150px" />
          </div>

          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>촬영 계획</label>
            <RichTextEditor value={formData.contentBody} onChange={(val) => setFormData({...formData, contentBody: val})} placeholder="내용을 입력해주세요" disabled={isReadOnly || isSubmitting} minHeight="120px" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
              <a href="https://ymcrental.vercel.app/" target="_blank" rel="noreferrer" style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                장비대여 시스템 바로가기 →
              </a>
            </div>
          </div>

          {/* Hashtags */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>해시태그 (쉼표로 구분, 최대 5개)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ backgroundColor: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"></path></svg>
              </div>
              <input type="text" name="keywords" value={formData.keywords} onChange={(e) => {
                  const parts = e.target.value.split(',');
                  if (parts.length > 5) {
                    setFormData(prev => ({ ...prev, keywords: parts.slice(0, 5).join(',') }));
                  } else {
                    handleChange(e);
                  }
              }} placeholder="예: 축제, 동아리, 브이로그 (쉼표로 구분)" disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem' }} />
            </div>
            {formData.keywords && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                {formData.keywords.split(',').map(kw => kw.trim()).filter(Boolean).map((kw, i) => (
                  <span key={i} style={{ backgroundColor: '#93c5fd', color: '#1e3a8a', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {kw} 
                    {!isReadOnly && !isSubmitting && (
                        <button type="button" onClick={() => {
                            const newKws = formData.keywords.split(',').map(k=>k.trim()).filter(k => k && k !== kw).join(', ');
                            setFormData({...formData, keywords: newKws});
                        }} style={{ background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer', padding: 0, fontSize: '12px' }}>✕</button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dates & Timeliness */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
            {/* 시의성 중요도 드롭다운 */}
            <div className="flex-col gap-2">
              <label style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>시의성 중요도</label>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {[
                  { level: '상관없음', color: '#93C5FD', bg: '#EFF6FF', hover: '#DBEAFE' },
                  { level: '보통', color: '#3B82F6', bg: '#EFF6FF', hover: '#DBEAFE' },
                  { level: '중요', color: '#1E3A8A', bg: '#EFF6FF', hover: '#DBEAFE' }
                ].map(({ level, color, bg, hover }) => {
                  const isSelected = formData.timeliness === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        if (!isReadOnly && !isSubmitting) {
                          if (level === '상관없음') {
                            setFormData({...formData, timeliness: level, desiredDate: '', desiredDateEnd: '', deadline: ''});
                          } else {
                            setFormData({...formData, timeliness: level});
                          }
                        }
                      }}
                      disabled={isReadOnly || isSubmitting}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${color}` : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? color : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#475569',
                        fontSize: '1rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: (isReadOnly || isSubmitting) ? 'default' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 4px 12px ${color}40` : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isReadOnly && !isSubmitting) {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #FFFFFF' : '2px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#FFFFFF' : 'transparent'
                      }}>
                        {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />}
                      </div>
                      {level}
                    </button>
                  );
                })}
              </div>
              {formData.timeliness === '중요' && (
                <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                  * 희망 업로드 일이 촉박하거나, 데드라인을 지키기 어려운 경우 기획단계부터 미디어센터 관리자와 상의하세요.
                </div>
              )}
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
                * 캘린더 정렬 시 참고됩니다. (상관없음이 맨 위로 고정됩니다.)
              </p>
            </div>

            {/* 희망 업로드 시기 */}
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>희망 업로드 시기</label>
              
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  cursor: 'default',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ flex: 1, color: formData.desiredDate ? '#0f172a' : '#94a3b8', fontSize: '1rem', fontWeight: 600 }}>
                  {formData.desiredDate 
                    ? (formData.desiredDateEnd && formData.desiredDate !== formData.desiredDateEnd 
                        ? `${formData.desiredDate} ~ ${formData.desiredDateEnd}` 
                        : formData.desiredDate)
                    : (formData.timeliness === '상관없음' ? '날짜 선택 불가 (상관없음)' : '아래 달력에서 날짜를 선택해주세요')}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>

              {!isReadOnly && !isSubmitting && (
                <CalendarPicker
                  initialStartDate={formData.desiredDate}
                  initialEndDate={formData.desiredDateEnd}
                  mode={
                    formData.timeliness === '상관없음' ? 'disabled' : 
                    formData.timeliness === '중요' ? 'single' : 'range'
                  }
                  onApply={(start, end) => {
                    const newDeadline = start ? new Date(new Date(start).getTime() - 3*24*60*60*1000).toISOString().split('T')[0] : '';
                    setFormData({...formData, desiredDate: start, desiredDateEnd: end, deadline: newDeadline});
                  }}
                />
              )}
            </div>

            {/* 데드라인 */}
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>데드라인 <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 500 }}>(시작일 3일 전으로 자동 설정)</span></label>
              <input type="date" name="deadline" value={formData.deadline} readOnly style={{ border: 'none', backgroundColor: '#cbd5e1', padding: '0.75rem', borderRadius: '8px', color: '#475569', outline: 'none' }} />
            </div>
          </div>

          {/* 비고 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>비고</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="내용을 입력해주세요..." rows={3} disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', outline: 'none', resize: 'vertical' }} />
          </div>

          {/* Buttons */}
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => handleSubmit(null as any, true)} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #1e3a8a', backgroundColor: '#ffffff', color: '#1e3a8a', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                임시저장
              </button>
              <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                {isSubmitting ? '처리 중...' : '제출하기'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleClose} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                목록으로
              </button>
              {idToEdit && (isAdmin || isAuthor) && !['approved', 'completed', 'uploaded'].includes(formData.status) && (
                <button type="button" onClick={() => setIsReadOnly(false)} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                  수정하기
                </button>
              )}
            </div>
          )}

        </form>
      </div>

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
                      <button type="button" onClick={() => handleDeleteDraft(d.id)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>삭제</button>
                      <button type="button" onClick={() => useDraft(d)} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '8px', cursor: 'pointer' }}>불러오기</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowDrafts(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontWeight: 600 }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}


