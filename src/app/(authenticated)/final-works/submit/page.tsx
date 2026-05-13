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
    discussions: [] as any[],
    uploadedFileUrl: '',
    uploadedFileName: ''
  });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 제한 (100MB)
      if (file.size > 100 * 1024 * 1024) {
         setFormData(prev => ({ ...prev, uploadedFileName: '업로드 오류 (100MB 초과)' }));
         alert('최대 100MB까지만 시스템에 직접 업로드할 수 있습니다.\n용량이 큰 영상은 유튜브나 구글 드라이브 주소를 본문에 삽입해주세요.');
         return;
      }
      
      // 파일 업로드 시작 (프론트엔드 직접 업로드, 타임아웃 적용)
      try {
        setFormData(prev => ({ ...prev, uploadedFileName: '업로드 중...' }));
        
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${uniqueSuffix}_${sanitizedName}`;

        const uploadPromise = supabase.storage
          .from('final_works')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false
          });

        // 30초 내에 안되면 타임아웃
        const timeoutPromise = new Promise<{data: any, error: any}>((resolve) => 
            setTimeout(() => resolve({ data: null, error: { message: '네트워크 상태 지연으로 인해 시간이 초과되었습니다.' } }), 30000)
        );

        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

        if (error) {
          console.error('Upload Error:', error);
          if (error.message.includes('Bucket not found') || error.message.includes('not exist')) {
             setFormData(prev => ({ ...prev, uploadedFileName: '오류: final_works 버킷 누락' }));
             alert('Supabase 스토리지에 "final_works"라는 이름의 공개(Public) 버킷을 먼저 생성해주세요!');
          } else {
             setFormData(prev => ({ ...prev, uploadedFileName: `업로드 실패: ${error.message}` }));
             alert(`업로드 실패: ${error.message}`);
          }
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('final_works').getPublicUrl(path);
        
        setFormData(prev => ({ ...prev, uploadedFileUrl: publicUrl, uploadedFileName: file.name }));
      } catch (err: any) {
        console.error('File upload failed:', err);
        setFormData(prev => ({ ...prev, uploadedFileName: `업로드 오류: ${err.message}` }));
      }
    } else {
      setFormData(prev => ({ ...prev, uploadedFileUrl: '', uploadedFileName: '' }));
    }
  };


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
          let uploadedFileUrl = '';
          let uploadedFileName = '';
          try {
            const body = JSON.parse(current.content_body);
            discussions = body.discussions || [];
            postContent = body.postContent || '';
            desiredDate = body.desiredDate || '';
            uploadedFileUrl = body.uploadedFileUrl || '';
            uploadedFileName = body.uploadedFileName || '';
          } catch(e) {}

          setFormData({
            proposalId: current.id.toString(),
            finalUrl: current.final_url || '',
            postContent: postContent,
            desiredDate: desiredDate,
            discussions: discussions,
            uploadedFileUrl: uploadedFileUrl,
            uploadedFileName: uploadedFileName
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
    let bodyData: any = {};
    try {
      if (current?.content_body) bodyData = JSON.parse(current.content_body);
    } catch(e) {}

    const updatedBody = {
      ...bodyData,
      postContent: formData.postContent,
      desiredDate: formData.desiredDate,
      discussions: formData.discussions,
      uploadedFileUrl: formData.uploadedFileUrl,
      uploadedFileName: formData.uploadedFileName,
      finalSubmittedAt: bodyData.finalSubmittedAt || new Date().toISOString()
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
      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '32px', padding: '3rem', color: 'white', boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.4)', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', right: '15%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {initialId ? (isReadOnly ? '완성본 상세보기' : '완성본 수정') : '완성본 등록'}
            </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-6">
        <div style={{ padding: '2rem', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📌 제출 정보
          </h3>
          <div className="flex-col gap-6">
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>대상 기획안 선택 <span style={{color: '#ef4444'}}>*</span></label>
              <select 
                value={formData.proposalId} 
                onChange={(e) => setFormData({...formData, proposalId: e.target.value})}
                required
                style={{ padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}
                disabled={!!initialId || isReadOnly || isSubmitting}
              >
                <option value="">-- 기획안을 선택하세요 --</option>
                {availableProposals.map(p => (
                  <option key={p.id} value={p.id}>{`[${p.author_name}] ${p.title}`}</option>
                ))}
              </select>
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>최종 결과물 URL (유튜브/블로그/인스타 링크)</label>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem', lineHeight: 1.4 }}>
                * 유튜브 영상(일부 공개) 또는 구글 드라이브(보기 권한 허용) 링크를 입력하시면 아래에서 미리보기가 가능합니다.
              </div>
              <input 
                type="text" 
                value={formData.finalUrl} 
                onChange={(e) => setFormData({...formData, finalUrl: e.target.value})}
                placeholder="https://youtu.be/..."
                disabled={isReadOnly || isSubmitting}
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.8rem 1rem', borderRadius: '8px' }}
              />
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>직접 파일 첨부 (선택)</label>
              {!isReadOnly && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem', lineHeight: 1.4 }}>
                  * 결과물을 직접 다운로드할 수 있도록 파일을 업로드하는 기능입니다. 미리보기는 제공되지 않습니다.
                </div>
              )}
              
              {!isReadOnly && (
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  style={{ padding: '0.6rem', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc', width: '100%' }}
                />
              )}

              {formData.uploadedFileName ? (
                <div style={{ marginTop: '0.5rem' }}>
                  {formData.uploadedFileName.includes('업로드 중') ? (
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>⏳ {formData.uploadedFileName}</span>
                  ) : formData.uploadedFileName.includes('오류') || formData.uploadedFileName.includes('실패') ? (
                    <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>❌ {formData.uploadedFileName}</span>
                  ) : formData.uploadedFileUrl ? (
                    <a 
                      href={formData.uploadedFileUrl} 
                      download={formData.uploadedFileName} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: '0.95rem', color: '#0ea5e9', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s', alignSelf: 'flex-start' }}
                    >
                      💾 첨부된 파일: {formData.uploadedFileName}
                    </a>
                  ) : null}
                </div>
              ) : isReadOnly ? (
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', padding: '0.5rem 0' }}>첨부된 파일이 없습니다.</div>
              ) : null}
            </div>

            {/* 미리보기 렌더링 영역 */}
            {(() => {
              const ytId = getYoutubeVideoId(formData.finalUrl);
              const gdInfo = getGoogleDriveInfo(formData.finalUrl);
              if (!ytId && !gdInfo) return null;

              return (
                <div style={{ marginTop: '0.5rem', padding: '1.5rem', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                   <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      👀 {ytId ? '유튜브 영상' : gdInfo?.type === 'folder' ? '구글 드라이브 폴더' : '구글 드라이브 파일'} 미리보기
                   </h4>
                   <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: gdInfo ? '#f8fafc' : 'black' }}>
                      <div style={{ position: 'relative', paddingBottom: gdInfo ? '75%' : '56.25%', height: 0 }}>
                        {ytId ? (
                          <iframe 
                            src={`https://www.youtube.com/embed/${ytId}`} 
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          />
                        ) : (
                          <iframe 
                            src={gdInfo?.type === 'folder' 
                              ? `https://drive.google.com/embeddedfolderview?id=${gdInfo.id}#list`
                              : `https://drive.google.com/file/d/${gdInfo!.id}/preview`} 
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                            frameBorder="0" 
                            allowFullScreen
                          />
                        )}
                      </div>
                   </div>
                </div>
              );
            })()}

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>업로드 희망일</label>
              <input 
                type="date" 
                value={formData.desiredDate} 
                onChange={(e) => setFormData({...formData, desiredDate: e.target.value})}
                disabled={isReadOnly || isSubmitting}
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.8rem 1rem', borderRadius: '8px' }}
              />
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>게시물 본문 (포스팅 텍스트)</label>
              <textarea 
                value={formData.postContent} 
                onChange={(e) => setFormData({...formData, postContent: e.target.value})}
                placeholder="게시물에 실제로 올릴 문구를 작성해주세요."
                rows={10}
                disabled={isReadOnly || isSubmitting}
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}
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
