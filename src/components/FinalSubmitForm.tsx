'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import Link from 'next/link';

export interface FinalSubmitFormProps {
  initialId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const globalFinalCache: Record<string, any> = {};

export default function FinalSubmitForm({ initialId: embeddedId, onSuccess, onCancel, isModal = false }: FinalSubmitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const initialId = embeddedId || searchParams?.get('id');

  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [authorName, setAuthorName] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isCrewEditable, setIsCrewEditable] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    let initialData = {
      proposalId: '',
      finalUrl: '',
      postContent: '',
      desiredDate: '',
      discussions: [] as any[],
      keywords: '',
      crew: '',
      description: ''
    };
    
    const cacheKey = initialId || 'new';
    if (globalFinalCache[cacheKey]) {
      initialData = { ...initialData, ...globalFinalCache[cacheKey] };
    }
    return initialData;
  });

  useEffect(() => {
    const cacheKey = initialId || 'new';
    globalFinalCache[cacheKey] = formData;
  }, [formData, initialId]);



  const [newComment, setNewComment] = useState('');

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getGoogleDriveInfo = (url: string) => {
    if (!url) return null;
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { id: folderMatch[1], type: 'folder' };
    
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { id: fileMatch[1], type: 'file' };
    
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return { id: idMatch[1], type: url.includes('folderview') ? 'folder' : 'file' };

    return null;
  };

  const formatCrewName = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (/^\d+기\s+/.test(trimmed)) return trimmed;
    if (/^\d+\s+/.test(trimmed)) return trimmed.replace(/^(\d+)\s+/, '$1기 ');
    const cleanName = trimmed.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => p.author_name === cleanName || p.author_name === trimmed);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return trimmed;
  };

  const hasFetchedId = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    if (!isReadOnly && !isSubmitting && (formData.finalUrl || formData.postContent)) {
      if (confirm('작성 중인 내용이 있습니다. 정말 나가시겠습니까?')) {
        if (onCancel) onCancel();
        else router.back();
      }
    } else {
      if (onCancel) onCancel();
      else router.back();
    }
  }, [isReadOnly, isSubmitting, formData.finalUrl, formData.postContent, onCancel, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isReadOnly && !isSubmitting && (formData.finalUrl || formData.postContent)) {
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
  }, [isReadOnly, isSubmitting, formData, handleClose]);

  useEffect(() => {
    const currentId = initialId || 'new';
    if (hasFetchedId.current === currentId) return;
    hasFetchedId.current = currentId;

    const fetchInitialData = async () => {
      // Load profiles first for formatting crew
      let loadedProfiles: any[] = [];
      try {
        const crewRes = await fetch('/api/crew');
        if (crewRes.ok) {
          const crewData = await crewRes.json();
          loadedProfiles = crewData.map((u: any) => ({
            author_name: u.name,
            team: u.team,
            keywords: u.email
          }));
          setAllProfiles(loadedProfiles);
        }
      } catch (e) {
        console.error('Failed to load crew members', e);
      }

      const formatCrew = (name: string) => {
        if (!name) return '';
        const trimmed = name.trim();
        if (/^\d+기\s+/.test(trimmed)) return trimmed;
        if (/^\d+\s+/.test(trimmed)) return trimmed.replace(/^(\d+)\s+/, '$1기 ');
        const cleanName = trimmed.replace(/^\d+(기)?\s+/, '');
        const profile = loadedProfiles.find(p => p.author_name === cleanName || p.author_name === trimmed);
        if (profile && profile.keywords) {
          const kw = profile.keywords.toString().trim();
          const generation = kw.endsWith('기') ? kw : `${kw}기`;
          return `${generation} ${cleanName}`;
        }
        return trimmed;
      };

      const formatCrewList = (str: string) => str ? str.split(',').map(s => formatCrew(s)).join(', ') : '';

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
      const userName = profileRow?.author_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null;
      setAuthorName(userName || '이름 없음');

      const { data: props } = await supabase
        .from('contents')
        .select('id, title, author_name, content_type')
        .in('status', ['approved', 'final_submitted', 'revision', 'completed', 'uploaded']);
      
      let allProps = props || [];

      const isAdminFlag = searchParams?.get('admin') === 'true' || userEmail === 'admin@ymc.com' || userEmail?.includes('admin');

      if (initialId) {
        const { data: current, error } = await supabase.from('contents').select('*').eq('id', initialId).single();
        if (current) {
          setSelectedProposal(current);
          
          if (!allProps.find(p => p.id.toString() === initialId)) {
            allProps = [{ id: current.id, title: current.title, author_name: current.author_name, content_type: current.content_type }, ...allProps];
          }

          let discussions: any[] = [];
          let postContent = '';
          let desiredDate = '';
          let keywords = current.keywords || '';
          let crew = '';
          let description = '';

          try {
            const body = JSON.parse(current.content_body);
            discussions = body.discussions || [];
            postContent = body.postContent || '';
            desiredDate = body.desiredDate || '';
            description = body.finalDescription || '';
            
            if (['approved', 'final_submitted', 'completed', 'uploaded', 'revision'].includes(current.status)) {
                keywords = body.finalKeywords || current.keywords || '';
                crew = body.finalCrew || body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            } else {
                keywords = current.keywords || '';
                crew = body.crew || (current.description ? current.description.split(' (참여:')[0] : '');
            }
            crew = formatCrewList(crew);
          } catch(e) {}

          setFormData(prev => {
            const newForm = {
              ...prev,
              proposalId: current.id.toString(),
              finalUrl: current.final_url || prev.finalUrl || '',
              postContent: postContent || prev.postContent || '',
              desiredDate: desiredDate || prev.desiredDate || '',
              discussions: discussions.length > 0 ? discussions : prev.discussions,
              keywords: keywords || prev.keywords || '',
              crew: crew || prev.crew || '',
              description: description || prev.description || ''
            };
            return newForm;
          });

          const isOwn = currentUser && (current.author_name === userEmail || (userName && current.author_name?.includes(userName)));
          const isParticipant = crew && (crew.includes(userEmail || '') || (userName && crew.includes(userName)));
          const authorFlag = !!isOwn || !!isParticipant;
          setIsAuthor(authorFlag);
          
          if (!isAdminFlag && !authorFlag) {
             setIsReadOnly(true);
          } else {
             setIsReadOnly(current.status !== 'approved');
          }
        } else {
          // If the requested proposal was deleted from DB
          delete globalFinalCache[initialId];
          alert('선택하신 기획안이 삭제(폐기)되었거나 존재하지 않습니다. 등록 가능한 다른 기획안을 선택해주세요.');
          setFormData(prev => ({ ...prev, proposalId: '' }));
          setSelectedProposal(null);
        }
      }

      if (!isAdminFlag && userEmail) {
          // Filter available proposals to those the user is author or participant of
          allProps = allProps.filter(p => {
             if (p.author_name === userEmail || (userName && p.author_name?.includes(userName))) return true;
             return false; // we'd need body to fully check crew, but this list is just for selection. If embeddedId is used, selection is hidden anyway.
          });
      }

      setAvailableProposals(allProps);
      setIsAdmin(!!isAdminFlag);
      setIsLoadingProps(false);
    };

    fetchInitialData();
  }, [initialId, searchParams, supabase]);

  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).single();
    const userName = profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name || null;

    const { data } = await supabase.from('contents').select('*').eq('status', 'approved').order('created_at', { ascending: false });
    const myDrafts = (data || []).filter(d => {
        let emailInJson = '';
        let hasDraftData = false;
        try { 
           const body = JSON.parse(d.content_body);
           emailInJson = body.authorEmail; 
           if (d.final_url || body.postContent || body.finalKeywords) {
              hasDraftData = true;
           }
        } catch(e) {}
        
        const isMine = emailInJson === user.email || d.author_name === user.email || d.author_name === userName || (userName && d.author_name?.includes(userName));
        return isMine && hasDraftData;
    });
    setDrafts(myDrafts);
    setShowDrafts(true);
  };

  const useDraft = (draft: any) => {
    let postContent = '';
    let desiredDate = '';
    let keywords = draft.keywords || '';
    let crew = '';
    let description = '';

    try {
      const body = JSON.parse(draft.content_body);
      postContent = body.postContent || '';
      desiredDate = body.desiredDate || '';
      description = body.finalDescription || '';
      keywords = body.finalKeywords || draft.keywords || '';
      crew = body.finalCrew || body.crew || (draft.description ? draft.description.split(' (참여:')[0] : '');
    } catch(e) {}

    setFormData(prev => ({
       ...prev,
       proposalId: draft.id.toString(),
       finalUrl: draft.final_url || '',
       postContent: postContent,
       desiredDate: desiredDate,
       keywords: keywords,
       crew: crew,
       description: description
    }));
    
    setSelectedProposal(draft);
    setShowDrafts(false);
    setIsReadOnly(false);
  };

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('완성본 임시저장 내역을 삭제하시겠습니까? 기획안 데이터는 유지됩니다.')) return;
    
    const { data: current } = await supabase.from('contents').select('content_body').eq('id', draftId).single();
    let updatedBody = {};
    if (current?.content_body) {
       try {
         updatedBody = JSON.parse(current.content_body);
         delete (updatedBody as any).postContent;
         delete (updatedBody as any).finalKeywords;
         delete (updatedBody as any).finalCrew;
         delete (updatedBody as any).finalDescription;
         delete (updatedBody as any).finalSubmittedAt;
       } catch(e) {}
    }

    await supabase.from('contents').update({
       final_url: null,
       content_body: JSON.stringify(updatedBody)
    }).eq('id', draftId);
    
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  const handleDelete = async () => {
    if (!initialId) return;
    if (!confirm('완성본 제출 기록을 삭제하시겠습니까? 기획안 자체는 삭제되지 않으며 상태만 되돌아갑니다.')) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('contents').update({
        status: 'approved',
        final_url: null
    }).eq('id', initialId);
    
    setIsSubmitting(false);

    if (error) {
        alert('삭제(되돌리기) 중 오류가 발생했습니다: ' + error.message);
    } else {
        alert('성공적으로 삭제되었습니다. 해당 기획안은 다시 완성본 대기 상태로 변경됩니다.');
        delete globalFinalCache[initialId || 'new'];
        if (onSuccess) onSuccess();
        else {
          router.push('/contents');
          router.refresh();
        }
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

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!formData.proposalId) {
      alert('대상 기획안을 선택해주세요.');
      return;
    }
    setIsSubmitting(true);

    const { data: current } = await supabase.from('contents').select('content_body').eq('id', formData.proposalId).single();
    let bodyData: any = {};
    try {
      if (current?.content_body) bodyData = JSON.parse(current.content_body);
    } catch(e) {}

    const updatedBody = {
      ...bodyData,
      postContent: formData.postContent,
      desiredDate: formData.desiredDate,
      discussions: formData.discussions,
      finalKeywords: formData.keywords,
      finalCrew: formData.crew,
      finalDescription: formData.description,
      finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString()
    };

    const targetStatus = isDraft ? 'approved' : 'final_submitted';

    const { error } = await supabase.from('contents')
      .update({
        final_url: formData.finalUrl,
        content_body: JSON.stringify(updatedBody),
        status: targetStatus
      })
      .eq('id', formData.proposalId);

    if (error) {
      alert('제출 중 오류가 발생했습니다: ' + error.message);
    } else {
      delete globalFinalCache[initialId || 'new'];
      alert(isDraft ? '임시저장 되었습니다.' : '완성본이 성공적으로 제출되었습니다.');
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

  if (isLoadingProps) return <div className="container">데이터 불러오는 중...</div>;

  return (
    <div className={embeddedId ? '' : 'container'} style={{ paddingBottom: embeddedId ? '0' : '4rem', width: '100%', height: embeddedId ? '100%' : 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', padding: embeddedId ? '1.5rem' : '3rem', boxShadow: embeddedId ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h2 style={{ fontSize: embeddedId ? '1.5rem' : '2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>완성본 {isReadOnly && '미리보기'}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={loadDrafts} style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              임시저장함
            </button>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
              작성자: {authorName} / {new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '')}
            </div>
          </div>
        </div>

        {showDrafts && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.98)', zIndex: 100, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>완성본 임시저장함</h3>
              <button type="button" onClick={() => setShowDrafts(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {drafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', opacity: 0.5 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>
                  <p style={{ margin: 0, fontWeight: 600 }}>완성본 임시저장 내역이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {drafts.map(d => {
                    let dEmail = '';
                    let body = {};
                    try { 
                        body = JSON.parse(d.content_body);
                        dEmail = (body as any).authorEmail; 
                    } catch(e) {}
                    return (
                      <div key={d.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => useDraft(d)} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94a3b8'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{d.title}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {new Date(d.created_at).toLocaleDateString('ko-KR')} · {d.team} · {d.content_type}
                          </span>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteDraft(d.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <form autoComplete="off" onSubmit={(e) => handleSubmit(e, false)} className="flex-col gap-6">
          {/* 기획안 선택 (선택 시 해당 정보 표시용) */}
          <div className="flex-col gap-2" style={{ display: initialId ? 'none' : 'flex' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>대상 기획안 선택</label>
            <select 
              name="proposalId"
              value={formData.proposalId} 
              onChange={(e) => {
                 handleChange(e);
                 const propId = e.target.value;
                 if (propId) {
                    supabase.from('contents').select('*').eq('id', propId).single().then(({data}) => {
                       setSelectedProposal(data);
                       try {
                          const body = JSON.parse(data.content_body);
                          setFormData(prev => ({
                             ...prev,
                             keywords: data.keywords || '',
                             crew: prev.crew || body.crew || (data.description ? data.description.split(' (참여:')[0] : '')
                          }));
                       } catch(e) {}
                    });
                 } else {
                    setSelectedProposal(null);
                 }
              }}
              required
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}
              disabled={!!initialId || isReadOnly || isSubmitting}
            >
              <option value="">-- 제출할 기획안을 선택하세요 --</option>
              {availableProposals.map(p => (
                <option key={p.id} value={p.id}>{`[${p.author_name}] ${p.title}`}</option>
              ))}
            </select>
          </div>

          {/* Preview Area */}
          {selectedProposal && (
            <div style={{ marginBottom: '1rem' }}>
              {(() => {
                const ytId = getYoutubeVideoId(formData.finalUrl);
                const gdInfo = getGoogleDriveInfo(formData.finalUrl);
                
                return (
                  <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    {/* Cover image or Embed */}
                    <div style={{ width: '100%', height: '300px', backgroundColor: '#e2e8f0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '16px' }}>
                       {ytId ? (
                           <iframe 
                             src={`https://www.youtube.com/embed/${ytId}`} 
                             style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                             frameBorder="0" 
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                             allowFullScreen
                           />
                       ) : gdInfo ? (
                           <iframe 
                             src={gdInfo.type === 'folder' 
                               ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list`
                               : `https://drive.google.com/file/d/${gdInfo.id}/preview`} 
                             style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                             frameBorder="0" 
                             allowFullScreen
                           />
                       ) : (
                           // Placeholder cover (Google Drive colors)
                           <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4285F4 25%, #34A853 25%, #34A853 50%, #FBBC05 50%, #FBBC05 75%, #EA4335 75%)', opacity: 0.9 }}>
                               <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                                   <button type="button" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                                      Open Drive <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                   </button>
                               </div>
                           </div>
                       )}
                    </div>
                    {/* Proposal Info */}
                    <div style={{ paddingTop: '1.5rem', backgroundColor: '#ffffff' }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{selectedProposal.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.8rem', fontWeight: 500 }}>
                        {selectedProposal.author_name} / {selectedProposal.team} / {selectedProposal.content_type}
                      </div>
                      {formData.finalUrl && (
                        <a href={formData.finalUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#10b981', textDecoration: 'none', wordBreak: 'break-all', fontWeight: 500 }}>
                          {formData.finalUrl}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 구글 드라이브 링크 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>구글 드라이브 / 유튜브 링크 <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="url" 
              name="finalUrl" 
              value={formData.finalUrl} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              required 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', fontSize: '1rem', outline: 'none' }} 
            />
          </div>

          {/* 본문 / 캡션 내용 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>본문 / 캡션 내용</label>
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '0.5rem', border: 'none' }}>
                <RichTextEditor 
                  value={formData.postContent} 
                  onChange={(val) => setFormData({...formData, postContent: val})} 
                  placeholder="내용을 입력해주세요" 
                  disabled={isReadOnly || isSubmitting} 
                  minHeight="150px" 
                />
            </div>
          </div>

          {/* 해시태그 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>#해시태그 (쉼표로 구분, 기획안 연동)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '8px' }}>
              <div style={{ backgroundColor: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <input type="text" name="keywords" value={formData.keywords} onChange={(e) => {
                  const parts = e.target.value.split(',');
                  if (parts.length > 5) {
                    setFormData(prev => ({ ...prev, keywords: parts.slice(0, 5).join(',') }));
                  } else {
                    handleChange(e);
                  }
              }} placeholder="기획안을 선택하면 자동으로 불러와집니다. (쉼표로 구분)" disabled={isReadOnly || isSubmitting} style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem' }} />
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

          {/* 제작 인원 */}
          <div className="flex-col gap-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>제작 인원 (자동완성, 수정가능하도록 접근 오픈)</label>
              {!isReadOnly && !isSubmitting && (
                <button type="button" onClick={() => setIsCrewEditable(!isCrewEditable)} style={{ backgroundColor: isCrewEditable ? '#f1f5f9' : '#1e3a8a', color: isCrewEditable ? '#475569' : 'white', border: isCrewEditable ? '1px solid #cbd5e1' : 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {isCrewEditable ? '수정 완료' : '수정하기'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
               {/* Avatars */}
               {formData.crew ? formData.crew.split(',').map(s=>s.trim()).filter(Boolean).map((name, index) => {
                 const formattedName = formatCrewName(name);
                 const cleanName = name.replace(/^\d+(기)?\s+/, '');
                 const cleanAuthorName = authorName?.replace(/^\d+(기)?\s+/, '');
                 const firstLetter = cleanName[0] || '?';
                 const isFirst = index === 0;
                 return (
                 <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: isFirst ? '#1E3A8A' : '#0284C7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                       {firstLetter}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{formattedName}</span>
                    
                    {!isReadOnly && !isSubmitting && isCrewEditable && cleanName !== cleanAuthorName && (
                      <button type="button" onClick={() => {
                        const newCrew = formData.crew.split(',').map(s=>s.trim()).filter(n => n !== name).join(', ');
                        setFormData({...formData, crew: newCrew});
                      }} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}>
                        ✕
                      </button>
                    )}
                 </div>
               )}) : null}
               
               {!isReadOnly && !isSubmitting && isCrewEditable && (
                 <div style={{ position: 'relative' }}>
                   <button type="button" onClick={() => setShowMemberSelect(!showMemberSelect)} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px dashed #cbd5e1', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                   </button>
                   
                   {showMemberSelect && (
                     <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '10px', width: '300px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ padding: '0.8rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                         <input 
                           type="text" 
                           placeholder="이름 검색..." 
                           value={memberSearchQuery} 
                           onChange={e => setMemberSearchQuery(e.target.value)} 
                           style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} 
                         />
                       </div>
                       <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
                         {allProfiles
                           .filter(p => p.author_name && (!memberSearchQuery || p.author_name.includes(memberSearchQuery)))
                           .map(p => {
                             const cleanNameP = p.author_name.replace(/^\d+(기)?\s+/, '');
                             const isSelected = formData.crew ? formData.crew.split(',').map(s=>s.trim().replace(/^\d+(기)?\s+/, '')).includes(cleanNameP) : false;
                             return (
                               <div 
                                 key={p.author_name + p.team} 
                                 onClick={() => {
                                     let crewArray = formData.crew ? formData.crew.split(',').map(s => s.trim()).filter(Boolean) : [];
                                     const cleanAuthorName = authorName?.replace(/^\d+(기)?\s+/, '');
                                     if (isSelected) {
                                         if (cleanNameP !== cleanAuthorName) {
                                            crewArray = crewArray.filter(name => name.replace(/^\d+(기)?\s+/, '') !== cleanNameP);
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
                             );
                           })}
                       </div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>

          {/* 비고 */}
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>비고</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="내용을 입력해주세요" 
              rows={3} 
              disabled={isReadOnly || isSubmitting} 
              style={{ border: 'none', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '8px', outline: 'none', resize: 'vertical' }} 
            />
          </div>

          {/* Buttons */}
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #1e3a8a', backgroundColor: '#ffffff', color: '#1e3a8a', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                임시저장
              </button>
              <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                {isSubmitting ? '처리 중...' : '제출하기'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleClose} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '2px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                목록으로
              </button>
              {initialId && (isAdmin || isAuthor) && (
                <button type="button" onClick={() => setIsReadOnly(false)} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                  수정하기
                </button>
              )}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
