'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function ProposalSubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idToEdit = searchParams?.get('id');
  const supabase = createClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!idToEdit);
  
  const [formData, setFormData] = useState({
    title: '',
    authorName: '',
    team: '',
    contentType: '',
    keywords: '',
    intent: '',
    targetDate: '',
    deadline: '',
    contentBody: '',
    docsUrl: '',
    description: ''
  });

  useEffect(() => {
    if (idToEdit) {
      const fetchEditData = async () => {
        const { data, error } = await supabase
          .from('contents')
          .select('*')
          .eq('id', idToEdit)
          .single();
          
        if (data) {
          setFormData({
            title: data.title || '',
            authorName: data.author_name || '',
            team: data.team || '',
            contentType: data.content_type || '',
            keywords: data.keywords || '',
            intent: data.intent || '',
            targetDate: data.target_date || '',
            deadline: data.deadline || '',
            contentBody: data.content_body || '',
            docsUrl: data.proposal_url || '',
            description: data.description || ''
          });
        }
        setIsLoadingData(false);
      };
      
      fetchEditData();
    }
  }, [idToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title: formData.title,
      author_name: formData.authorName,
      team: formData.team,
      content_type: formData.contentType,
      keywords: formData.keywords,
      intent: formData.intent,
      target_date: formData.targetDate,
      deadline: formData.deadline,
      content_body: formData.contentBody,
      proposal_url: formData.docsUrl,
      description: formData.description,
      status: 'pending'
    };

    let errorObj;
    
    if (idToEdit) {
      const { error } = await supabase
        .from('contents')
        .update(payload)
        .eq('id', idToEdit);
      errorObj = error;
    } else {
      const { error } = await supabase
        .from('contents')
        .insert([payload]);
      errorObj = error;
    }

    setIsSubmitting(false);

    if (errorObj) {
      alert('오류가 발생했습니다: ' + errorObj.message);
      console.error(errorObj);
    } else {
      alert(idToEdit ? '기획안이 성공적으로 수정되었습니다!' : '기획안이 성공적으로 제출되었습니다!');
      router.push('/proposals');
      router.refresh();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoadingData) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>데이터 불러오는 중...</div>;
  }

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
        {idToEdit ? '콘텐츠 기획안 수정' : '콘텐츠 기획안 작성'}
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        기획안 내용을 사이트에서 직접 적어주시거나, <b>구글 Docs 링크만 입력</b>하셔도 무방합니다. 두 가지 방식을 모두 지원합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex-col gap-4">
        {/* 기본 정보 구역 */}
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>기본 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>제목 (가제) <span style={{color: 'red'}}>*</span></label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="예: 봄맞이 캠퍼스 투어" required />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>제작인원(이름) <span style={{color: 'red'}}>*</span></label>
              <input type="text" name="authorName" value={formData.authorName} onChange={handleChange} placeholder="예: 23기 홍길동" required />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>소속 팀 <span style={{color: 'red'}}>*</span></label>
              <select name="team" value={formData.team} onChange={handleChange} required style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <option value="" disabled>-- 팀 선택 --</option>
                <option value="유튜브">유튜브</option>
                <option value="인스타">인스타</option>
                <option value="블로그">블로그</option>
                <option value="단장 팀">단장 팀</option>
              </select>
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>콘텐츠 종류 <span style={{color: 'red'}}>*</span></label>
              <select name="contentType" value={formData.contentType} onChange={handleChange} required style={{ padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <option value="" disabled>-- 분류 선택 --</option>
                <option value="영상(롱폼)">영상(롱폼)</option>
                <option value="영상(숏폼)">영상(숏폼)</option>
                <option value="카드뉴스">카드뉴스</option>
                <option value="글 기사">글 기사</option>
              </select>
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>취재일정 (일시)</label>
              <input type="text" name="targetDate" value={formData.targetDate} onChange={handleChange} placeholder="예: 25.4.7" />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>데드라인 (발행예정일)</label>
              <input type="text" name="deadline" value={formData.deadline} onChange={handleChange} placeholder="예: 25.4.10" />
            </div>
          </div>
        </div>

        {/* 본문 에디터 구역 */}
        <div style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>기획안 본문 작성 (직접 작성 시)</h3>
          
          <div className="flex-col gap-4">
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>키워드</label>
              <input type="text" name="keywords" value={formData.keywords} onChange={handleChange} placeholder="#연세대학교 #봄 #벚꽃" />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>기획의도</label>
              <textarea name="intent" value={formData.intent} onChange={handleChange} placeholder="이 콘텐츠를 기획하게 된 배경이나 목적을 작성해주세요." rows={3} />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>추가 상세내용 (자유 양식)</label>
              <textarea name="contentBody" value={formData.contentBody} onChange={handleChange} placeholder="기획안에 필요한 기타 세부 내용들을 자유롭게 적어주세요." rows={6} />
            </div>
          </div>
        </div>

        {/* 구글 닥스 링크 구역 */}
        <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>구글 Docs 링크로 대체하기</h3>
          
          <div className="flex-col gap-4">
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>구글 Docs URL 제출</label>
              <input type="url" name="docsUrl" value={formData.docsUrl} onChange={handleChange} placeholder="본문을 위해 구글문서 링크를 쓰신다면 이곳에 첨부하세요." />
            </div>
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>관리자에게 남길 코멘트</label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="기획안과 관련하여 관리자(담당자)에게 남길 메모" rows={2} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => router.back()} disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', fontWeight: 600 }}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
            {isSubmitting ? '처리 중...' : (idToEdit ? '기획안 수정하기' : '기획안 제출하기')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProposalSubmitForm />
    </Suspense>
  );
}
