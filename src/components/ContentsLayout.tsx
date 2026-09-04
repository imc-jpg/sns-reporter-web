'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import FinalSubmitForm from '@/components/FinalSubmitForm';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/RichTextEditor';
import CalendarPicker from '@/components/CalendarPicker';
import ModalLink from '@/components/ModalLink';
import { useModal } from '@/contexts/ModalContext';
import AdminStatusManager from '@/components/AdminStatusManager';
import { deleteContent } from '@/app/actions/content';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';
import CopyableBlock, { htmlToPlainText } from '@/components/CopyableBlock';
import { DriveColorIcon } from '@/components/mobile/driveIcons';
import { sanitizeHtml } from '@/utils/sanitize';
import { recommendHashtagsFromContent, cleanAuthorName } from '@/utils/dateUtils';
import ContentsHeader from '@/components/contents/ContentsHeader';
import UnifiedDraftsModal from '@/components/contents/UnifiedDraftsModal';


// Helper to parse simple markdown to HTML (Bold, Italic, Strikethrough, Safe Links)
const parseCommentMarkdown = (text: string): string => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 800 !important; display: inline;">$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong style="font-weight: 800 !important; display: inline;">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style: italic !important; display: inline;">$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em style="font-style: italic !important; display: inline;">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del style="text-decoration: line-through !important; display: inline;">$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; font-weight: 700; text-decoration: underline;">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

// Helper to get all replies for a given root comment recursively, ordered flat for Thread layout
const getAllReplies = (rootId: number, allComments: any[]): any[] => {
  const result: any[] = [];
  const traverse = (parentId: number, currentDepth: number) => {
    const children = allComments.filter((c: any) => c.parentId === parentId);
    // Sort children by createdAt/id to keep chronological order
    children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const child of children) {
      result.push({
        ...child,
        depth: currentDepth
      });
      traverse(child.id, currentDepth + 1);
    }
  };
  traverse(rootId, 1);
  return result;
};

type ContentItem = {
  id: number;
  title: string;
  author_name: string;
  team: string;
  content_type: string;
  status: string;
  created_at: string;
  final_url?: string;
  isMine: boolean;
  parsedCrew: string;
  articleType: string;
  docsUrl: string;
  targetMonth: string;
  finalSubmittedAt: string;
  content_body: string;
  keywords?: string;
  intent?: string;
  description?: string;
};

