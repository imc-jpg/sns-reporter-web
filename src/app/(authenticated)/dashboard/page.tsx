import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";
import DashboardCalendar from "@/components/DashboardCalendar";
import FeedbackBanner from "@/components/FeedbackBanner";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isAdmin = resolvedParams?.admin === 'true';
  const filterByMine = resolvedParams?.filter === 'mine';

  const supabase = await createClient();
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .order('created_at', { ascending: false });

  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  // 프로필 정보 가져오기 (커스텀 이름 사용을 위해)
  const { data: profile } = await supabase.from('contents')
    .select('author_name, keywords')
    .eq('title', `PROFILE_${userEmail}`)
    .single();

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const userGen = profile?.keywords || user?.user_metadata?.gen || '';
  const userNameToShow = profile ? `${userGen ? userGen + '기 ' : ''}${profile.author_name}` : (userName || userEmail?.split('@')[0] || '기자');

  const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const rawContents = (contents || [])
    .filter(item => item.status !== 'draft') // Filter out drafts from dashboard
    .map(item => {
      let pDate = null;
      let emailInJson = '';
      let feedbackRead = false;
      if (item.content_body && item.content_body.startsWith('{')) {
        try {
          const pb = JSON.parse(item.content_body);
          pDate = pb.publishDate || null;
          emailInJson = pb.authorEmail || '';
          feedbackRead = pb.feedbackRead === true;
        } catch(e) {}
      }
      const isMine = user && (emailInJson === userEmail || item.author_name === userEmail || item.author_name === userName || (userName && item.author_name?.includes(userName)));

      return { ...item, parsedPublishDate: pDate, isMine, isRead: feedbackRead };
    }).filter(item => {
      const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
    });

  const myContents = rawContents.filter(item => item.isMine);

  const pendingCount = myContents.filter(i => i.status === 'pending').length;
  const revisionCount = myContents.filter(i => i.status === 'revision').length;
  const approvedCount = myContents.filter(i => i.status === 'approved').length;
  const finalSubmittedCount = myContents.filter(i => i.status === 'final_submitted').length;
  const finalRevisionCount = myContents.filter(i => i.status === 'final_revision').length;
  const completedCount = myContents.filter(i => i.status === 'completed').length;
  const uploadedCount = myContents.filter(i => i.status === 'uploaded').length;

  let displayContents = rawContents;
  if (filterByMine && user) {
    displayContents = myContents;
  }
  
  // 피드백이 있는 항목 (수정요청 상태이거나, 보충 의견이 있으면서 아직 읽음(Dismiss) 처리 안 한 경우)
  const feedbackItems = myContents.filter(i => {
    const hasComment = !!i.feedback_comment;
    const isRevision = i.status === 'revision' || i.status === 'final_revision';
    const isApprovedWithComment = (i.status === 'approved' || i.status === 'completed') && hasComment && !i.isRead;
    return isRevision || isApprovedWithComment;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'draft': return <span className="badge" style={{backgroundColor: '#e5e7eb', color: '#4b5563'}}>임시저장</span>;
      case 'pending': return <span className="badge pending">대기</span>;
      case 'revision': return <span className="badge revision">기획안 수정요청</span>;
      case 'rejected': return <span className="badge" style={{backgroundColor: '#9ca3af', color: 'white'}}>반려</span>;
      case 'approved': return <span className="badge approved">기획안 통과</span>;
      case 'final_submitted': return <span className="badge" style={{backgroundColor: '#059669'}}>완성본 제출됨</span>;
      case 'final_revision': return <span className="badge" style={{backgroundColor: '#dc2626'}}>완성본 수정요청</span>;
      case 'completed': return <span className="badge" style={{backgroundColor: '#3b82f6'}}>업로드 대기</span>;
      case 'uploaded': return <span className="badge" style={{backgroundColor: '#10b981'}}>업로드 완료</span>;
      default: return null;
    }
  };

  const getTeamColor = (team: string) => {
    switch(team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fce7f3', text: '#ec4899' };
      case '블로그': return { bg: '#dcfce7', text: '#22c55e' };
      case '단장 팀': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  }

  const getTypeColor = (typeStr: string) => {
    switch(typeStr) {
      case '영상(롱폼)': return { bg: '#ffedd5', text: '#f97316' };
      case '영상(숏폼)': return { bg: '#fef3c7', text: '#d97706' };
      case '카드뉴스': return { bg: '#dbeafe', text: '#3b82f6' };
      case '글 기사': return { bg: '#ecfdf5', text: '#10b981' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  }

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          {isAdmin ? `${currentMonth}월 콘텐츠 현황 (관리자)` : `${currentMonth}월 기획안 타임라인`}
        </h2>
        {isAdmin && <span className="badge" style={{ backgroundColor: 'var(--color-primary)' }}>관리자 모드</span>}
      </div>

      {user && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              환영합니다, <span style={{ color: 'var(--color-primary)' }}>{userNameToShow}</span>님! 🎉
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
              {currentMonth}월 나의 기획안 진행 현황을 한눈에 확인하세요.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '12px', textAlign: 'center', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700, marginBottom: '0.4rem' }}>기획안 대기</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>{pendingCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '12px', textAlign: 'center', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '0.4rem' }}>기획안 수정</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c' }}>{revisionCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '12px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 700, marginBottom: '0.4rem' }}>기획안 통과</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e40af' }}>{approvedCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '12px', textAlign: 'center', border: '1px solid #fef3c7' }}>
              <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700, marginBottom: '0.4rem' }}>완성본 대기</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>{finalSubmittedCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fff1f2', borderRadius: '12px', textAlign: 'center', border: '1px solid #ffe4e6' }}>
              <div style={{ fontSize: '0.8rem', color: '#e11d48', fontWeight: 700, marginBottom: '0.4rem' }}>완성본 수정</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#be123c' }}>{finalRevisionCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '12px', textAlign: 'center', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, marginBottom: '0.4rem' }}>업로드 대기</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>{completedCount}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '12px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.4rem' }}>업로드 완료</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>{uploadedCount}</div>
            </div>
          </div>
        </>
      )}

      {/* 피드백 알림 섹션 (Client Component) */}
      {!isAdmin && feedbackItems.length > 0 && (
        <FeedbackBanner initialItems={feedbackItems} />
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 3.5 }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Link 
              href="/dashboard"
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, backgroundColor: !filterByMine ? 'var(--color-primary)' : 'white', color: !filterByMine ? 'white' : 'var(--color-text-main)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
            >
              전체 보기
            </Link>
            <Link 
              href="/dashboard?filter=mine"
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, backgroundColor: filterByMine ? 'var(--color-primary)' : 'white', color: filterByMine ? 'white' : 'var(--color-text-main)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
            >
              내 기획안만 보기
            </Link>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '1rem', fontWeight: 500, width: '13%' }}>등록일/상태</th>
                  <th style={{ padding: '1rem', fontWeight: 500, width: '9%' }}>팀</th>
                  <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>종류</th>
                  <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>작성자</th>
                  <th style={{ padding: '1rem', fontWeight: 500, width: isAdmin ? '32%' : '58%' }}>제목</th>
                  {isAdmin && <th style={{ padding: '1rem', fontWeight: 500, width: '26%' }}>관리 (상태/피드백)</th>}
                </tr>
              </thead>
              <tbody>
                {displayContents.length === 0 && (
                  <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td></tr>
                )}
                {displayContents.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      { (isAdmin || item.isMine ) ? (
                          <StatusBadge status={item.status} />
                      ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {item.team ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: getTeamColor(item.team).bg, color: getTeamColor(item.team).text, display: 'inline-block' }}>
                          {item.team}
                        </span>
                      ) : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {item.content_type ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: getTypeColor(item.content_type).bg, color: getTypeColor(item.content_type).text, display: 'inline-block' }}>
                          {item.content_type}
                        </span>
                      ) : <span style={{ color: '#ccc' }}>-</span>}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{item.author_name}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'underline', color: 'var(--color-text-main)', display: 'block', marginBottom: '0.25rem' }}>
                        {item.title}
                      </Link>
                      {item.parsedPublishDate && (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: 'var(--color-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginBottom: '0.25rem' }}>
                          📅 업로드 희망: {item.parsedPublishDate}
                        </span>
                      )}
                      { (isAdmin || item.isMine) && item.feedback_comment && (
                        <div style={{ 
                            fontSize: '0.8rem', 
                            color: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '#1e40af' : 'var(--status-revision)', 
                            marginTop: '0.5rem', 
                            backgroundColor: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '#eff6ff' : '#fef2f2', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            border: (item.status === 'approved' || item.status === 'completed' || item.status === 'active') ? '1px solid #bfdbfe' : 'none'
                          }}>
                          💬 {(item.status === 'approved' || item.status === 'completed') ? '참고/보충 의견: ' : ''}{item.feedback_comment}
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '1rem' }}>
                        <AdminStatusManager item={item} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 우측 상단 캘린더 */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '10px' }}>
          <DashboardCalendar contents={displayContents} />
        </div>
      </div>
    </div>
  );
}
