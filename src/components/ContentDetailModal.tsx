'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import AdminStatusManager from './AdminStatusManager';
import CopyableBlock from './CopyableBlock';
import { sanitizeHtml } from '@/utils/sanitize';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from '@/components/platformIcons';
import { deleteContent } from '@/app/actions/content';

const parseCommentMarkdown = (text: string): string => {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong style="font-weight:800">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em style="font-style:italic">$1</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del>$1</del>');
  escaped = escaped.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3B82F6;text-decoration:underline">$1</a>');
  escaped = escaped.replace(/\n/g, '<br />');
  return escaped;
};

const getYoutubeVideoId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getAllReplies = (rootId: number, allComments: any[]): any[] => {
  const result: any[] = [];
  const traverse = (parentId: number, depth: number) => {
    const children = allComments
      .filter((c: any) => c.parentId === parentId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const child of children) {
      result.push({ ...child, depth });
      traverse(child.id, depth + 1);
    }
  };
  traverse(rootId, 1);
  return result;
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

interface ContentDetailModalProps {
  contentId: string | number | null;
  onClose: () => void;
}

export default function ContentDetailModal({ contentId, onClose }: ContentDetailModalProps) {
  const supabase = createClient();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'proposal' | 'final'>('proposal');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'proposal' | 'final'>('all');
  
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isMouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('contents')
          .select('author_name')
          .eq('title', `PROFILE_${user.email}`)
          .maybeSingle();
        const displayName = profile?.author_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '익명';
        const isAdmin = user.user_metadata?.is_admin === true || user.email === 'admin@admin.com';
        setCurrentUser({ email: user.email, name: displayName, isAdmin });
        if (isAdmin) setIsSecret(true);
      }
    };
    loadUser();
  }, [supabase]);

  const fetchContent = useCallback(async () => {
    if (!contentId) return;
    const { data } = await supabase
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .single();
    if (data) {
      setContent(data);
      if (['final_submitted', 'completed', 'uploaded', 'final_revision'].includes(data.status)) {
        setActiveTab('final');
      }
    }
    setLoading(false);
  }, [contentId, supabase]);

  useEffect(() => {
    setLoading(true);
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    if (!contentId) return;

    const channel = supabase
      .channel(`content-detail-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contents',
          filter: `id=eq.${contentId}`
        },
        (payload) => {
          if (payload.new) {
            setContent((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, supabase]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const getBodyObj = useCallback(() => {
    try { return JSON.parse(content?.content_body || '{}'); }
    catch { return {}; }
  }, [content]);

  const bodyObj = getBodyObj();
  const rawDiscussions: any[] = bodyObj.discussions || [];

  const rootDiscussions = rawDiscussions.filter(d => d.parentId === null || d.parentId === undefined);
  const filteredRootDiscussions = rootDiscussions.filter(d => {
    if (feedbackFilter === 'all') return true;
    if (feedbackFilter === 'final') return d.type === 'final';
    return d.type === 'proposal' || !d.type;
  });
  const visibleDiscussionsCount = filteredRootDiscussions.reduce(
    (sum, root) => sum + 1 + getAllReplies(root.id, rawDiscussions).length,
    0
  );

  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    if (!currentUser) return false;
    const authorName = content?.author_name || '';
    const crewStr = bodyObj.crew || '';
    if (currentUser.isAdmin) return true;
    if (currentUser.name && (authorName.includes(currentUser.name) || crewStr.includes(currentUser.name))) return true;
    if (currentUser.email && crewStr.includes(currentUser.email)) return true;
    return false;
  };

  const handleAddComment = async (parentId: number | null, text: string, imageUrl?: string | null, secret?: boolean) => {
    if (!text.trim() && !imageUrl) return;
    if (!content || !currentUser) return;
    setIsSaving(true);
    try {
      let emailInJson = '';
      try { emailInJson = bodyObj.authorEmail; } catch {}
      const isAuthor = emailInJson === currentUser.email || content.author_name === currentUser.email || content.author_name?.includes(currentUser.name);
      const isAdmin = currentUser.isAdmin;

      const message = {
        id: Date.now(),
        parentId,
        type: activeTab,
        role: isAdmin ? 'admin' : (isAuthor ? 'writer' : 'crew'),
        text,
        createdAt: new Date().toISOString(),
        author: currentUser.name,
        authorEmail: currentUser.email || undefined,
        likes: 0,
        likedBy: [],
        attachments: imageUrl ? [{ type: 'image', url: imageUrl }] : [],
        isSecret: !!secret,
      };

      const { data: fresh } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', content.id)
        .single();
      let freshBodyObj: any = {};
      try { freshBodyObj = JSON.parse(fresh?.content_body || '{}'); } catch {}

      const updatedBody = {
        ...freshBodyObj,
        discussions: [...(freshBodyObj.discussions || []), message],
      };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', content.id);

      if (error) {
        alert('댓글 저장 실패: ' + error.message);
      } else {
        setContent({ ...content, content_body: JSON.stringify(updatedBody) });
        if (parentId === null) {
          setNewComment('');
          setAttachedImage(null);
          setIsSecret(false);
        } else {
          setReplyTargetId(null);
          setReplyText('');
        }
      }
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const canEditOrDeleteComment = (msg: any) => {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    if (currentUser.email && (msg.authorEmail === currentUser.email || msg.author === currentUser.email)) return true;
    const normalize = (s: string) => (s || '').replace(/^\d+(기)?\s+/, '').replace(/\([^)]*\)/g, '').trim();
    const cleanUser = normalize(currentUser.name || '');
    const cleanMsg = normalize(msg.author || '');
    if (cleanUser && cleanMsg && cleanUser === cleanMsg) return true;
    if (currentUser.name && msg.author && (currentUser.name === msg.author || msg.author.includes(currentUser.name) || currentUser.name.includes(msg.author))) return true;
    return false;
  };

  const handleSaveEditedComment = async (commentId: number) => {
    if (!editingCommentText.trim() || !content) return;
    try {
      const { data: fresh } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', content.id)
        .single();
      let freshBodyObj: any = {};
      try { freshBodyObj = JSON.parse(fresh?.content_body || '{}'); } catch {}

      const discussions = freshBodyObj.discussions || [];
      const updatedDiscussions = discussions.map((d: any) => {
        if (d.id === commentId) {
          return { ...d, text: editingCommentText.trim(), isEdited: true, updatedAt: new Date().toISOString() };
        }
        return d;
      });

      const updatedBody = { ...freshBodyObj, discussions: updatedDiscussions };
      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', content.id);

      if (error) throw error;

      setContent({ ...content, content_body: JSON.stringify(updatedBody) });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err: any) {
      alert('댓글 수정 실패: ' + err.message);
    }
  };

  const handleDeleteCommentNode = async (commentId: number) => {
    if (!confirm('이 댓글을 삭제하시겠습니까? (하위 답글이 있는 경우 함께 삭제됩니다)')) return;
    if (!content) return;
    try {
      const { data: fresh } = await supabase
        .from('contents')
        .select('content_body')
        .eq('id', content.id)
        .single();
      let freshBodyObj: any = {};
      try { freshBodyObj = JSON.parse(fresh?.content_body || '{}'); } catch {}

      const discussions = freshBodyObj.discussions || [];
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
      const updatedBody = { ...freshBodyObj, discussions: updatedDiscussions };

      const { error } = await supabase
        .from('contents')
        .update({ content_body: JSON.stringify(updatedBody) })
        .eq('id', content.id);

      if (error) throw error;

      setContent({ ...content, content_body: JSON.stringify(updatedBody) });
    } catch (err: any) {
      alert('댓글 삭제 실패: ' + err.message);
    }
  };

  const handleDeleteContent = async () => {
    if (!confirm('정말 이 콘텐츠를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    if (!content) return;
    setIsDeleting(true);
    try {
      const res = await deleteContent(content.id.toString());
      if (res.success) {
        alert('콘텐츠가 삭제되었습니다.');
        onClose();
        window.location.reload();
      } else {
        alert(res.error || '삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert('삭제 중 오류: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('이미지 최대 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const yy = d.getFullYear().toString().slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}/${mm}/${dd}`;
  };

  if (!mounted) return null;

  const youtubeVideoId = getYoutubeVideoId(content?.final_url || bodyObj.finalUrl || '');
  const gdInfo = getGoogleDriveInfo(content?.final_url || bodyObj.finalUrl || '');
  const finalLink = content?.final_url || bodyObj.finalUrl || '';

  const canDelete = currentUser?.isAdmin || (currentUser?.name && content?.author_name?.includes(currentUser.name)) || (currentUser?.email && bodyObj.authorEmail === currentUser.email);

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = (e.target === e.currentTarget);
      }}
      onClick={(e) => {
        if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        isMouseDownOnBackdrop.current = false;
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .cdm-scroll { scrollbar-gutter: stable; }
        .cdm-scroll::-webkit-scrollbar { width: 5px; }
        .cdm-scroll::-webkit-scrollbar-track { background: transparent; }
        .cdm-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 4px; }
        .cdm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.7); }
        .motion-btn:active { transform: scale(0.96); }
      `}</style>

      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-[96%] max-w-[1400px] h-[90vh] max-h-[90vh] grid grid-cols-1 xl:grid-cols-[1.35fr_1.0fr] gap-6"
        style={{
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div 
          className="p-6 sm:p-7 xl:p-8 flex flex-col h-full max-h-full min-h-0 overflow-y-auto cdm-scroll bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
              콘텐츠 정보를 불러오는 중...
            </div>
          ) : !content ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
              콘텐츠를 찾을 수 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 pb-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      className="motion-btn px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors"
                      onClick={() => setActiveTab('proposal')}
                      style={{
                        backgroundColor: activeTab === 'proposal' ? '#1E3A8A' : 'transparent',
                        color: activeTab === 'proposal' ? '#ffffff' : 'inherit',
                      }}
                    >
                      📝 기획안 보기
                    </button>
                    <button
                      type="button"
                      className="motion-btn px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors"
                      onClick={() => setActiveTab('final')}
                      style={{
                        backgroundColor: activeTab === 'final' ? '#1E3A8A' : 'transparent',
                        color: activeTab === 'final' ? '#ffffff' : 'inherit',
                      }}
                    >
                      🎬 완성본 보기
                    </button>
                  </div>

                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
                    작성자: {content.author_name} · {content.created_at ? formatDate(content.created_at) : ''}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                  {content.title}
                </h2>
              </div>

              {activeTab === 'proposal' ? (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap gap-2">
                    {content.team && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                        {content.team === '유튜브' ? <YoutubeIcon className="w-3.5 h-3.5" /> :
                         content.team === '인스타' ? <InstagramIcon className="w-3.5 h-3.5" /> :
                         content.team === '블로그' ? <NaverBlogIcon className="w-3.5 h-3.5" /> :
                         <GenericPostIcon className="w-3.5 h-3.5" />}
                        {content.team}
                      </span>
                    )}
                    {content.content_type && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
                        {content.content_type}
                      </span>
                    )}
                    {bodyObj.targetMonth && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
                        📅 {bodyObj.targetMonth}
                      </span>
                    )}
                    {bodyObj.articleType && (
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
                        {bodyObj.articleType}
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                    <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2.5">
                      참여인원 (크루)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-blue-900 text-white rounded-full text-xs font-bold">
                        {content.author_name} (작성자)
                      </span>
                      {bodyObj.crew && bodyObj.crew.split(',').map((name: string, i: number) => {
                        const trimmed = name.trim();
                        if (!trimmed || content.author_name?.includes(trimmed)) return null;
                        return (
                          <span key={i} className="px-3 py-1 bg-[#002454] dark:bg-slate-700 text-white rounded-full text-xs font-bold">
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {bodyObj.docsUrl && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">📄 기획안 문서 URL</div>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <a
                          href={bodyObj.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-blue-600 dark:text-blue-400 text-xs font-bold truncate hover:underline"
                        >
                          {bodyObj.docsUrl}
                        </a>
                        <a
                          href={bodyObj.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors"
                        >
                          문서 열기 🔗
                        </a>
                      </div>
                    </div>
                  )}

                  {bodyObj.intent && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">💡 기획의도</div>
                      <CopyableBlock
                        textToCopy={bodyObj.intent}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                      >
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyObj.intent) }} />
                      </CopyableBlock>
                    </div>
                  )}

                  {bodyObj.composition && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">🎬 구성 및 내용</div>
                      <CopyableBlock
                        textToCopy={bodyObj.composition}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                      >
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyObj.composition) }} />
                      </CopyableBlock>
                    </div>
                  )}

                  {content.keywords && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">#해시태그</div>
                      <CopyableBlock
                        textToCopy={content.keywords.split(/[,\s]+/).map((k: string) => `#${k.trim()}`).filter((k: string) => k !== '#').join(' ')}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {content.keywords.split(/[,\s]+/).map((k: string) => k.trim()).filter(Boolean).map((k: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-md text-xs font-bold">
                              #{k}
                            </span>
                          ))}
                        </div>
                      </CopyableBlock>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bodyObj.desiredDate && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5">
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">희망 업로드 시기</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {bodyObj.desiredDate} {bodyObj.desiredDateEnd && bodyObj.desiredDateEnd !== bodyObj.desiredDate ? `~ ${bodyObj.desiredDateEnd}` : ''}
                        </div>
                      </div>
                    )}
                    {bodyObj.deadline && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5">
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">데드라인</div>
                        <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                          {bodyObj.deadline}
                        </div>
                      </div>
                    )}
                  </div>

                  {(content.description || bodyObj.description) && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">📝 비고</div>
                      <CopyableBlock
                        textToCopy={content.description || bodyObj.description}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
                      >
                        {content.description || bodyObj.description}
                      </CopyableBlock>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {youtubeVideoId ? (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg relative">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1`}
                        title="YouTube video player"
                        className="absolute top-0 left-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : gdInfo ? (
                    <div 
                      className="w-full rounded-2xl overflow-hidden bg-slate-900 shadow-lg relative"
                      style={{
                        aspectRatio: gdInfo.type === 'folder' ? '16 / 10' : content.content_type === '영상(숏폼)' ? '9 / 16' : '16 / 9',
                        maxHeight: '65vh'
                      }}
                    >
                      <iframe
                        src={gdInfo.type === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list` : `https://drive.google.com/file/d/${gdInfo.id}/preview`}
                        className="absolute top-0 left-0 w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {/* 구글 드라이브 / 완성본 결과물 링크 바로가기 박스 (항상 노출) */}
                  {finalLink || bodyObj.docsUrl ? (
                    <div className="bg-blue-50 dark:bg-slate-800/90 border border-blue-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
                      <div className="text-xs font-extrabold text-[#002454] dark:text-sky-300 flex items-center gap-1.5">
                        <span>📂</span> 구글 드라이브 및 원본 결과물 연결 링크
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <a
                          href={finalLink || bodyObj.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs sm:text-sm font-bold text-blue-700 dark:text-sky-400 hover:underline truncate flex-1 min-w-0"
                        >
                          {finalLink || bodyObj.docsUrl}
                        </a>
                        <a
                          href={finalLink || bodyObj.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-[#002454] hover:bg-blue-900 text-white rounded-xl text-xs font-extrabold whitespace-nowrap transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
                        >
                          구글 드라이브 열기 🔗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      등록된 구글 드라이브 링크가 없습니다.
                    </div>
                  )}

                  {bodyObj.postContent && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">본문 / 캡션 내용</div>
                      <CopyableBlock
                        htmlContent={bodyObj.postContent}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                      />
                    </div>
                  )}

                  {bodyObj.finalKeywords && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">해시태그</div>
                      <CopyableBlock
                        textToCopy={bodyObj.finalKeywords.split(/[,\s]+/).map((k: string) => `#${k.trim()}`).filter((k: string) => k !== '#').join(' ')}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {bodyObj.finalKeywords.split(/[,\s]+/).map((k: string) => k.trim()).filter(Boolean).map((k: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-md text-xs font-bold">
                              #{k}
                            </span>
                          ))}
                        </div>
                      </CopyableBlock>
                    </div>
                  )}

                  {(content.description || bodyObj.finalDescription) && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">비고 및 완성본 설명</div>
                      <CopyableBlock
                        textToCopy={content.description || bodyObj.finalDescription}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
                      >
                        {content.description || bodyObj.finalDescription}
                      </CopyableBlock>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[140px] bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3.5">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">현재 상태</div>
                      <div className="text-sm font-black text-emerald-900 dark:text-emerald-200">{content.status}</div>
                    </div>
                    {content.updated_at && (
                      <div className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5">
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">최종 수정일</div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(content.updated_at)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 h-full max-h-full min-h-0 overflow-hidden">
          {content && currentUser?.isAdmin && (
            <div className="flex flex-col gap-2">
              <AdminStatusManager
                item={content}
                onStatusChange={(newStatus) => {
                  setContent((prev: any) => prev ? { ...prev, status: newStatus } : prev);
                }}
                onDelete={canDelete ? handleDeleteContent : undefined}
              />
            </div>
          )}

          <div 
            onClick={() => setActiveTab(activeTab === 'proposal' ? 'final' : 'proposal')}
            className="cursor-pointer select-none rounded-2xl p-4 bg-primary-900 hover:bg-primary-800 text-white shadow-lg flex items-center justify-between transition-[background-color,transform] duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {activeTab === 'proposal' ? '🎬' : '📝'}
              </span>
              <span className="font-extrabold text-sm sm:text-base">
                {activeTab === 'proposal' ? '완성본 미리보기 전환' : '기획안 상세내용 전환'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
              ⇄
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base">피드백</span>
                <span className="bg-blue-900 text-white px-2 py-0.5 rounded-full text-xs font-extrabold">
                  {visibleDiscussionsCount}
                </span>
              </div>

              <div className="flex gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg">
                {(['all', 'proposal', 'final'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFeedbackFilter(tab)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-[color,background-color,box-shadow]"
                    style={{
                      backgroundColor: feedbackFilter === tab ? '#ffffff' : 'transparent',
                      color: feedbackFilter === tab ? '#1E3A8A' : 'inherit',
                      boxShadow: feedbackFilter === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {tab === 'all' ? '전체' : tab === 'proposal' ? '기획안' : '완성본'}
                  </button>
                ))}
              </div>
            </div>

            <div className="cdm-scroll flex-1 overflow-y-auto p-4 space-y-3">
              {filteredRootDiscussions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                  등록된 피드백이 없습니다. 첫 의견을 남겨보세요!
                </div>
              ) : (
                filteredRootDiscussions.map((root: any) => {
                  const replies = getAllReplies(root.id, rawDiscussions);
                  const renderCommentCard = (msg: any, depth: number, rootId: number) => {
                    const isVisible = canViewSecret(msg);
                    const roleColors: Record<string, { bg: string; text: string; label: string }> = {
                      admin: { bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300', text: '', label: '관리자' },
                      writer: { bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300', text: '', label: '작성자' },
                      crew: { bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300', text: '', label: '크루' },
                    };
                    const roleStyle = roleColors[msg.role] || roleColors.crew;
                    let mentionAuthor = '';
                    if (depth > 0 && msg.parentId !== rootId) {
                      const parent = rawDiscussions.find((d: any) => d.id === msg.parentId);
                      if (parent) mentionAuthor = parent.author;
                    }

                    return (
                      <div key={msg.id} style={{ marginLeft: depth > 0 ? '28px' : '0px' }} className="relative">
                        {depth > 0 && (
                          <div className="absolute -left-3.5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                        )}
                        <div
                          className={`p-3.5 rounded-2xl transition-colors shadow-2xs ${
                            msg.isSecret
                              ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`${depth > 0 ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} rounded-full bg-blue-900 text-white flex items-center justify-center font-bold shrink-0`}>
                                {msg.author?.[0] || '?'}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{msg.author}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {msg.createdAt ? formatDate(msg.createdAt) : ''}
                                  {msg.type === 'final' ? ' · 완성본' : ' · 기획안'}
                                  {msg.updatedAt && <span className="ml-1 italic">(수정됨)</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {msg.isSecret && (
                                <span className="text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  🔒 비밀
                                </span>
                              )}
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${roleStyle.bg}`}>
                                {roleStyle.label}
                              </span>

                              {canEditOrDeleteComment(msg) && editingCommentId !== msg.id && (
                                <div className="flex items-center gap-1 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(msg.id);
                                      setEditingCommentText(msg.text || '');
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  >
                                    수정
                                  </button>
                                  <span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCommentNode(msg.id)}
                                    className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {editingCommentId === msg.id ? (
                            <div className="flex flex-col gap-2 mt-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={2}
                                className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none resize-y focus:ring-1 focus:ring-blue-600"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText('');
                                  }}
                                  className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditedComment(msg.id)}
                                  className="px-3 py-1 text-[11px] font-bold rounded-md bg-blue-900 hover:bg-blue-800 text-white"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : !isVisible && msg.isSecret ? (
                            <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                              🔒 비밀댓글입니다.
                            </div>
                          ) : (
                            <>
                              <div className="text-xs leading-relaxed">
                                {mentionAuthor && (
                                  <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">@{mentionAuthor}</span>
                                )}
                                <span
                                  className="text-slate-800 dark:text-slate-200"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(parseCommentMarkdown(msg.text)) }}
                                />
                              </div>
                              {(msg.attachments || []).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((att: any, i: number) => (
                                    att.type === 'image' ? (
                                      <img key={i} src={att.url} alt="첨부 이미지" className="max-w-full rounded-lg shadow-2xs" />
                                    ) : null
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {editingCommentId !== msg.id && (isVisible || !msg.isSecret) && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTargetId(replyTargetId === msg.id ? null : msg.id);
                                setReplyText('');
                              }}
                              className="mt-2 text-[10px] font-extrabold text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
                            >
                              {replyTargetId === msg.id ? '답글 취소' : '답글 달기'}
                            </button>
                          )}
                        </div>

                        {replyTargetId === msg.id && (
                          <div className="mt-2 mb-1 flex flex-col gap-1.5" style={{ marginLeft: '16px' }}>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`${msg.author}님에게 답글 남기기...`}
                              rows={2}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(msg.id, replyText);
                                }
                              }}
                              className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none resize-y focus:ring-1 focus:ring-blue-600"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setReplyTargetId(null); setReplyText(''); }}
                                className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddComment(msg.id, replyText)}
                                disabled={isSaving || !replyText.trim()}
                                className="px-3 py-1 text-[11px] font-bold rounded-md bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white"
                              >
                                등록
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div key={root.id} className="flex flex-col gap-2">
                      {renderCommentCard(root, 0, root.id)}
                      {replies.map((reply: any) => renderCommentCard(reply, reply.depth, root.id))}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                💬 {activeTab === 'final' ? '완성본 피드백 작성' : '기획안 피드백 작성'}
              </div>

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="피드백을 남겨주세요... (마크다운, 이미지 첨부 지원)"
                rows={2}
                className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-200 outline-none resize-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />

              {attachedImage && (
                <div className="relative inline-block mt-2">
                  <img src={attachedImage} alt="첨부 미리보기" className="max-h-16 rounded-lg shadow-2xs" />
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors">
                    📎
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>

                  <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isSecret 
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-600 cursor-pointer"
                    />
                    <span>🔒 비밀</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddComment(null, newComment, attachedImage, isSecret)}
                  disabled={isSaving || (!newComment.trim() && !attachedImage)}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow transition-[background-color,opacity] cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? '저장 중...' : '보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