export default function ContentsLayout({ 
  initialContents = [], 
  currentUserEmail: initialUserEmail = null, 
  currentUserName: initialUserName = null,
  openModalId,
  modalOnly = false,
  onModalClose,
  searchQuery,
  pageTitle,
  isTraineeMode: propsIsTraineeMode = false
}: { 
  initialContents?: ContentItem[], 
  currentUserEmail?: string | null,
  currentUserName?: string | null,
  openModalId?: number,
  modalOnly?: boolean,
  onModalClose?: () => void,
  searchQuery?: string,
  pageTitle?: string,
  isTraineeMode?: boolean
}) {
  const router = useRouter();
  const { openProposalModal, openFinalWorkModal } = useModal();
  const supabase = createClient();

  const isTraineeMode = propsIsTraineeMode || (pageTitle ? pageTitle.includes('수습') : false);
  const [selectedGen, setSelectedGen] = useState<string>('26기');

  const getGen = (item: any) => {
    if (!item) return '25기';
    const text = `${item.author_name || ''} ${item.keywords || ''} ${item.title || ''} ${item.parsedCrew || ''} ${item.team || ''}`;
    const m = text.match(/(\d{2})기/);
    return m ? `${m[1]}기` : '25기';
  };

  const HighlightText = ({ text, query }: { text: string, query?: string }) => {
    if (!query || !text) return <>{text}</>;
    const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} style={{ backgroundColor: '#ffeb3b', color: '#1e293b', fontWeight: 'bold', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
            : part
        )}
      </>
    );
  };

  const [contentsList, setContentsList] = useState<ContentItem[]>(initialContents);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  // [P-O] content_body 파싱을 selectedContent 변경 시에만 1회 실행
  // 기존: 17곳에서 매 렌더마다 JSON.parse(selectedContent.content_body) 중복 호출
  const selectedBodyObj = useMemo(() => {
    try { return JSON.parse(selectedContent?.content_body || '{}'); }
    catch { return {}; }
  }, [selectedContent?.content_body]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterByMine, setFilterByMine] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // 통합 임시저장함 상태
  const [showUnifiedDrafts, setShowUnifiedDrafts] = useState(false);
  const [unifiedDrafts, setUnifiedDrafts] = useState<{ proposals: any[], finals: any[] }>({ proposals: [], finals: [] });
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  const loadUnifiedDrafts = async () => {
    setIsLoadingDrafts(true);
    setShowUnifiedDrafts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profileRow } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).maybeSingle();
      const userName = cleanAuthorName(profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name);

      const { data } = await supabase.from('contents').select('*').in('status', ['draft', 'approved']).order('created_at', { ascending: false });
      
      const proposals: any[] = [];
      const finals: any[] = [];

      (data || []).forEach(d => {
        let emailInJson = '';
        let hasFinalData = false;
        try { 
           const body = JSON.parse(d.content_body);
           emailInJson = body.authorEmail; 
           if (d.final_url || body.postContent || body.finalKeywords) {
              hasFinalData = true;
           }
        } catch(e) {}
        
        const isMine = emailInJson === user.email || d.author_name === user.email || d.author_name === userName || (userName && d.author_name?.includes(userName));
        
        if (isMine) {
           if (d.status === 'draft') proposals.push(d);
           else if (d.status === 'approved' && hasFinalData) finals.push(d);
        }
      });
      
      setUnifiedDrafts({ proposals, finals });
    } catch(e) {
       console.error(e);
    } finally {
       setIsLoadingDrafts(false);
    }
  };

  const handleDraftClick = (draft: any, type: 'proposal' | 'final') => {
    setShowUnifiedDrafts(false);
    if (type === 'proposal') {
       openProposalModal(draft.id.toString());
    } else {
       openFinalWorkModal(draft.id.toString());
    }
  };

  const handleDeleteUnifiedDraft = async (e: any, draftId: number, type: 'proposal' | 'final') => {
    e.stopPropagation();
    if (type === 'proposal') {
       if (!confirm('기획안 임시저장 내역을 삭제하시겠습니까?')) return;
       await supabase.from('contents').update({ status: 'deleted' }).eq('id', draftId);
       setUnifiedDrafts(prev => ({ ...prev, proposals: prev.proposals.filter(d => d.id !== draftId) }));
    } else {
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
       setUnifiedDrafts(prev => ({ ...prev, finals: prev.finals.filter(d => d.id !== draftId) }));
    }
  };

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(initialUserEmail);
  const [currentUserName, setCurrentUserName] = useState<string | null>(initialUserName);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<number[]>([]);

  // Right pane smooth scroll-following engine
  const contentsContainerRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const [rightPaneTranslateY, setRightPaneTranslateY] = useState(0);

  useEffect(() => {
    let scrollEl: HTMLElement | Window | null = null;
    let curr = contentsContainerRef.current?.parentElement;
    while (curr) {
      const style = window.getComputedStyle(curr);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollEl = curr;
        break;
      }
      curr = curr.parentElement;
    }
    if (!scrollEl) scrollEl = window;

    const handleScroll = () => {
      if (!contentsContainerRef.current || !rightPaneRef.current) return;
      const containerRect = contentsContainerRef.current.getBoundingClientRect();
      const paneHeight = rightPaneRef.current.offsetHeight;
      const containerHeight = contentsContainerRef.current.offsetHeight;
      const maxTranslate = Math.max(0, containerHeight - paneHeight);

      // 상단에서 16px 위치를 유지하며 좌측 리스트 높이 범위 내에서 따라 내려옴
      const topOffset = 16;
      let target = -containerRect.top + topOffset;

      if (target < 0) target = 0;
      if (target > maxTranslate) target = maxTranslate;

      setRightPaneTranslateY(target);
    };

    const target = scrollEl;
    target.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // [5단계] Supabase Realtime 실시간 동기화
  useEffect(() => {
    const channel = supabase
      .channel('contents-layout-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setContentsList(prev => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setContentsList(prev => prev.map(c => c.id === (payload.new as any).id ? { ...c, ...(payload.new as any) } : c));
            setSelectedContent(prev => prev && prev.id === (payload.new as any).id ? { ...prev, ...(payload.new as any) } : prev);
          } else if (payload.eventType === 'DELETE') {
            setContentsList(prev => prev.filter(c => c.id !== (payload.old as any).id));
            setSelectedContent(prev => prev && prev.id === (payload.old as any).id ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    async function fetchUser() {
      if (!initialUserEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserEmail(user.email || null);
          const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user.email}`).maybeSingle();
          if (profile) setCurrentUserName(profile.author_name || null);
        }
      } else {
        setCurrentUserEmail(initialUserEmail);
        setCurrentUserName(initialUserName);
      }
    }
    fetchUser();
  }, [initialUserEmail, initialUserName, supabase]);

  // Pagination & Unsubmitted Modal States
  const [showUnsubmittedModal, setShowUnsubmittedModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };
  
   
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const modalMouseDownOnBackdrop = useRef(false);
  const draftsModalMouseDownOnBackdrop = useRef(false);

  const handleDeleteContent = async () => {
    if (!selectedContent) return;
    
    // Determine if final work is uploaded
    const isFinalWorkUploaded = ['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(selectedContent.status) || !!selectedContent.final_url;
    
    if (isFinalWorkUploaded) {
      if (!confirm('이 콘텐츠의 완성본을 삭제하시겠습니까? (기획안은 유지됩니다)')) return;
    } else {
      if (!confirm('정말로 이 콘텐츠(기획안)를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    }
    
    setIsDeleting(true);
    const res = await deleteContent(String(selectedContent.id), isFinalWorkUploaded);
    setIsDeleting(false);
    
    if (res.success) {
      if (isFinalWorkUploaded) {
        // Just refresh the selectedContent to show the proposal view
        const { data } = await supabase.from('contents').select('*').eq('id', selectedContent.id).single();
        if (data) setSelectedContent(data);
        setIsFinalWorkView(false);
        router.refresh();
      } else {
        setContentsList(prev => prev.filter(c => c.id !== selectedContent.id));
        setSelectedContent(null);
        setIsModalOpen(false);
        if (onModalClose) onModalClose();
        router.refresh();
      }
    } else {
      alert(res.error || '삭제에 실패했습니다.');
    }
  };
  // Keep a ref so the openModalId effect can read the latest list without re-running on every list change
  const contentsListRef = React.useRef(contentsList);
  useEffect(() => { contentsListRef.current = contentsList; }, [contentsList]);

  const [isFetchingModal, setIsFetchingModal] = useState(false);
  useEffect(() => {
    if (!openModalId) return;
    const fetchItem = async () => {
      setIsFetchingModal(true);
      const { data } = await supabase.from('contents').select('*').eq('id', openModalId).single();
      if (data) {
        setSelectedContent(data);
        setIsModalOpen(true);
        setIsFinalWorkView(['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(data.status));
      }
      setIsFetchingModal(false);
    };
    fetchItem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModalId]);

  const [isFinalWorkView, setIsFinalWorkView] = useState(false);
  
  // Comments editing and Rich Features
  const [newComment, setNewComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSecretComment, setIsSecretComment] = useState(false);
  useEffect(() => {
    if (isGlobalAdmin) {
      setIsSecretComment(true);
    }
  }, [isGlobalAdmin, currentUserEmail]);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [replyAttachedImage, setReplyAttachedImage] = useState<string | null>(null);
  const [attachedLinkUrl, setAttachedLinkUrl] = useState('');
  const [attachedLinkText, setAttachedLinkText] = useState('');
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState<number | null>(null);
  
  // Proposal editing
  const [tempFormData, setTempFormData] = useState({
    title: '',
    team: '',
    targetMonth: '',
    articleType: '',
    contentType: '',
    crew: '',
    docsUrl: '',
    intent: '',
    composition: '',
    contentBody: '',
    keywords: '',
    desiredDate: '',
    desiredDateEnd: '',
    deadline: '',
    description: '',
    status: '',
    timeliness: '상관없음'
  });
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [isEditingFinalWork, setIsEditingFinalWork] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [activeCrewTab, setActiveCrewTab] = useState<'my_team' | 'other_teams'>('my_team');

  // NOTE: initialContents is only passed once from a Server Component parent,
  // so no sync effect is needed. Local mutations (comments, edits) update
  // contentsList directly via setContentsList calls throughout this component.

  // Load profiles for member search — stable ref prevents re-triggering
  const supabaseRef = React.useRef(supabase);
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabaseRef.current.from('contents').select('author_name, team, keywords').like('title', 'PROFILE_%');
      if (data) {
        setAllProfiles(data);
      }
    };
    fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Copy to tempFormData when selectedContent is loaded/changed
  // Use .id as dep to avoid re-triggering on new object references with same data
  const selectedContentId = selectedContent?.id ?? null;
  useEffect(() => {
    if (selectedContent) {
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}
      
      setTempFormData({
        title: selectedContent.title || '',
        team: selectedContent.team || '',
        targetMonth: bodyObj.targetMonth || selectedContent.targetMonth || '',
        articleType: selectedContent.articleType || '',
        contentType: selectedContent.content_type || '',
        crew: bodyObj.crew || selectedContent.parsedCrew || '',
        docsUrl: bodyObj.docsUrl || selectedContent.docsUrl || '',
        intent: bodyObj.intent || '',
        composition: bodyObj.composition || '',
        contentBody: bodyObj.contentBody || '',
        keywords: selectedContent.keywords || '',
        desiredDate: bodyObj.desiredDate || '',
        desiredDateEnd: bodyObj.desiredDateEnd || '',
        deadline: bodyObj.deadline || '',
        description: selectedContent.description || '',
        status: selectedContent.status || '',
        timeliness: bodyObj.timeliness || '상관없음'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentId]); // only re-run when the selected item actually changes

  
  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = isGlobalAdmin;
    const isCommentAuthor = msg.author && (msg.author === currentUserFullName || msg.author === currentUserEmail);
    
    return isAdmin || isCommentAuthor || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };

  const canDeleteContent = (item: any) => {
    if (!item) return false;
    let emailInJson = '';
    try {
      const obj = JSON.parse(item.content_body || '{}');
      emailInJson = obj.author_email || '';
    } catch (e) {}

    const isOwnAuthor = currentUserEmail && (
      emailInJson === currentUserEmail || 
      item.author_name === currentUserEmail || 
      item.author_name === currentUserName ||
      (currentUserName && item.author_name?.includes(currentUserName))
    );
    const isAdmin = isGlobalAdmin;
    return isOwnAuthor || isAdmin;
  };

  const handleDeleteSelected = async () => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    try {
      const { error } = await supabase
        .from('contents')
        .update({ status: 'deleted' })
        .in('id', selectedForDelete);
        
      if (error) throw error;
      
      setContentsList(prev => prev.filter(item => !selectedForDelete.includes(item.id)));
      setSelectedForDelete([]);
      alert('삭제되었습니다.');
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const formatCrewName = (name: string) => {
    if (!name) return '';
    const pureName = cleanAuthorName(name);
    if (/^\d+기\s+/.test(pureName)) return pureName;
    if (/^\d+\s+/.test(pureName)) return pureName.replace(/^(\d+)\s+/, '$1기 ');
    
    const cleanName = pureName.replace(/^\d+(기)?\s+/, '');
    const profile = allProfiles.find(p => cleanAuthorName(p.author_name) === cleanName || cleanAuthorName(p.author_name) === pureName);
    if (profile && profile.keywords) {
      const kw = profile.keywords.toString().trim();
      const generation = kw.endsWith('기') ? kw : `${kw}기`;
      return `${generation} ${cleanName}`;
    }
    return pureName;
  };

  // Comment edit states
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');

  const canEditOrDeleteComment = (comment: any) => {
    if (!comment) return false;
    if (isGlobalAdmin) return true;
    if (currentUserEmail && comment.authorEmail === currentUserEmail) return true;
    if (currentUserName && comment.author === currentUserName) return true;
    return false;
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editingCommentText.trim() || !selectedContent) return;

    try {
      const { data: freshContent } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', selectedContent.id)
        .single();

      let bodyObj: any = {};
      try { bodyObj = JSON.parse(freshContent?.content_body || '{}'); } catch (e) {}

      const discussions = bodyObj.discussions || [];
      const updatedDiscussions = discussions.map((d: any) => {
        if (d.id === editingCommentId) {
          return {
            ...d,
            text: editingCommentText.trim(),
            updatedAt: new Date().toISOString(),
            isEdited: true
          };
        }
        return d;
      });

      const updatedBody = { ...bodyObj, discussions: updatedDiscussions };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', selectedContent.id);

      if (error) throw error;

      const updatedItem = { ...selectedContent, content_body: JSON.stringify(updatedBody) };
      setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
      setSelectedContent(updatedItem);
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err: any) {
      alert('댓글 수정에 실패했습니다: ' + err.message);
    }
  };

  const handleDeleteCommentNode = async (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까? (하위 답글이 있는 경우 함께 삭제됩니다)')) return;
    if (!selectedContent) return;

    try {
      const { data: freshContent } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', selectedContent.id)
        .single();

      let bodyObj: any = {};
      try { bodyObj = JSON.parse(freshContent?.content_body || '{}'); } catch (e) {}

      const discussions = bodyObj.discussions || [];
      const idsToDelete = new Set<number>([commentId]);
      let added = true;
      while (added) {
        added = false;
        discussions.forEach((d: any) => {
          if (d.parentId && idsToDelete.has(d.parentId) && !idsToDelete.has(d.id)) {
            idsToDelete.add(d.id);
            added = true;
          }
        });
      }

      const updatedDiscussions = discussions.filter((d: any) => !idsToDelete.has(d.id));
      const updatedBody = { ...bodyObj, discussions: updatedDiscussions };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', selectedContent.id);

      if (error) throw error;

      const updatedItem = { ...selectedContent, content_body: JSON.stringify(updatedBody) };
      setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
      setSelectedContent(updatedItem);
    } catch (err: any) {
      alert('댓글 삭제에 실패했습니다: ' + err.message);
    }
  };

  // Comments addition logic
  const handleAddComment = async (parentId: number | null = null, replyText: string = '', isReply: boolean = false) => {
    const textToSend = isReply ? replyText : newComment;
    const imgToSend = isReply ? replyAttachedImage : attachedImage;
    
    if (!textToSend.trim() && !imgToSend) return;
    
    if (!isReply) {
      setIsSavingComment(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${user?.email}`).maybeSingle();
      const displayName = cleanAuthorName(profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name) || user?.email?.split('@')[0] || '익명 크루';

      let emailInJson = '';
      try {
        emailInJson = JSON.parse(selectedContent!.content_body).authorEmail;
      } catch (e) {}
      
      const isAuthor = user && (emailInJson === user.email || selectedContent!.author_name === user.email || (displayName && selectedContent!.author_name?.includes(displayName)));
      const isAdmin = isGlobalAdmin || user?.user_metadata?.is_admin === true || user?.email === 'admin@admin.com';

      const messageAttachment = imgToSend ? [{ type: 'image' as const, url: imgToSend }] : [];

      const message = {
        id: Date.now(),
        parentId: parentId, // 부모 댓글 ID
        type: isFinalWorkView ? ('final' as const) : ('proposal' as const), // 기획안 피드백 / 완성본 피드백 구분
        role: isAdmin ? ('admin' as const) : (isAuthor ? ('writer' as const) : ('crew' as const)),
        text: textToSend,
        createdAt: new Date().toISOString(),
        author: displayName,
        likes: 0,
        likedBy: [] as string[],
        attachments: messageAttachment,
        isSecret: isSecretComment
      };

      // [B2] update 직전 content_body를 재조회하여 stale 덮어쓰기 방지
      const { data: freshContent } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', selectedContent!.id)
        .single();

      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(freshContent?.content_body || '{}');
      } catch (e) {}

      const updatedDiscussions = [...(bodyObj.discussions || []), message];
      const updatedBody = {
        ...bodyObj,
        discussions: updatedDiscussions
      };

      const { error } = await supabase
        .from('contents')
        .update({
          content_body: JSON.stringify(updatedBody)
        })
        .eq('id', selectedContent!.id);

      if (error) {
        alert('피드백 저장에 실패했습니다: ' + error.message);
      } else {
        const updatedItem = {
          ...selectedContent!,
          content_body: JSON.stringify(updatedBody)
        };
        
        setContentsList(prev => prev.map(item => item.id === selectedContent!.id ? updatedItem : item));
        setSelectedContent(updatedItem);
        
        if (isReply) {
          setReplyComment('');
          setReplyAttachedImage(null);
          setActiveReplyId(null);
        } else {
          setNewComment('');
          setAttachedImage(null);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSavingComment(false);
    }
  };

  // Comments Like Toggle logic
  const handleToggleLike = async (commentId: number) => {
    if (!selectedContent) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'anonymous';
      
      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}

      const discussions = bodyObj.discussions || [];
      const updatedDiscussions = discussions.map((msg: any) => {
        if (msg.id === commentId) {
          const likedBy = msg.likedBy || [];
          const hasLiked = likedBy.includes(userEmail);
          let newLikedBy = [];
          if (hasLiked) {
            newLikedBy = likedBy.filter((email: string) => email !== userEmail);
          } else {
            newLikedBy = [...likedBy, userEmail];
          }
          return {
            ...msg,
            likedBy: newLikedBy,
            likes: newLikedBy.length
          };
        }
        return msg;
      });

      const updatedBody = {
        ...bodyObj,
        discussions: updatedDiscussions
      };

      const { error } = await supabase
        .from('contents')
        .update({
          content_body: JSON.stringify(updatedBody)
        })
        .eq('id', selectedContent.id);

      if (error) {
        console.error('좋아요 저장 실패:', error.message);
      } else {
        const updatedItem = {
          ...selectedContent,
          content_body: JSON.stringify(updatedBody)
        };
        setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
        setSelectedContent(updatedItem);
      }
    } catch (err) {
      console.error('좋아요 토글 오류:', err);
    }
  };

  // Helper to insert markdown or emoji at textarea cursor, supporting wrapping of selected text!
  const insertTextAtCursor = (markupType: 'bold' | 'italic' | 'strikethrough' | string, isReply: boolean = false) => {
    const targetId = isReply ? `reply-textarea-${activeReplyId}` : 'main-comment-textarea';
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentVal = isReply ? replyComment : newComment;
      
      let textToInsert = '';
      let selectionOffset = 0;
      let selectionLength = 0;

      const selectedText = currentVal.substring(start, end);

      if (markupType === 'bold') {
        textToInsert = `**${selectedText || '텍스트'}**`;
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 3; // "텍스트" length is 3
      } else if (markupType === 'italic') {
        textToInsert = `*${selectedText || '텍스트'}*`;
        selectionOffset = 1;
        selectionLength = selectedText ? selectedText.length : 3;
      } else if (markupType === 'strikethrough') {
        textToInsert = `~~${selectedText || '텍스트'}~~`;
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 3;
      } else {
        // Plain text (emoji or link)
        textToInsert = markupType;
        selectionOffset = markupType.length;
        selectionLength = 0;
      }

      const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
      
      if (isReply) {
        setReplyComment(newVal);
      } else {
        setNewComment(newVal);
      }

      setTimeout(() => {
        textarea.focus();
        if (markupType === 'bold' || markupType === 'italic' || markupType === 'strikethrough') {
          // Select the wrapped text (either the original selected text or the default "텍스트")
          textarea.setSelectionRange(start + selectionOffset, start + selectionOffset + selectionLength);
        } else {
          textarea.setSelectionRange(start + selectionOffset, start + selectionOffset);
        }
      }, 10);
    } else {
      let textToInsert = '';
      if (markupType === 'bold') textToInsert = '**텍스트**';
      else if (markupType === 'italic') textToInsert = '*텍스트*';
      else if (markupType === 'strikethrough') textToInsert = '~~텍스트~~';
      else textToInsert = markupType;

      if (isReply) {
        setReplyComment(prev => prev + textToInsert);
      } else {
        setNewComment(prev => prev + textToInsert);
      }
    }
  };


  // Helper to handle image files and convert them to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('이미지 크기는 최대 2MB까지 허용됩니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isReply) {
          setReplyAttachedImage(reader.result as string);
        } else {
          setAttachedImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Proposal edit saving logic
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;
    setIsSavingProposal(true);

    try {
      const crewCount = tempFormData.crew ? tempFormData.crew.split(',').map(s => s.trim()).filter(Boolean).length : 0;
      const computedArticleType = tempFormData.articleType || (crewCount > 1 ? '팀기사' : '개인기사');

      let bodyObj: any = {};
      try {
        bodyObj = JSON.parse(selectedContent.content_body || '{}');
      } catch (e) {}

      const updatedBody = {
        ...bodyObj,
        ...tempFormData,
        articleType: computedArticleType,
        crew: tempFormData.crew
      };

      let newStatus = selectedContent.status;
      if (selectedContent.status === 'revision' || selectedContent.status === 'final_revision') {
        newStatus = 'review_required';
      }

      const payload = {
        title: tempFormData.title,
        team: tempFormData.team,
        content_type: tempFormData.contentType,
        keywords: tempFormData.keywords,
        intent: tempFormData.intent,
        description: tempFormData.description,
        content_body: JSON.stringify(updatedBody),
        status: newStatus
      };

      const { error } = await supabase
        .from('contents')
        .update(payload)
        .eq('id', selectedContent.id);

      if (error) {
        alert('기획안 저장에 실패했습니다: ' + error.message);
      } else {
        alert('기획안이 성공적으로 수정되었습니다.');
        
        const updatedItem = {
          ...selectedContent,
          ...payload,
          articleType: computedArticleType,
          parsedCrew: tempFormData.crew,
          docsUrl: tempFormData.docsUrl
        };
        
        setContentsList(prev => prev.map(item => item.id === selectedContent.id ? updatedItem : item));
        setSelectedContent(updatedItem);
      }
    } catch (err: any) {
      console.error(err);
      alert('오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSavingProposal(false);
    }
  };

  const displayContents = useMemo(() => {
    let result = [...contentsList];

    if (isTraineeMode) {
      if (selectedGen !== 'ALL') {
        result = result.filter(item => getGen(item) === selectedGen);
      }
    } else {
      // Filter by Selected Month & Year
      const pad = (n: number) => String(n).padStart(2, '0');
      const monthPrefix = `${selectedYear}-${pad(selectedMonth)}`;
      result = result.filter(item => {
        const dateStr = item.created_at ? item.created_at.split('T')[0] : '';
        const cMonth = item.targetMonth || dateStr.substring(0, 7);
        return cMonth === monthPrefix;
      });
    }

    if (filterByMine) {
      result = result.filter(item => item.isMine);
    }
    if (filterType !== 'ALL') {
      result = result.filter(item => item.content_type === filterType || item.team === filterType);
    }
    
    if (sortConfig) {
      result = result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';
        if (sortConfig.key === 'channel') { valA = a.team; valB = b.team; }
        else if (sortConfig.key === 'type') { valA = a.content_type; valB = b.content_type; }
        else if (sortConfig.key === 'title') { valA = a.title; valB = b.title; }
        else if (sortConfig.key === 'crew') { valA = a.parsedCrew || a.author_name; valB = b.parsedCrew || b.author_name; }
        else if (sortConfig.key === 'articleType') { valA = a.articleType; valB = b.articleType; }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [contentsList, filterByMine, filterType, sortConfig, selectedYear, selectedMonth, selectedGen, isTraineeMode]);

  const groupedContents = useMemo(() => {
     if (sortConfig) {
       return { groups: { '전체 정렬 목록': displayContents }, sortedKeys: ['전체 정렬 목록'] };
     }
     const groups: Record<string, ContentItem[]> = {};
     displayContents.forEach(item => {
        if (isTraineeMode) {
          const genKey = `${getGen(item)} 수습 단원`;
          if (!groups[genKey]) groups[genKey] = [];
          groups[genKey].push(item);
        } else {
          let monthStr = item.targetMonth;
          if (!monthStr) {
            const d = new Date(item.created_at);
            monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
          const [y, m] = monthStr.split('-');
          const groupKey = `${y.slice(2)}-${parseInt(m, 10)}`;
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(item);
        }
     });

     if (isTraineeMode) {
       const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
       return { groups, sortedKeys };
     }

     // Sort keys descending (e.g. 26-1 -> 25-12 -> 25-11)
     const sortedKeys = Object.keys(groups).sort((a, b) => {
         const [yA, mA] = a.split('-').map(Number);
         const [yB, mB] = b.split('-').map(Number);
         if (yA !== yB) return yB - yA;
         return mB - mA;
     });
     return { groups, sortedKeys };
  }, [displayContents, isTraineeMode]);

  const getTypeStyle = (typeStr: string, team?: string) => {
    let label = typeStr || '기타';
    if (typeStr === '영상(롱폼)') label = '롱폼';
    else if (typeStr === '영상(숏폼)') label = '숏폼';
    else if (typeStr === '글 기사') label = '기사';

    // 모바일 로고 색상 체계와 일치 (유튜브: 레드, 인스타: 노랑/앰버, 블로그: 그린, 단장팀: 블루)
    switch(team) {
      case '유튜브': 
        return { bg: 'rgba(239, 68, 68, 0.18)', text: '#F87171', label };
      case '인스타': 
        return { bg: 'rgba(245, 158, 11, 0.18)', text: '#FBBF24', label };
      case '블로그': 
        return { bg: 'rgba(34, 197, 94, 0.18)', text: '#4ADE80', label };
      case '단장 팀':
      case '단장단 팀': 
        return { bg: 'rgba(59, 130, 246, 0.18)', text: '#60A5FA', label };
      default: 
        return { bg: 'var(--color-surface)', text: 'var(--color-text-muted)', label };
    }
  };

  const getTeamPlatformIcon = (team: string) => {
    if (team === '유튜브') {
      return <YoutubeIcon className="w-6 h-6 flex-shrink-0" style={{ width: '24px', height: '24px' }} />;
    }
    if (team === '인스타') {
      return <InstagramIcon className="w-6 h-6 flex-shrink-0" style={{ width: '24px', height: '24px' }} />;
    }
    if (team === '블로그') {
      return <NaverBlogIcon className="w-6 h-6 flex-shrink-0" style={{ width: '24px', height: '24px' }} />;
    }
    if (team === '단장 팀' || team === '단장단 팀') {
      return (
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
          <img src="/yonsei_media_logo.png" alt="Yonsei Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </div>
      );
    }
    return <GenericPostIcon className="w-6 h-6 flex-shrink-0" style={{ width: '24px', height: '24px' }} />;
  };


  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  const hasDiscussions = (bodyStr: string) => {
    try {
      const obj = JSON.parse(bodyStr);
      return obj.discussions && obj.discussions.length > 0;
    } catch(e) { return false; }
  };
  const getDiscussionsCount = (bodyStr: string, type?: 'proposal' | 'final' | 'all') => {
    try {
      const obj = JSON.parse(bodyStr);
      if (!obj.discussions) return 0;
      if (!type || type === 'all') return obj.discussions.length;
      return obj.discussions.filter((d: any) => (type === 'final' ? d.type === 'final' : (d.type === 'proposal' || !d.type))).length;
    } catch(e) { return 0; }
  };

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

  return (
    <div 
      ref={contentsContainerRef}
      style={modalOnly ? { display: 'none' } : { display: 'flex', gap: '20px', minHeight: 'calc(100vh - 80px)', backgroundColor: 'transparent', padding: '16px', alignItems: 'flex-start', position: 'relative' }}
    >
      
      {/* Left Pane - List */}
      <div className="card motion-card" style={{ flex: '1', display: 'flex', flexDirection: 'column', borderRadius: '24px', padding: 0, overflow: 'hidden' }}>
        
        {/* Header Component */}
        <ContentsHeader
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          filterByMine={filterByMine}
          onFilterByMineChange={setFilterByMine}
          selectedForDeleteCount={selectedForDelete.length}
          onDeleteSelected={handleDeleteSelected}
          onOpenDrafts={loadUnifiedDrafts}
          onOpenNewFinalModal={() => setShowUnsubmittedModal(true)}
          pageTitle={pageTitle}
          isTraineeMode={isTraineeMode}
          selectedGen={selectedGen}
          onGenChange={setSelectedGen}
        />

        {/* Unified Drafts Modal Component */}
        <UnifiedDraftsModal
          isOpen={showUnifiedDrafts}
          onClose={() => setShowUnifiedDrafts(false)}
          isLoading={isLoadingDrafts}
          drafts={unifiedDrafts}
          onDraftClick={handleDraftClick}
          onDeleteDraft={handleDeleteUnifiedDraft}
        />

        {/* List Content Area with Horizontal Scroll Protection */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowX: 'auto', width: '100%' }}>
          <div style={{ minWidth: '720px', display: 'flex', flexDirection: 'column', flex: '1' }}>
            {/* List Header Row */}
            <div style={{ display: 'flex', padding: '12px 24px', backgroundColor: 'var(--table-header-bg, rgba(248, 250, 252, 0.7))', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--color-border, rgba(226, 232, 240, 0.7))', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted, #64748b)', gap: '10px' }}>
              <div style={{ width: '24px' }}></div>
              <div role="button" tabIndex={0} aria-label="채널 기준 정렬" onClick={() => handleSort('channel')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('channel'); } }} style={{ width: '40px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>채널 {sortConfig?.key === 'channel' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
              <div role="button" tabIndex={0} aria-label="유형 기준 정렬" onClick={() => handleSort('type')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('type'); } }} style={{ width: '60px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>유형 {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
              <div role="button" tabIndex={0} aria-label="제목 기준 정렬" onClick={() => handleSort('title')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('title'); } }} style={{ flex: '2', minWidth: '160px', cursor: 'pointer', userSelect: 'none' }}>제목 {sortConfig?.key === 'title' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
              <div role="button" tabIndex={0} aria-label="참여인원 기준 정렬" onClick={() => handleSort('crew')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('crew'); } }} style={{ flex: '1', minWidth: '100px', cursor: 'pointer', userSelect: 'none' }}>참여인원 {sortConfig?.key === 'crew' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
              <div role="button" tabIndex={0} aria-label="기사 구분 기준 정렬" onClick={() => handleSort('articleType')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('articleType'); } }} style={{ width: '60px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>기사 {sortConfig?.key === 'articleType' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div>
              <div style={{ width: '80px', textAlign: 'center' }}>작성일</div>
              <div style={{ width: '60px', textAlign: 'center' }}>피드백</div>
              <div style={{ width: '80px', textAlign: 'center' }}>완성본</div>
            </div>

            {/* List Body */}
            <div style={{ flex: '1', overflowY: 'auto', backgroundColor: 'transparent' }}>
              {displayContents.length === 0 ? (
                <div className="typo-meta" style={{ padding: '40px', textAlign: 'center' }}>해당하는 콘텐츠가 없습니다.</div>
              ) : (
                <div className="content-list-hover-group" style={{ padding: '0 24px 24px 24px' }}>
              {groupedContents.sortedKeys.map(groupKey => (
                <div key={groupKey} style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3b82f6', marginBottom: '8px', paddingLeft: '8px', letterSpacing: '-0.01em' }}>
                    {groupKey}
                  </div>
                  <div style={{ borderTop: '2px solid var(--color-border, #e0e7ff)', paddingTop: '8px' }}>
                    {groupedContents.groups[groupKey].map(item => {
                      const typeStyle = getTypeStyle(item.content_type, item.team);
                      const isSelected = selectedContent?.id === item.id;
                      
                      const mainAuthor = item.author_name || '';
                      let crewRaw = item.parsedCrew || '';
                      if (!crewRaw && item.content_body) {
                        try {
                          const b = typeof item.content_body === 'string' ? JSON.parse(item.content_body) : item.content_body;
                          if (typeof b.crew === 'string') crewRaw = b.crew;
                          else if (Array.isArray(b.crew)) crewRaw = b.crew.map((c: any) => typeof c === 'string' ? c : c.name || '').join(',');
                        } catch (e) {}
                      }
                      if (!crewRaw && item.description) {
                        const m = item.description.match(/참여:\s*([^)]+)/);
                        if (m) crewRaw = m[1];
                      }
                      const allCrew = crewRaw ? crewRaw.split(',').map(s => s.trim()).filter(Boolean) : (mainAuthor ? [mainAuthor] : []);
                      const fullCrewDisplay = allCrew.map(c => formatCrewName(c)).join(', ');

                      return (
                        <div 
                          key={item.id} 
                          className="motion-row motion-btn"
                          onClick={async () => {
                            setIsFetchingModal(true);
                            const { data } = await supabase.from('contents').select('*').eq('id', item.id).single();
                            setSelectedContent(data || item);
                            setIsEditingProposal(false);
                            setIsFetchingModal(false);
                          }}
                          onDoubleClick={async () => {
                            setIsFetchingModal(true);
                            const { data } = await supabase.from('contents').select('*').eq('id', item.id).single();
                            setSelectedContent(data || item);
                            setIsEditingProposal(false);
                            setIsFetchingModal(false);
                            setIsModalOpen(true);
                            setIsFinalWorkView(false);
                          }}
                          style={{ 
                            display: 'flex', padding: '12px 8px', borderBottom: '1px solid var(--color-border, #f1f5f9)', gap: '10px', 
                            alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ width: '24px', display: 'flex', alignItems: 'center' }}>
                            {canDeleteContent(item) ? (
                              <input 
                                type="checkbox" 
                                checked={selectedForDelete.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedForDelete(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedForDelete(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()} 
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }} 
                              />
                            ) : (
                              <div style={{ width: '16px', height: '16px' }} />
                            )}
                          </div>
                          <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                            {getTeamPlatformIcon(item.team)}
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <span 
                              className="typo-badge"
                              style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                            >
                              {typeStyle.label}
                            </span>
                          </div>
                          <div 
                            onClick={(e) => {
                              if (isSelected) {
                                e.stopPropagation();
                                setIsModalOpen(true);
                                setIsFinalWorkView(['final_submitted', 'final_revision', 'completed', 'uploaded'].includes(item.status));
                              }
                            }}
                            title={isSelected ? "한 번 더 클릭하여 상세 모달 열기" : ""}
                            className="typo-h3"
                            style={{ 
                              flex: '2', 
                              color: isSelected ? '#60a5fa' : 'var(--color-text-heading, #0f172a)', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              cursor: isSelected ? 'pointer' : 'default',
                              textDecoration: isSelected ? 'underline' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            <HighlightText text={item.title} query={searchQuery} />
                          </div>
                          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-main, #334155)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <strong style={{ fontWeight: 600 }}>{fullCrewDisplay || formatCrewName(mainAuthor)}</strong>
                            </span>
                          </div>
                          <div className="typo-meta" style={{ width: '60px', textAlign: 'center', color: 'var(--color-text-muted, #475569)' }}>
                            {item.articleType || '개인기사'}
                          </div>
                          <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <div className="text-[#1E3A8A] dark:text-blue-200 bg-blue-50 dark:bg-blue-950/70 rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs">
                              기 {formatDate(item.created_at)}
                            </div>
                            <div className={`rounded px-1.5 py-0.5 text-[0.7rem] font-bold text-center w-full tabular-nums shadow-2xs ${item.finalSubmittedAt ? 'text-[#14532D] dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/70' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60'}`}>
                              완 {item.finalSubmittedAt ? formatDate(item.finalSubmittedAt) : '-'}
                            </div>
                          </div>
                          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '32px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: getDiscussionsCount(item.content_body) > 0 ? 'rgba(59, 130, 246, 0.18)' : 'var(--color-surface)', color: getDiscussionsCount(item.content_body) > 0 ? '#60a5fa' : 'var(--color-text-muted, #cbd5e1)', fontSize: '0.78rem', fontWeight: 700 }}>
                              {getDiscussionsCount(item.content_body)}
                            </div>
                          </div>
                          <div style={{ width: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {(() => {
                              const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
                              const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
                              return isFinal && hasDriveLink ? (
                                <div 
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-surface, #F4F5F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                  title="Google Drive Link"
                                >
                                  <DriveColorIcon className="w-4 h-4" />
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted, #cbd5e1)', fontSize: '0.8rem' }}>-</span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Accordions Stacked & Popup Modals */}
      <div 
        ref={rightPaneRef}
        className="w-full xl:w-[420px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto" 
        style={{ 
          transform: `translateY(${rightPaneTranslateY}px)`,
          transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          zIndex: 20, 
          height: 'fit-content',
          willChange: 'transform'
        }}
      >
        <style>{`
          .hover-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .hover-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 30px rgba(0, 0, 0, 0.08) !important;
            border-color: #CBD5E1 !important;
          }
          .hover-underline:hover {
            text-decoration: underline !important;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {!selectedContent ? (
          <div style={{ width: '100%', minHeight: '800px', backgroundColor: 'var(--color-card-bg)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', padding: '30px', textAlign: 'center', boxShadow: 'var(--color-card-shadow)', border: '1px solid var(--color-card-border)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--color-text-muted)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              리스트에서 콘텐츠를 선택하면<br/>기획안, 완성본 및 피드백이 표시됩니다.
            </span>
          </div>
        ) : (() => {
            let bodyObj: any = {};
            try { bodyObj = JSON.parse(selectedContent.content_body || '{}'); } catch(e) {}
            const discussions = bodyObj.discussions || [];
            
            const activeComments = discussions;
            const rootComments = activeComments.filter((msg: any) => msg.parentId === null || msg.parentId === undefined);

            // Recursive Comment Node Renderer for Nested Replies (Infinite Depth Support via Flat List)
            const renderCommentNode = (comment: any, depth: number, hasReplies: boolean, isLastChild: boolean, rootCommentId: number): React.ReactNode => {
              const isLiked = comment.likedBy && currentUserEmail && comment.likedBy.includes(currentUserEmail);

              // Find the parent comment to check if we need to show a mention
              let mentionAuthor = '';
              if (depth > 0 && comment.parentId !== rootCommentId) {
                const parentComment = activeComments.find((c: any) => c.id === comment.parentId);
                if (parentComment) {
                  mentionAuthor = parentComment.author;
                }
              }

              return (
                <div 
                  key={comment.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    position: 'relative',
                    paddingLeft: depth > 0 ? '44px' : '0px'
                  }}
                >
                  {/* Comment Row */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
                    {/* Thread Connecting Line if this is root comment and has replies */}
                    {depth === 0 && hasReplies && (
                      <div style={{
                        position: 'absolute',
                        top: '38px',
                        left: '18px',
                        bottom: '-12px', // reaches down past this row to meet the first child's vertical line
                        width: '2px',
                        backgroundColor: 'var(--color-border)',
                        zIndex: 1
                      }} />
                    )}

                    {/* Sub connecting lines for child comments */}
                    {depth > 0 && (
                      <>
                        {/* Vertical line from parent down to this child's avatar center */}
                        <div style={{
                          position: 'absolute',
                          left: '18px',
                          top: '-12px',
                          bottom: isLastChild ? 'calc(100% - 14px)' : '-12px',
                          width: '2px',
                          backgroundColor: 'var(--color-border)',
                          zIndex: 1
                        }} />
                        {/* Horizontal branch line from the vertical line to this child's avatar */}
                        <div style={{
                          position: 'absolute',
                          left: '18px',
                          top: '14px',
                          width: '40px', // spans from 18px to 58px (44px padding + 14px avatar center)
                          height: '2px',
                          backgroundColor: 'var(--color-border)',
                          zIndex: 1
                        }} />
                      </>
                    )}

                    {/* Avatar */}
                    <div style={{ 
                      width: depth === 0 ? '36px' : '28px', 
                      height: depth === 0 ? '36px' : '28px', 
                      borderRadius: '50%', 
                      backgroundColor: comment.role === 'admin' ? '#F43F5E' : (depth === 0 ? '#1E3A8A' : '#10B981'), 
                      flexShrink: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 700, 
                      fontSize: depth === 0 ? '0.85rem' : '0.75rem',
                      zIndex: 2
                    }}>
                      {comment.author?.[0] || '익'}
                    </div>

                    {/* Comment Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: depth === 0 ? '4px' : '3px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: depth === 0 ? '0.85rem' : '0.78rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>{comment.author}</span>
                          <span style={{ fontSize: depth === 0 ? '0.72rem' : '0.68rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {(() => {
                              const timeDiff = Date.now() - new Date(comment.createdAt).getTime();
                              const minDiff = Math.floor(timeDiff / (1000 * 60));
                              if (minDiff < 60) return `${minDiff} min`;
                              const hourDiff = Math.floor(minDiff / 60);
                              if (hourDiff < 24) return `${hourDiff} hours`;
                              return new Date(comment.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                            })()}
                          </span>
                          {comment.updatedAt && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              (수정됨)
                            </span>
                          )}
                        </div>

                        {/* Edit / Delete Buttons for Author or Admin */}
                        {canEditOrDeleteComment(comment) && editingCommentId !== comment.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text || '');
                              }}
                              style={{ background: 'none', border: 'none', padding: '0 4px', fontSize: '0.72rem', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500 }}
                              className="hover-underline"
                            >
                              수정
                            </button>
                            <span style={{ color: 'var(--color-border)', fontSize: '0.65rem' }}>|</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommentNode(comment.id)}
                              style={{ background: 'none', border: 'none', padding: '0 4px', fontSize: '0.72rem', color: '#ef4444', cursor: 'pointer', fontWeight: 500 }}
                              className="hover-underline"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Editing Mode */}
                      {editingCommentId === comment.id ? (
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeIn 0.15s ease-out' }}>
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1.5px solid var(--color-primary, #1E3A8A)',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              color: 'var(--color-text-main)',
                              backgroundColor: 'var(--input-glass-bg)',
                              outline: 'none',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateComment}
                              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary, #1E3A8A)', color: '#ffffff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          {mentionAuthor && (
                            <span style={{ color: '#60a5fa', fontWeight: 600, marginRight: '6px', fontSize: depth === 0 ? '0.88rem' : '0.82rem', whiteSpace: 'nowrap' }}>
                              @{mentionAuthor}
                            </span>
                          )}
                          <span 
                            style={{ 
                              fontSize: depth === 0 ? '0.88rem' : '0.82rem', 
                              color: depth === 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)', 
                              lineHeight: '1.55', 
                              fontWeight: 400, 
                              lineBreak: 'anywhere' 
                            }}
                            dangerouslySetInnerHTML={{ __html: canViewSecret(comment) ? parseCommentMarkdown(comment.text) : '🔒 비밀댓글입니다.' }}
                          />
                        </div>
                      )}

                      {/* Attachments rendering */}
                      {canViewSecret(comment) && comment.attachments && comment.attachments.map((attach: any, idx: number) => (
                        <div 
                          key={idx} 
                          style={{ 
                            marginTop: '6px', 
                            maxWidth: depth === 0 ? '240px' : '200px', 
                            borderRadius: depth === 0 ? '12px' : '10px', 
                            overflow: 'hidden', 
                            border: '1px solid var(--color-border)', 
                            boxShadow: depth === 0 ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' 
                          }}
                        >
                          <img 
                            src={attach.url} 
                            alt="첨부 이미지" 
                            style={{ 
                              width: '100%', 
                              height: 'auto', 
                              display: 'block', 
                              maxHeight: depth === 0 ? '180px' : '140px', 
                              objectFit: 'cover' 
                            }} 
                          />
                        </div>
                      ))}

                      {/* Actions: Likes and Reply */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <button 
                          onClick={() => handleToggleLike(comment.id)}
                          style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', outline: 'none' }}
                        >
                          <svg width={depth === 0 ? '13' : '11'} height={depth === 0 ? '13' : '11'} viewBox="0 0 24 24" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : 'var(--color-text-muted)'} strokeWidth="2.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                          <span style={{ fontSize: depth === 0 ? '0.72rem' : '0.68rem', color: isLiked ? '#ef4444' : 'var(--color-text-muted)', fontWeight: 700 }}>
                            {comment.likes || 0}
                          </span>
                        </button>

                        <span 
                          onClick={() => {
                            setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                            setReplyComment('');
                          }} 
                          style={{ 
                            fontSize: depth === 0 ? '0.72rem' : '0.68rem', 
                            color: activeReplyId === comment.id ? '#60a5fa' : 'var(--color-text-muted)', 
                            fontWeight: 800, 
                            cursor: 'pointer' 
                          }} 
                          className="hover-underline"
                        >
                          Reply
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inline reply input box right below this comment node */}
                  {activeReplyId === comment.id && (
                    <div style={{ 
                      paddingLeft: depth === 0 ? '48px' : '40px', 
                      marginTop: '6px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px', 
                      animation: 'fadeIn 0.2s ease-out' 
                    }}>
                      {replyAttachedImage && (
                        <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          <img src={replyAttachedImage} alt="답글 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            onClick={() => setReplyAttachedImage(null)}
                            style={{ position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', fontSize: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, border: '1.5px solid var(--color-primary, #003378)', borderRadius: '10px', display: 'flex', backgroundColor: 'var(--input-glass-bg)', overflow: 'hidden', alignItems: 'center', paddingRight: '8px' }}>
                          <textarea 
                            id={`reply-textarea-${comment.id}`}
                            value={replyComment}
                            onChange={(e) => setReplyComment(e.target.value)}
                            placeholder="답글을 작성하세요..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(comment.id, replyComment, true);
                              }
                            }}
                            rows={1}
                            style={{ 
                              flex: 1, 
                              border: 'none', 
                              outline: 'none', 
                              padding: '8px 12px', 
                              fontSize: '0.82rem', 
                              color: 'var(--color-text-main)', 
                              backgroundColor: 'transparent',
                              fontWeight: 600,
                              resize: 'none',
                              fontFamily: 'inherit',
                              lineHeight: '1.4',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              overflowY: 'hidden'
                            }}
                          />
                          
                          {/* Markdown: Bold */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('bold', true); }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer', padding: '2px 4px' }}
                            title="볼드 텍스트"
                          >
                            B
                          </button>
                          
                          {/* Markdown: Italic */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('italic', true); }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.78rem', fontStyle: 'italic', cursor: 'pointer', padding: '2px 4px' }}
                            title="이탤릭 텍스트"
                          >
                            I
                          </button>

                          {/* Markdown: Strikethrough */}
                          <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('strikethrough', true); }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.78rem', textDecoration: 'line-through', cursor: 'pointer', padding: '2px 4px' }}
                            title="취소선"
                          >
                            S
                          </button>

                          {/* Photo Attach icon */}
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`reply-image-upload-${comment.id}`);
                              if (el) el.click();
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                            title="사진 첨부"
                          >
                            📎
                          </button>
                          
                          {/* Emoji Picker toggle */}
                          <button 
                            onClick={() => setShowReplyEmojiPicker(showReplyEmojiPicker === comment.id ? null : comment.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                            title="이모지"
                          >
                            😊
                          </button>
                          
                          <input 
                            type="file" 
                            id={`reply-image-upload-${comment.id}`} 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleFileChange(e, true)} 
                          />
                        </div>
                        
                        <button 
                          onClick={() => handleAddComment(comment.id, replyComment, true)}
                          disabled={!replyComment.trim() && !replyAttachedImage}
                          style={{ backgroundColor: 'var(--color-primary, #003378)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          등록
                        </button>
                        
                        <button 
                          onClick={() => { setActiveReplyId(null); setReplyComment(''); setReplyAttachedImage(null); }}
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          취소
                        </button>
                      </div>

                      {/* Reply Emoji Picker popup */}
                      {showReplyEmojiPicker === comment.id && (
                        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', padding: '6px 10px', borderRadius: '20px', width: 'fit-content', boxShadow: 'var(--color-card-shadow)' }}>
                          {['😊', '😂', '❤️', '👍', '🔥', '🎉', '😮', '😢', '🤔', '👏'].map((emoji) => (
                            <span 
                              key={emoji} 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                insertTextAtCursor(emoji, true);
                                setShowReplyEmojiPicker(null);
                              }}
                              style={{ cursor: 'pointer', fontSize: '1.05rem', transition: 'transform 0.1s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            const ytId = selectedContent.final_url ? getYoutubeVideoId(selectedContent.final_url) : null;
            const gdInfo = selectedContent.final_url ? getGoogleDriveInfo(selectedContent.final_url) : null;
            const crewCount = tempFormData.crew ? tempFormData.crew.split(',').map(s => s.trim()).filter(Boolean).length : 0;
            const computedArticleType = tempFormData.articleType || (crewCount > 1 ? '팀기사' : '개인기사');

            let emailInJson = '';
            try {
              emailInJson = bodyObj.authorEmail || '';
            } catch (e) {}

            const isOwnAuthor = currentUserEmail && (
              emailInJson === currentUserEmail || 
              selectedContent.author_name === currentUserEmail || 
              selectedContent.author_name === currentUserName ||
              (currentUserName && selectedContent.author_name?.includes(currentUserName))
            );
            const crewStr = (() => {
              try {
                const body = JSON.parse(selectedContent.content_body || '{}');
                let crew = body.crew || '';
                if (!crew && selectedContent.description) {
                  crew = selectedContent.description.split(' (참여:')[0] || '';
                }
                if (typeof crew === 'string') return crew;
                if (Array.isArray(crew)) return crew.map((c: any) => c.name || '').join(',');
                return '';
              } catch (e) { return ''; }
            })();
            
            const isCrewMember = currentUserName && crewStr.includes(currentUserName);
            const isOwn = isOwnAuthor || isCrewMember;
            const isAdministrator = isGlobalAdmin;
            
            const isParticipant = (currentUserName && crewStr.includes(currentUserName)) || (currentUserEmail && crewStr.includes(currentUserEmail));
    const isEditable = isOwn || isAdministrator || isParticipant;
return (
              <>
                {/* 1. Preview Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(true); }}
                  style={{ 
                    backgroundColor: 'var(--color-card-bg)', 
                    borderRadius: '20px', 
                    boxShadow: 'var(--color-card-shadow)', 
                    border: '1px solid var(--color-card-border)',
                    overflow: 'hidden', 
                    cursor: 'pointer',
                    height: '240px',
                    minHeight: '240px',
                    maxHeight: '240px',
                    flexShrink: 0
                  }}
                  className="hover-card"
                >
                  <div style={{ 
                    width: '100%', 
                    height: '130px', 
                    backgroundColor: 'var(--color-surface)', flexShrink: 0, 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    {!selectedContent.final_url ? (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)', zIndex: 10, gap: '8px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                          <text x="12" y="9" textAnchor="middle" fontSize="6" fontWeight="bold" stroke="none" fill="var(--color-text-muted)">?</text>
                        </svg>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>아직 업로드되지 않았습니다</span>
                      </div>
                    ) : null}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, background: 'radial-gradient(circle, #34A853 0%, #4285F4 50%, #FBBC05 100%)' }} />
                    
                    <svg viewBox="0 0 100 100" width="60" height="60" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.06))' }}>
                      <path d="M30 75 L15 50 L45 50 Z" fill="#FBBC05" />
                      <path d="M30 75 L60 75 L45 50 Z" fill="#4285F4" />
                      <path d="M45 50 L60 75 L75 50 Z" fill="#34A853" />
                      <path d="M45 50 L75 50 L60 25 Z" fill="#EA4335" />
                      <path d="M15 50 L45 50 L30 25 Z" fill="#FBBC05" opacity="0.9" />
                      <path d="M30 25 L60 25 L45 50 Z" fill="#34A853" opacity="0.9" />
                    </svg>
                    
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(selectedContent.final_url) window.open(selectedContent.final_url, '_blank'); }}
                        style={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.75)', 
                          color: '#ffffff', 
                          border: 'none', 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          cursor: 'pointer',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        Open Drive <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px 16px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text-heading)', lineBreak: 'anywhere', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedContent.title}
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{crewStr ? crewStr.split(',').map(s=>s.trim()).filter(Boolean).map(c=>formatCrewName(c)).join(', ') : selectedContent.author_name}</span>
                      <span style={{ color: 'var(--color-border)' }}>/</span>
                      <span>{selectedContent.team}</span>
                      <span style={{ color: 'var(--color-border)' }}>/</span>
                      <span>{bodyObj.targetMonth ? bodyObj.targetMonth.split('-')[1] + '월' : 'N월'}</span>
                      <span style={{ color: 'var(--color-border)' }}>/</span>
                      <span>{selectedContent.content_type}</span>
                    </div>
                    {selectedContent.final_url && (
                      <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#4ade80', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'underline' }}>
                        {selectedContent.final_url}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Proposal Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(false); }}
                  style={{ 
                    backgroundColor: 'var(--color-card-bg)',
                    borderRadius: '20px',
                    boxShadow: 'var(--color-card-shadow)',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    height: '340px',
                    minHeight: '340px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    scrollbarGutter: 'stable',
                    flexShrink: 0
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      기획안 <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'help' }}>ⓘ</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>

                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        {formatCrewName(selectedContent.author_name)} / {formatDate(selectedContent.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>제목 (가제)</label>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
                      {selectedContent.title || '내용을 입력해주세요'}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>콘텐츠 분류</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        selectedContent.team || '플랫폼',
                        bodyObj.targetMonth ? bodyObj.targetMonth.split('-')[1] + '월' : 'N월',
                        computedArticleType,
                        selectedContent.content_type || '유형'
                      ].map((val, i) => (
                        <div key={i} style={{
                          backgroundColor: 'var(--color-surface)',
                          padding: '6px 2px',
                          borderRadius: '8px', 
                          fontSize: '0.72rem', 
                          color: 'var(--color-text-muted)', 
                          textAlign: 'center',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {val}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>참여인원 (크루)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                          width: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          backgroundColor: '#1E3A8A', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: '0.7rem' 
                        }}>
                          {selectedContent.author_name[0] || '익'}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                          {formatCrewName(selectedContent.author_name)}
                        </span>
                      </div>
                      {crewStr.split(',').map(s => s.trim()).filter(Boolean).filter(c => c !== selectedContent.author_name && !selectedContent.author_name.includes(c)).map((c, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '30px', 
                            height: '30px', 
                            borderRadius: '50%', 
                            backgroundColor: '#0284C7', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 800, 
                            fontSize: '0.7rem' 
                          }}>
                            {c.trim()[0] || '크'}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 700 }}>
                            {formatCrewName(c.trim())}
                          </span>
                        </div>
                      ))}
                      
                      <div style={{ 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '50%', 
                        border: '1.5px dashed var(--color-border)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--color-text-muted)',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        +
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>기획의도</label>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-main)', minHeight: '50px', maxHeight: '120px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.intent ? <div dangerouslySetInnerHTML={{ __html: bodyObj.intent }} /> : '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>구성 및 내용</label>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-main)', minHeight: '50px', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.composition ? <div dangerouslySetInnerHTML={{ __html: bodyObj.composition }} /> : '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>촬영 계획</label>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-main)', minHeight: '50px', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.4', fontWeight: 500 }}>
                      {bodyObj.contentBody ? <div dangerouslySetInnerHTML={{ __html: bodyObj.contentBody }} /> : '-'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>희망 업로드 시기</label>
                      <div style={{ backgroundColor: 'var(--color-surface)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                        {bodyObj.desiredDate || '-'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>데드라인</label>
                      <div style={{ backgroundColor: 'var(--color-surface)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#EF4444', fontWeight: 600 }}>
                        {bodyObj.deadline || '-'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>해시태그</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedContent.keywords ? selectedContent.keywords.split(/[,\s]+/).map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md text-xs font-bold">
                          #{kw.trim()}
                        </span>
                      )) : <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>-</span>}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>비고</label>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-text-main)', minHeight: '40px', fontWeight: 500 }}>
                      {selectedContent.description || '-'}
                    </div>
                  </div>

                  { (selectedContent.docsUrl || bodyObj.docsUrl) && (
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', marginBottom: '4px', display: 'block' }}>기획안 링크</label>
                      <a href={selectedContent.docsUrl || bodyObj.docsUrl} target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#38bdf8', textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-all' }}>
                        {selectedContent.docsUrl || bodyObj.docsUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* 3. Feedback Card */}
                <div 
                  onClick={() => { setIsModalOpen(true); setIsFinalWorkView(false); }}
                  style={{ 
                    backgroundColor: 'var(--color-card-bg)', 
                    borderRadius: '20px', 
                    boxShadow: 'var(--color-card-shadow)', 
                    border: '1px solid var(--color-card-border)',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    height: '220px',
                    minHeight: '220px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    flexShrink: 0
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text-heading)' }}>
                      피드백 <span style={{ color: '#3B82F6' }}>{discussions.length}</span>
                    </h3>
                    
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2.5">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {discussions.length === 0 ? (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                        아직 등록된 피드백이 없습니다.
                      </div>
                    ) : (
                      discussions.map((msg: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            backgroundColor: msg.role === 'admin' ? '#F43F5E' : '#1E3A8A', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'white', 
                            fontWeight: 800, 
                            fontSize: '0.68rem',
                            flexShrink: 0
                          }}>
                            {msg.author?.[0] || '익'}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.author}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 500, flexShrink: 0 }}>
                                {(() => {
                                  const timeDiff = Date.now() - new Date(msg.createdAt).getTime();
                                  const minDiff = Math.floor(timeDiff / (1000 * 60));
                                  if (minDiff < 60) return `${minDiff} min`;
                                  const hourDiff = Math.floor(minDiff / 60);
                                  if (hourDiff < 24) return `${hourDiff} hours`;
                                  return new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                                })()}
                              </span>
                            </div>
                            <span 
                              style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', lineHeight: '1.4', fontWeight: 500, wordBreak: 'break-all', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                              dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '🔒 비밀댓글입니다.' }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Fullscreen Split Popup Modal */}
                {isModalOpen && typeof document !== 'undefined' && createPortal(
                  <div 
                    onMouseDown={(e) => {
                      modalMouseDownOnBackdrop.current = (e.target === e.currentTarget);
                    }}
                    onClick={(e) => {
                      if (modalMouseDownOnBackdrop.current && e.target === e.currentTarget) {
                        setIsModalOpen(false);
                        if (onModalClose) onModalClose();
                      }
                      modalMouseDownOnBackdrop.current = false;
                    }}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 1000,
                      padding: '24px',
                      boxSizing: 'border-box',
                      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="w-[96%] max-w-[1400px] h-[90vh] max-h-[90vh] grid grid-cols-1 xl:grid-cols-[1.3fr_1.0fr] gap-6"
                      style={{
                        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        minHeight: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {/* Modal Left Panel: 기획안 Form OR 완성본 미리보기 플레이어 (독립된 카드 형태) */}
                      <div className="p-5 sm:p-7 xl:p-8" style={{
                        overflowY: 'auto',
                        scrollbarGutter: 'stable',
                        height: '100%',
                        maxHeight: '100%',
                        minHeight: 0,
                        backgroundColor: 'var(--color-card-bg)',
                        borderRadius: '28px',
                        boxShadow: 'var(--color-card-shadow)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {isFinalWorkView ? (
                          isEditingFinalWork ? (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                              <FinalSubmitForm 
                                initialId={selectedContent.id.toString()}
                                onCancel={() => setIsEditingFinalWork(false)}
                                onSuccess={() => window.location.reload()}
                              />
                            </div>
                          ) : (
                          /* 완성본 보기 모드 - 좌측 화면 */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', marginBottom: '1rem' }}>
                              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'var(--color-text-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                완성본 미리보기 <span style={{ fontSize: '1.1rem', color: '#10B981', fontWeight: 700 }}>LIVE</span>
                              </h2>
                              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                {formatCrewName(selectedContent.author_name)} / {formatDate(selectedContent.created_at)}
                              </span>
                            </div>

                            {/* 고정 280px 높이는 구글 드라이브 영상 파일 미리보기가 그 안에
                                16:9 플레이어로 렌더링되면서 위아래가 잘려 보였다 — 내용물에
                                맞춰 반응형으로 조정: 영상(유튜브/드라이브 파일)은 16:9 비율,
                                폴더 미리보기는 목록에 맞는 낮은 비율을 쓴다. */}
                            <div style={{ width: '100%', aspectRatio: gdInfo?.type === 'folder' ? '16 / 10' : (!ytId && selectedContent.content_type === '영상(숏폼)') ? '9 / 16' : '16 / 9', maxHeight: '70vh', backgroundColor: (ytId || gdInfo) ? '#0f172a' : 'transparent', borderRadius: '18px', overflow: 'hidden', position: 'relative', boxShadow: (ytId || gdInfo) ? '0 10px 25px rgba(0,0,0,0.12)' : 'none' }}>
                              {ytId ? (
                                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                              ) : gdInfo ? (
                                <iframe src={gdInfo.type === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list` : `https://drive.google.com/file/d/${gdInfo.id}/preview`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} frameBorder="0" allowFullScreen />
                              ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '18px', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-main)', padding: '20px', textAlign: 'center', boxSizing: 'border-box' }}>
                                  <span style={{ fontSize: '2.5rem', opacity: 0.7 }}>📂</span>
                                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>구글 드라이브 문서 및 미디어 뷰어</span>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 6px 0', maxWidth: '380px' }}>아래 링크 버튼을 클릭하시면 구글 드라이브로 즉시 이동하여 파일을 확인할 수 있습니다.</p>
                                  {selectedContent.final_url && (
                                    <button
                                      onClick={() => window.open(selectedContent.final_url, '_blank')}
                                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', border: 'none', padding: '6px 18px', borderRadius: '30px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                                    >
                                      새 창에서 원본 파일 열기
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {(() => {
                              const finalData = (() => { try { return JSON.parse(selectedContent.content_body || '{}'); } catch(e) { return {}; }})();
                              const driveUrl = selectedContent.final_url || finalData.final_url || finalData.docsUrl || selectedContent.docsUrl || '';

                              return (
                                <>
                                  {/* 구글 드라이브 / 문서 연결 링크 칸 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      📂 구글 드라이브 연결 링크
                                    </span>
                                    <div style={{ 
                                      backgroundColor: 'var(--color-surface, #F4F5F7)', 
                                      border: '1px solid rgba(59, 130, 246, 0.3)', 
                                      padding: '14px 18px', 
                                      borderRadius: '16px', 
                                      fontSize: '0.88rem', 
                                      fontWeight: 600, 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      gap: '12px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <DriveColorIcon className="w-5 h-5 flex-shrink-0" />
                                        <span style={{ 
                                          color: driveUrl ? 'var(--color-text-main)' : 'var(--color-text-muted)', 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis', 
                                          whiteSpace: 'nowrap',
                                          wordBreak: 'break-all'
                                        }}>
                                          {driveUrl || '등록된 구글 드라이브 링크가 없습니다.'}
                                        </span>
                                      </div>
                                      {driveUrl && (
                                        <a 
                                          href={driveUrl} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          style={{ 
                                            padding: '8px 16px', 
                                            backgroundColor: '#003378', 
                                            color: 'white', 
                                            borderRadius: '10px', 
                                            fontSize: '0.82rem', 
                                            textDecoration: 'none', 
                                            fontWeight: 800, 
                                            whiteSpace: 'nowrap', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            boxShadow: '0 4px 12px rgba(0,51,120,0.25)'
                                          }}
                                        >
                                          구글 드라이브 열기 🔗
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                  {finalData.postContent && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>본문 / 캡션 내용</span>
                                      <CopyableBlock
                                        htmlContent={finalData.postContent}
                                        style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: 1.6 }}
                                      />
                                    </div>
                                  )}
                                  {finalData.finalKeywords && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>해시태그</span>
                                      <CopyableBlock
                                        textToCopy={finalData.finalKeywords.split(',').map((k: string) => `#${k.trim()}`).join(' ')}
                                        style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px', borderRadius: '12px' }}
                                      >
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {finalData.finalKeywords.split(',').map((kw: string, i: number) => kw.trim() && (
                                            <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold">#{kw.trim()}</span>
                                          ))}
                                        </div>
                                      </CopyableBlock>
                                    </div>
                                  )}
                                  {finalData.finalDescription && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>비고</span>
                                      <CopyableBlock
                                        textToCopy={finalData.finalDescription}
                                        style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                                      >
                                        {finalData.finalDescription}
                                      </CopyableBlock>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                              {(() => {
                                const isAdmin = isGlobalAdmin;
                                let crewStr = '';
                                try {
                                  const body = JSON.parse(selectedContent.content_body);
                                  crewStr = body.crew || '';
                                  if (Array.isArray(body.crew)) crewStr = body.crew.map((c:any)=>c.name).join(',');
                                } catch(e) {}
                                const isAuthor = currentUserName && selectedContent.author_name?.includes(currentUserName);
                                const isParticipant = (currentUserName && crewStr.includes(currentUserName)) || (currentUserEmail && crewStr.includes(currentUserEmail));
                                const isModalEditable = isAuthor || isParticipant || isAdmin;
                                const canEditNow = isModalEditable && ['approved', 'final_submitted', 'completed', 'uploaded'].includes(selectedContent.status);

                                if (!isModalEditable) {
                                  return (
                                    <button
                                      onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                                      style={{ flex: 1, padding: '14px 24px', borderRadius: '12px', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
                                    >
                                      닫기
                                    </button>
                                  );
                                }

                                return canEditNow ? (
                                  <button onClick={() => setIsEditingFinalWork(true)} style={{ flex: 1, textAlign: 'center', backgroundColor: 'var(--color-primary, #003378)', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 15px rgba(0, 51, 120, 0.2)', transition: 'background-color 0.2s' , border: 'none', cursor: 'pointer'}}>
                                    🛠️ 완성본 수정 / 변경 화면으로 가기
                                  </button>
                                ) : (
                                  <>
                                    <button disabled style={{ flex: 1, textAlign: 'center', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none', cursor: 'not-allowed'}}>
                                      🔒 기획안 승인 후 완성본 등록 가능
                                    </button>
                                    <button
                                      onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                                      style={{ flex: 1, padding: '14px 24px', borderRadius: '12px', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
                                    >
                                      닫기
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          )
                        ) : (
                          /* 기획안 폼 모드 - 좌측 화면 */
                          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', marginBottom: '2rem' }}>
                              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'var(--color-text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                기획안 <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', cursor: 'help' }}>ⓘ</span>
                              </h2>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                  {formatCrewName(selectedContent.author_name)} / {formatDate(selectedContent.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Title Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>제목 (가제)</label>
                              <input 
                                type="text" 
                                value={tempFormData.title}
                                onChange={(e) => setTempFormData({...tempFormData, title: e.target.value})}
                                placeholder="내용을 입력해주세요"
                                disabled={!isEditingProposal}
                                style={{
                                  backgroundColor: 'var(--input-glass-bg)',
                                  padding: '0.9rem 1.2rem',
                                  borderRadius: '10px', 
                                  fontSize: '0.95rem', 
                                  fontWeight: 600,
                                  color: 'var(--color-text-main)',
                                  outline: 'none',
                                  transition: 'all 0.2s'
                                }} 
                              />
                            </div>

                            {/* Categories */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>콘텐츠 분류</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <select 
                                  value={tempFormData.team}
                                  onChange={(e) => setTempFormData({...tempFormData, team: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ backgroundColor: 'var(--input-glass-bg)', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none' }}
                                >
                                  <option value="유튜브" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>유튜브</option>
                                  <option value="인스타" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>인스타</option>
                                  <option value="블로그" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>블로그</option>
                                  <option value="단장 팀" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>단장 팀</option>
                                </select>
                                
                                <input 
                                  type="month" 
                                  value={tempFormData.targetMonth}
                                  onChange={(e) => setTempFormData({...tempFormData, targetMonth: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ backgroundColor: 'var(--input-glass-bg)', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none' }}
                                />

                                <select
                                  value={tempFormData.articleType || computedArticleType}
                                  onChange={(e) => setTempFormData({...tempFormData, articleType: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ backgroundColor: 'var(--input-glass-bg)', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none', cursor: isEditingProposal ? 'pointer' : 'default' }}
                                >
                                  <option value="개인기사" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>개인기사</option>
                                  <option value="팀기사" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>팀기사</option>
                                </select>

                                <select
                                  value={tempFormData.contentType}
                                  onChange={(e) => setTempFormData({...tempFormData, contentType: e.target.value})}
                                  disabled={!isEditingProposal}
                                  style={{ backgroundColor: 'var(--input-glass-bg)', padding: '0.75rem', borderRadius: '10px', fontWeight: 700, color: 'var(--color-text-main)', outline: 'none' }}
                                >
                                  <option value="영상(롱폼)" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>영상(롱폼)</option>
                                  <option value="영상(숏폼)" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>영상(숏폼)</option>
                                  <option value="카드뉴스" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>카드뉴스</option>
                                  <option value="글 기사" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>글 기사</option>
                                  <option value="사진/기타" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>사진/기타</option>
                                </select>
                              </div>
                            </div>

                            {/* Crew Members */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem', position: 'relative' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>참여인원 (크루)</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                {/* Author Avatar */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#1E3A8A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{selectedContent.author_name}</span>
                                </div>
                                
                                {/* Selected Crew Avatars */}
                                {tempFormData.crew ? tempFormData.crew.split(',').map((s: string) => s.trim()).filter(Boolean).map((name: string) => {
                                  const cleanAuthorName = selectedContent.author_name?.replace(/^\d+(기)?\s+/, '');
                                  const cleanName = name.replace(/^\d+(기)?\s+/, '');
                                  if (cleanName === cleanAuthorName) return null;

                                  return (
                                    <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0284C7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                        {name[0] || '크'}
                                      </div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{name}</span>
                                      
                                      {isEditingProposal && (
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            const newCrew = tempFormData.crew.split(',').map((s: string) => s.trim()).filter((n: string) => n !== name).join(', ');
                                            setTempFormData({...tempFormData, crew: newCrew});
                                          }} 
                                          style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  );
                                }) : null}

                                {/* Add Crew Button & Dropdown Popup (When editing proposal) */}
                                {isEditingProposal && (
                                  <div style={{ position: 'relative' }}>
                                    <button 
                                      type="button" 
                                      onClick={() => setShowMemberSelect(!showMemberSelect)} 
                                      style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px dashed var(--color-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                    >
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                    
                                    {showMemberSelect && (
                                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '10px', width: '320px', backgroundColor: 'var(--color-card-bg)', borderRadius: '16px', boxShadow: 'var(--color-card-shadow)', border: '1px solid var(--color-card-border)', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                          <button 
                                            type="button" 
                                            onClick={() => setActiveCrewTab('my_team')} 
                                            style={{ flex: 1, padding: '0.8rem', background: 'none', border: 'none', borderBottom: activeCrewTab === 'my_team' ? '2px solid #60a5fa' : '2px solid transparent', color: activeCrewTab === 'my_team' ? '#60a5fa' : 'var(--color-text-muted)', fontWeight: activeCrewTab === 'my_team' ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}
                                          >
                                            우리 팀 ({tempFormData.team || '미지정'})
                                          </button>
                                          <button 
                                            type="button" 
                                            onClick={() => setActiveCrewTab('other_teams')} 
                                            style={{ flex: 1, padding: '0.8rem', background: 'none', border: 'none', borderBottom: activeCrewTab === 'other_teams' ? '2px solid #60a5fa' : '2px solid transparent', color: activeCrewTab === 'other_teams' ? '#60a5fa' : 'var(--color-text-muted)', fontWeight: activeCrewTab === 'other_teams' ? 700 : 500, cursor: 'pointer', fontSize: '0.85rem' }}
                                          >
                                            다른 팀
                                          </button>
                                        </div>
                                        <div style={{ padding: '0.8rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-card-bg)' }}>
                                          <input 
                                            type="text" 
                                            placeholder="크루원 이름 검색..." 
                                            value={memberSearchQuery} 
                                            onChange={e => setMemberSearchQuery(e.target.value)} 
                                            style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)' }} 
                                          />
                                        </div>
                                        <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '0.5rem' }}>
                                          {allProfiles
                                            .filter(p => {
                                              if (!p.author_name) return false;
                                              if (memberSearchQuery && !p.author_name.includes(memberSearchQuery)) return false;
                                              if (activeCrewTab === 'my_team') {
                                                return tempFormData.team && p.team === tempFormData.team;
                                              } else {
                                                return !tempFormData.team || p.team !== tempFormData.team;
                                              }
                                            })
                                            .map(p => {
                                              const isSelected = tempFormData.crew ? tempFormData.crew.split(',').map((s: string) => s.trim()).includes(p.author_name) : false;
                                              return (
                                                <div 
                                                  key={p.author_name + p.team} 
                                                  onClick={() => {
                                                    let crewArray = tempFormData.crew ? tempFormData.crew.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                                    const cleanPName = p.author_name.replace(/^\d+(기)?\s+/, '');
                                                    const cleanAuthorName = selectedContent.author_name?.replace(/^\d+(기)?\s+/, '');
                                                    if (crewArray.includes(p.author_name)) {
                                                      if (cleanPName !== cleanAuthorName) {
                                                        crewArray = crewArray.filter((name: string) => name !== p.author_name);
                                                      }
                                                    } else {
                                                      crewArray.push(p.author_name);
                                                    }
                                                    setTempFormData({ ...tempFormData, crew: crewArray.join(', ') });
                                                  }}
                                                  style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#60a5fa' : 'var(--color-text-main)' }}
                                                >
                                                  <span style={{ fontSize: '0.85rem' }}>{p.author_name} {p.team && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({p.team})</span>}</span>
                                                  {isSelected && <span style={{ fontWeight: 800, color: '#60a5fa' }}>✓</span>}
                                                </div>
                                              );
                                            })}
                                        </div>
                                        <div style={{ padding: '0.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', textAlign: 'center' }}>
                                          <button 
                                            type="button" 
                                            onClick={() => setShowMemberSelect(false)} 
                                            style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-main)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                          >
                                            닫기
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* GDocs URL */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>📄 기획안 문서 URL 연결</label>
                              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(2, 132, 199, 0.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ fontSize: '0.78rem', color: '#0369A1', margin: 0, lineHeight: '1.4', fontWeight: 600 }}>
                                  상세 기획안 작성이 필요한 경우, 구글 드라이브에 문서를 생성한 후 아래에 링크를 연결하세요.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type="url" 
                                    value={tempFormData.docsUrl}
                                    onChange={(e) => setTempFormData({...tempFormData, docsUrl: e.target.value})}
                                    placeholder="구글 드라이브 기획안 링크"
                                    disabled={!isEditingProposal}
                                    style={{ backgroundColor: 'var(--input-glass-bg)', flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-main)', outline: 'none' }}
                                  />
                                  {tempFormData.docsUrl && (
                                    <a href={tempFormData.docsUrl} target="_blank" rel="noreferrer" style={{ padding: '0 12px', backgroundColor: '#0284C7', color: 'white', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', fontSize: '0.8rem', textDecoration: 'none' }}>
                                      🔗 이동
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Intent */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>기획의도</label>
                              {isEditingProposal ? (
                                <div style={{ backgroundColor: 'var(--input-glass-bg)', borderRadius: '10px', padding: '4px' }}>
                                  <RichTextEditor 
                                    value={tempFormData.intent} 
                                    onChange={(val) => setTempFormData({...tempFormData, intent: val})} 
                                    placeholder="내용을 입력해주세요" 
                                    disabled={!isEditingProposal} 
                                    minHeight="120px" 
                                  />
                                </div>
                              ) : (
                                <CopyableBlock
                                  htmlContent={tempFormData.intent}
                                  style={{ backgroundColor: 'var(--color-surface)', borderRadius: '10px', padding: '14px 16px', minHeight: '80px', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: 1.6 }}
                                />
                              )}
                            </div>

                            {/* Composition */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>구성 및 내용</label>
                              {isEditingProposal ? (
                                <div style={{ backgroundColor: 'var(--input-glass-bg)', borderRadius: '10px', padding: '4px' }}>
                                  <RichTextEditor 
                                    value={tempFormData.composition} 
                                    onChange={(val) => setTempFormData({...tempFormData, composition: val})} 
                                    placeholder="내용을 입력해주세요" 
                                    disabled={!isEditingProposal} 
                                    minHeight="140px" 
                                  />
                                </div>
                              ) : (
                                <CopyableBlock
                                  htmlContent={tempFormData.composition}
                                  style={{ backgroundColor: 'var(--color-surface)', borderRadius: '10px', padding: '14px 16px', minHeight: '90px', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: 1.6 }}
                                />
                              )}
                            </div>

                            {/* Content Body / Shooting Plan */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>촬영 계획</label>
                              {isEditingProposal ? (
                                <div style={{ backgroundColor: 'var(--input-glass-bg)', borderRadius: '10px', padding: '4px' }}>
                                  <RichTextEditor 
                                    value={tempFormData.contentBody} 
                                    onChange={(val) => setTempFormData({...tempFormData, contentBody: val})} 
                                    placeholder="내용을 입력해주세요" 
                                    disabled={!isEditingProposal} 
                                    minHeight="120px" 
                                  />
                                </div>
                              ) : (
                                <CopyableBlock
                                  htmlContent={tempFormData.contentBody}
                                  style={{ backgroundColor: 'var(--color-surface)', borderRadius: '10px', padding: '14px 16px', minHeight: '80px', fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: 1.6 }}
                                />
                              )}
                            </div>

                            {/* Keywords */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>#해시태그</label>
                                {isEditingProposal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const recommended = recommendHashtagsFromContent(
                                        tempFormData.title,
                                        tempFormData.intent,
                                        `${tempFormData.composition || ''} ${tempFormData.contentBody || ''}`
                                      );
                                      if (recommended) {
                                        setTempFormData(prev => ({ ...prev, keywords: recommended }));
                                      } else {
                                        alert('기획안 제목이나 의도를 먼저 작성하시면 맞춤 해시태그를 추천해드립니다!');
                                      }
                                    }}
                                    title="Mecab-YAKE 파이프라인 AI 해시태그 자동 추천"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      backgroundColor: 'rgba(30, 58, 138, 0.25)',
                                      border: '1px solid rgba(96, 165, 250, 0.3)',
                                      borderRadius: '6px',
                                      color: '#93C5FD',
                                      fontSize: '0.75rem',
                                      fontWeight: 750,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      whiteSpace: 'nowrap'
                                    }}
                                    className="hover-scale"
                                  >
                                    <span style={{ fontSize: '0.9rem' }}>🎲</span>
                                    <span>해시태그 추천</span>
                                  </button>
                                )}
                              </div>
                              {isEditingProposal ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--input-glass-bg)', padding: '8px 12px', borderRadius: '10px' }}>
                                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}>#</span>
                                  <input 
                                    type="text" 
                                    value={tempFormData.keywords}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parts = raw.split(/[,\s]+/).map((k: string) => k.trim()).filter(Boolean);
                                      const isTyping = /[,\s]$/.test(raw);
                                      setTempFormData({...tempFormData, keywords: isTyping ? raw : parts.join(', ')});
                                    }}
                                    placeholder="여기에 해시태그를 입력해주세요..." 
                                    disabled={!isEditingProposal}
                                    style={{ border: 'none', backgroundColor: 'transparent', flex: 1, outline: 'none', fontSize: '0.9rem', color: 'var(--color-text-main)', fontWeight: 500 }} 
                                  />
                                </div>
                              ) : (
                                <CopyableBlock
                                  textToCopy={tempFormData.keywords ? tempFormData.keywords.split(/[,\s]+/).map((k: string) => `#${k.trim()}`).join(' ') : ''}
                                  style={{ backgroundColor: 'var(--color-surface)', padding: '10px 14px', borderRadius: '10px' }}
                                >
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {tempFormData.keywords ? tempFormData.keywords.split(/[,\s]+/).map((k: string, i: number) => (
                                      <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold">
                                        #{k.trim()}
                                      </span>
                                    )) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>등록된 해시태그가 없습니다.</span>}
                                  </div>
                                </CopyableBlock>
                              )}
                            </div>

                            {/* Timeliness */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>시의성 중요도</label>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {[
                                  { level: '상관없음', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', hover: 'rgba(59, 130, 246, 0.25)' },
                                  { level: '보통', color: '#1D4ED8', bg: 'rgba(29, 78, 216, 0.15)', hover: 'rgba(29, 78, 216, 0.25)' },
                                  { level: '중요', color: '#1E3A8A', bg: 'rgba(30, 58, 138, 0.3)', hover: 'rgba(30, 58, 138, 0.4)' }
                                ].map(({ level, color, bg, hover }) => {
                                  let currentTimeliness = '상관없음';
                                  try { currentTimeliness = JSON.parse(selectedContent.content_body || '{}').timeliness || '상관없음'; } catch {}
                                  const isSelected = isEditable ? tempFormData.timeliness === level : currentTimeliness === level;
                                  
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => {
                                        if (isEditable && !isSavingProposal) {
                                          if (level === '상관없음') {
                                            setTempFormData({...tempFormData, timeliness: level, desiredDate: '', desiredDateEnd: '', deadline: ''});
                                          } else {
                                            setTempFormData({...tempFormData, timeliness: level});
                                          }
                                        }
                                      }}
                                      disabled={!isEditingProposal}
                                      style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: isSelected ? `2px solid ${color}` : '1px solid var(--color-border)',
                                        backgroundColor: isSelected ? color : 'var(--color-surface)',
                                        color: isSelected ? '#FFFFFF' : 'var(--color-text-muted)',
                                        fontSize: '1rem',
                                        fontWeight: isSelected ? 800 : 600,
                                        cursor: (!isEditable || isSavingProposal) ? 'default' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? `0 4px 12px ${color}40` : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected && isEditable && !isSavingProposal) {
                                          e.currentTarget.style.backgroundColor = 'var(--table-row-hover)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                        }
                                      }}
                                    >
                                      <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: isSelected ? '2px solid #FFFFFF' : '2px solid var(--color-border)',
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
                              {tempFormData.timeliness === '중요' && (
                                <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                                  * 희망 업로드 일이 촉박하거나, 데드라인을 지키기 어려운 경우 기획단계부터 미디어센터 관리자와 상의하세요.
                                </div>
                              )}
                              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
                                * 캘린더 정렬 시 참고됩니다. (상관없음이 맨 위로 고정됩니다.)
                              </p>
                            </div>

                            {/* Dates */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>희망 업로드 시기</label>
                                
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    backgroundColor: 'var(--input-glass-bg)',
                                    padding: '0.75rem 1rem', 
                                    borderRadius: '10px', 
                                    cursor: 'default',
                                    marginBottom: isEditingProposal ? '0.5rem' : '0'
                                  }}
                                >
                                  <div style={{ flex: 1, color: tempFormData.desiredDate ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {tempFormData.desiredDate 
                                      ? (tempFormData.desiredDateEnd && tempFormData.desiredDate !== tempFormData.desiredDateEnd 
                                          ? `${tempFormData.desiredDate} ~ ${tempFormData.desiredDateEnd}` 
                                          : tempFormData.desiredDate)
                                      : (tempFormData.timeliness === '상관없음' ? '날짜 선택 불가 (상관없음)' : '아래 달력에서 날짜를 선택해주세요')}
                                  </div>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                </div>

                                {isEditingProposal && (
                                  <CalendarPicker
                                    initialStartDate={tempFormData.desiredDate}
                                    initialEndDate={tempFormData.desiredDateEnd}
                                    mode={
                                      tempFormData.timeliness === '상관없음' ? 'disabled' : 
                                      tempFormData.timeliness === '중요' ? 'single' : 'range'
                                    }
                                    onApply={(start, end) => {
                                      const newDeadline = start ? new Date(new Date(start).getTime() - 3*24*60*60*1000).toISOString().split('T')[0] : '';
                                      setTempFormData({...tempFormData, desiredDate: start, desiredDateEnd: end, deadline: newDeadline});
                                    }}
                                  />
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>데드라인 <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 500 }}>(시작일 3일 전으로 자동 설정)</span></label>
                                <input 
                                  type="date" 
                                  value={tempFormData.deadline}
                                  readOnly onChange={() => {}}
                                  style={{ backgroundColor: 'var(--color-surface)', padding: '0.75rem', borderRadius: '10px', fontWeight: 600, color: 'var(--color-text-muted)', outline: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Description */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-heading)' }}>비고</label>
                              {isEditingProposal ? (
                                <textarea 
                                  value={tempFormData.description}
                                  onChange={(e) => setTempFormData({...tempFormData, description: e.target.value})}
                                  placeholder="내용을 입력해주세요..." 
                                  rows={3} 
                                  disabled={!isEditingProposal}
                                  style={{ backgroundColor: 'var(--input-glass-bg)', padding: '1rem', borderRadius: '10px', outline: 'none', resize: 'vertical', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-main)' }}
                                />
                              ) : (
                                <CopyableBlock
                                  textToCopy={tempFormData.description}
                                  style={{ backgroundColor: 'var(--color-surface)', padding: '14px 16px', borderRadius: '10px', minHeight: '60px', fontSize: '0.9rem', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                                >
                                  {tempFormData.description || <span style={{ color: 'var(--color-text-muted)' }}>등록된 비고 내용이 없습니다.</span>}
                                </CopyableBlock>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem', paddingBottom: '1.5rem' }}>
                              {isEditable && (
                                <button 
                                  onClick={() => setIsEditingProposal(true)}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: 'var(--color-primary, #1E3A8A)', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  수정하기
                                </button>
                              )}
                              {isEditable && isEditingProposal && (
                                <button 
                                  onClick={(e) => {
                                    handleSaveProposal(e as any).then(() => {
                                      setIsEditingProposal(false);
                                    });
                                  }}
                                  disabled={isSavingProposal}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: isSavingProposal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isSavingProposal ? 0.7 : 1 }}
                                >
                                  {isSavingProposal ? '저장 중...' : '저장하기'}
                                </button>
                              )}
                              {!(isEditable && !isEditingProposal) && (
                                <button
                                  onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                                  style={{
                                    flex: isEditable ? 1 : 'none',
                                    width: isEditable ? 'auto' : '100%',
                                    padding: '0.9rem',
                                    borderRadius: '10px',
                                    border: '1.5px solid var(--color-border)',
                                    backgroundColor: 'var(--color-surface)',
                                    color: 'var(--color-text-muted)',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  닫기
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Right Panel: 피드백 & 완성본 스트림 (독립 카드 스택 형태) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', maxHeight: '100%', minHeight: 0, overflow: 'hidden' }}>
                        {selectedContent && (isAdministrator || isGlobalAdmin) && (
                          <AdminStatusManager 
                            item={selectedContent} 
                            onStatusChange={(newStatus) => {
                              setSelectedContent(prev => prev ? { ...prev, status: newStatus } : prev);
                              setContentsList(prev => prev.map(c => c.id === selectedContent.id ? { ...c, status: newStatus } : c));
                            }}
                            onDelete={canDeleteContent(selectedContent) ? handleDeleteContent : undefined}
                          />
                        )}
                        {/* =============================== */}
                        {/* ==== DELETE BUTTON ==== */}
                        {!(isAdministrator || isGlobalAdmin) && selectedContent && canDeleteContent(selectedContent) && (
                          <button
                            onClick={handleDeleteContent}
                            disabled={isDeleting}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '12px',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: isDeleting ? 'not-allowed' : 'pointer',
                              opacity: isDeleting ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            {isDeleting ? '삭제 중...' : '이 콘텐츠 삭제'}
                          </button>
                        )}
                        {/* ======================== */}
                        {/* 1. "완성본 보기" Card */}
                        <div 
                          onClick={() => setIsFinalWorkView(!isFinalWorkView)}
                          style={{
                            backgroundColor: 'var(--color-primary, #003378)',
                            color: 'white',
                            padding: '16px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 800,
                            userSelect: 'none',
                            borderRadius: '20px',
                            boxShadow: 'var(--color-card-shadow)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(1.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span>완성본 보기</span>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid white',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isFinalWorkView ? '#10B981' : 'transparent',
                            borderColor: isFinalWorkView ? '#10B981' : 'white',
                            transition: 'all 0.2s ease'
                          }}>
                            {isFinalWorkView && (
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* 2. "피드백" Card */}
                        <div style={{ 
                          flex: 1, 
                          minHeight: 0,
                          backgroundColor: 'var(--color-card-bg)', 
                          borderRadius: '24px', 
                          boxShadow: 'var(--color-card-shadow)', 
                          border: '1px solid var(--color-card-border)',
                          display: 'flex', 
                          flexDirection: 'column', 
                          overflow: 'hidden'
                        }}>
                          {/* Title Bar */}
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-heading)' }}>
                              피드백{' '}
                              <span style={{ color: '#3B82F6' }}>
                                {discussions.length}
                              </span>
                            </h3>
                            <button 
                              onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: 0 }}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Comments stream list (Threads Style with Recursive Tree Rendering) */}
                          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'var(--color-card-bg)' }}>
                            {rootComments.length === 0 ? (
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', textAlign: 'center', marginTop: '40px', fontWeight: 500 }}>
                                등록된 피드백이 없습니다. 첫 의견을 남겨보세요!
                              </div>
                            ) : (
                              rootComments.map((msg: any) => {
                                const replies = getAllReplies(msg.id, activeComments);
                                return (
                                  <React.Fragment key={msg.id}>
                                    {renderCommentNode(msg, 0, replies.length > 0, false, msg.id)}
                                    {replies.map((reply: any, index: number) => {
                                      const isLast = index === replies.length - 1;
                                      return renderCommentNode(reply, reply.depth, false, isLast, msg.id);
                                    })}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </div>

                          {/* Rich style Comment Input (Main Input) */}
                          <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                            <div style={{ 
                              border: '1.5px solid var(--color-border)', 
                              borderRadius: '16px', 
                              backgroundColor: 'var(--input-glass-bg)',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}>
                              {/* Selected image preview */}
                              {attachedImage && (
                                <div style={{ padding: '10px 14px 4px 14px', display: 'flex', position: 'relative' }}>
                                  <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                    <img src={attachedImage} alt="첨부파일 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                      onClick={() => setAttachedImage(null)}
                                      style={{
                                        position: 'absolute',
                                        top: '3px',
                                        right: '3px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '9px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}

                              <textarea 
                                id="main-comment-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="피드백을 남겨주세요... (B, I, S, 이모지, 사진 지원)" 
                                rows={3}
                                disabled={isSavingComment}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(null, '', false);
                                  }
                                }}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  padding: '12px 14px', 
                                  fontSize: '0.86rem', 
                                  backgroundColor: 'transparent',
                                  resize: 'none',
                                  color: 'var(--color-text-main)',
                                  fontWeight: 600,
                                  fontFamily: 'inherit'
                                }} 
                              />
                              
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '8px 12px', 
                                backgroundColor: 'var(--color-surface)', 
                                borderTop: '1px solid var(--color-border)' 
                              }}>
                                {/* Rich Toolbar Buttons */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                                  {/* Markdown: Bold */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('bold', false); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', padding: '2px 4px' }}
                                    title="볼드 텍스트"
                                  >
                                    B
                                  </button>
                                  
                                  {/* Markdown: Italic */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('italic', false); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic', cursor: 'pointer', padding: '2px 4px' }}
                                    title="이탤릭 텍스트"
                                  >
                                    I
                                  </button>

                                  {/* Markdown: Strikethrough */}
                                  <button 
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); insertTextAtCursor('strikethrough', false); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'line-through', cursor: 'pointer', padding: '2px 4px' }}
                                    title="취소선"
                                  >
                                    S
                                  </button>

                                  {/* Link Builder */}
                                  <button 
                                    type="button"
                                    onClick={() => setShowLinkPopover(!showLinkPopover)}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="링크 빌더"
                                  >
                                    🔗
                                  </button>

                                  {/* Photo Attachment */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById('main-image-upload');
                                      if (el) el.click();
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="사진 첨부"
                                  >
                                    📎
                                  </button>
                                  <input 
                                    type="file" 
                                    id="main-image-upload" 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => handleFileChange(e, false)} 
                                  />

                                  {/* Emoji Picker Button */}
                                  <button 
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer', padding: '2px 4px' }}
                                    title="이모지 선택"
                                  >
                                    😊
                                  </button>

                                  {/* Link Insert Popover Tooltip */}
                                  {showLinkPopover && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '20px',
                                      marginBottom: '10px',
                                      backgroundColor: 'var(--color-card-bg)',
                                      borderRadius: '12px',
                                      border: '1px solid var(--color-border)',
                                      padding: '12px',
                                      width: '220px',
                                      boxShadow: 'var(--color-card-shadow)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      zIndex: 50
                                    }}>
                                      <input 
                                        type="text" 
                                        placeholder="표시될 이름 (예: 구글)" 
                                        value={attachedLinkText}
                                        onChange={(e) => setAttachedLinkText(e.target.value)}
                                        style={{ padding: '6px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)' }}
                                      />
                                      <input 
                                        type="url" 
                                        placeholder="https://..." 
                                        value={attachedLinkUrl}
                                        onChange={(e) => setAttachedLinkUrl(e.target.value)}
                                        style={{ padding: '6px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.78rem', outline: 'none', backgroundColor: 'var(--input-glass-bg)', color: 'var(--color-text-main)' }}
                                      />
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            if (attachedLinkUrl.trim()) {
                                              insertTextAtCursor(`[${attachedLinkText || '링크'}](${attachedLinkUrl})`, false);
                                              setAttachedLinkUrl('');
                                              setAttachedLinkText('');
                                              setShowLinkPopover(false);
                                            }
                                          }}
                                          style={{ backgroundColor: 'var(--color-primary, #003378)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          추가
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            setAttachedLinkUrl('');
                                            setAttachedLinkText('');
                                            setShowLinkPopover(false);
                                          }}
                                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Main Emoji Picker Popover */}
                                  {showEmojiPicker && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '80px',
                                      marginBottom: '10px',
                                      backgroundColor: 'var(--color-card-bg)',
                                      borderRadius: '24px',
                                      border: '1px solid var(--color-border)',
                                      padding: '8px 12px',
                                      boxShadow: 'var(--color-card-shadow)',
                                      display: 'flex',
                                      gap: '6px',
                                      zIndex: 50,
                                      width: 'fit-content'
                                    }}>
                                      {['😊', '😂', '❤️', '👍', '🔥', '🎉', '😮', '😢', '🤔', '👏'].map((emoji) => (
                                        <span 
                                          key={emoji} 
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertTextAtCursor(emoji, false);
                                            setShowEmojiPicker(false);
                                          }}
                                          style={{ cursor: 'pointer', fontSize: '1.1rem', transition: 'transform 0.1s' }}
                                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                                        >
                                          {emoji}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSecretComment} 
                                      onChange={(e) => setIsSecretComment(e.target.checked)} 
                                      style={{ accentColor: '#1E3A8A', width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    🔒 비밀댓글
                                  </label>
                                  <button 
                                    onClick={() => handleAddComment(null, '', false)}
                                  disabled={isSavingComment || (!newComment.trim() && !attachedImage)}
                                  style={{ 
                                    backgroundColor: 'var(--color-primary, #003378)', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '8px 18px', 
                                    borderRadius: '10px', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 800, 
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    boxShadow: '0 4px 8px rgba(0, 51, 120, 0.18)'
                                  }}
                                  onMouseEnter={(e) => !isSavingComment && (newComment.trim() || attachedImage) && (e.currentTarget.style.filter = 'brightness(1.15)')}
                                  onMouseLeave={(e) => !isSavingComment && (newComment.trim() || attachedImage) && (e.currentTarget.style.filter = 'none')}
                                >
                                  {isSavingComment ? '...' : '의견 보내기'}
                                </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. "뒤로가기" Button */}
                        <div 
                          onClick={() => { setIsModalOpen(false); if (onModalClose) onModalClose(); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 700,
                            padding: '12px 24px',
                            alignSelf: 'center',
                            transition: 'color 0.2s, transform 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-heading)';
                            e.currentTarget.style.transform = 'translateX(-4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>←</span> 뒤로가기
                        </div>
                      </div>
                    </div>
                  </div>
                , document.body)}
              </>
            );
        })()}
      </div>

      {/* Unsubmitted Final Works Modal */}
      {showUnsubmittedModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowUnsubmittedModal(false)} />
          <div style={{ position: 'relative', backgroundColor: 'var(--color-card-bg)', borderRadius: '24px', padding: '32px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--color-card-shadow)', border: '1px solid var(--color-card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-heading)' }}>미제출 완성본 목록</h3>
              <button onClick={() => setShowUnsubmittedModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: '1', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {(() => {
                const unsubmitted = contentsList.filter(c => {
                  let emailInJson = '';
                  let crewStr = c.parsedCrew || '';
                  try { 
                    const body = JSON.parse(c.content_body || '{}');
                    emailInJson = body.authorEmail || ''; 
                    if (!crewStr && body.crew) {
                      crewStr = typeof body.crew === 'string' ? body.crew : (Array.isArray(body.crew) ? body.crew.map((x:any)=>x.name).join(',') : '');
                    }
                  } catch {}
                  
                  if (!crewStr && c.description) {
                    crewStr = c.description.split(' (참여:')[0] || '';
                  }

                  const isOwnAuthor = currentUserEmail && (
                    emailInJson === currentUserEmail || 
                    c.author_name === currentUserEmail || 
                    c.author_name === currentUserName ||
                    (currentUserName && c.author_name?.includes(currentUserName))
                  );
                  const isCrewMember = currentUserName && crewStr.includes(currentUserName);
                  const isOwn = isOwnAuthor || isCrewMember;
                  
                  return isOwn && !c.final_url && c.status === 'approved';
                });
                if (unsubmitted.length === 0) {
                  return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>미제출된 완성본이 없습니다.</div>;
                }
                return unsubmitted.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setShowUnsubmittedModal(false);
                      openFinalWorkModal(item.id.toString());
                    }}
                    style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--color-surface)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary, #3b82f6)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: '6px' }}><HighlightText text={item.title} query={searchQuery} /></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.team} · {item.content_type}</div>
                  </div>
                ));
              })()}
            </div>
            
            <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              클릭하면 완성본 제출 팝업이 열립니다.
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
}
