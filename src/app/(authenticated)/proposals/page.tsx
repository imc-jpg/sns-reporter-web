import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProposalsListPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filterByMine = resolvedParams?.filter === 'mine';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('status', 'draft') // Hide drafts from list
    .order('created_at', { ascending: false });

  const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const processedContents = (contents || []).map(item => {
    let emailInJson = '';
    try {
      if (item.content_body && item.content_body.startsWith('{')) {
        const obj = JSON.parse(item.content_body);
        emailInJson = obj.authorEmail || '';
      }
    } catch(e) {}
    
    const isMine = user && (emailInJson === userEmail || 
                           item.author_name === userEmail || 
                           item.author_name === userName ||
                           (userName && item.author_name?.includes(userName)));
    return { ...item, isMine };
  });

  let monthContents = processedContents.filter(item => {
    const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

  if (filterByMine) {
    monthContents = monthContents.filter(item => item.isMine);
  }

  const rawContents = monthContents;

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

  const youtubeContents = rawContents.filter(item => item.team === '유튜브');
  const instaContents = rawContents.filter(item => item.team === '인스타');
  const blogContents = rawContents.filter(item => item.team === '블로그');
  const otherContents = rawContents.filter(item => item.team !== '유튜브' && item.team !== '인스타' && item.team !== '블로그');

  const ProposalTable = ({ items, title, color }: { items: any[], title: string, color: string }) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '20px', backgroundColor: color, borderRadius: '4px' }}></span>
        {title}
      </h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>상태</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>소속 팀</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '10%' }}>콘텐츠 종류</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>작성자</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '25%' }}>제목</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>취재일/발행일</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>등록된 기획안이 없습니다.</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}>
                    {item.isMine ? <StatusBadge status={item.status} /> : <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>-</span>}
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
                  <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'underline', color: 'var(--color-primary)' }}>
                    {item.title}
                  </Link>
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {item.target_date && <div>취재: {item.target_date}</div>}
                  {item.deadline && <div>발행: {item.deadline}</div>}
                  {(!item.target_date && !item.deadline) && '-'}
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{currentMonth}월 기획안 목록</h2>
        <Link 
          href="/proposals/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 기획안 작성
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
          학생 기자단원들이 등록한 기획안 리스트입니다. 자신의 기획안 제목을 클릭하여 수정할 수 있습니다.
        </p>
        
        {user && (
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <Link 
              href="/proposals" 
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: !filterByMine ? 'var(--color-primary-light)' : 'transparent', color: !filterByMine ? 'var(--color-primary)' : 'var(--color-text-muted)', textDecoration: 'none' }}
            >
              전체 기획안
            </Link>
            <Link 
              href="/proposals?filter=mine" 
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: filterByMine ? 'var(--color-primary-light)' : 'transparent', color: filterByMine ? 'var(--color-primary)' : 'var(--color-text-muted)', textDecoration: 'none' }}
            >
              내 기획안만 보기
            </Link>
          </div>
        )}
      </div>

      <ProposalTable items={youtubeContents} title="유튜브 팀" color="#ef4444" />
      <ProposalTable items={instaContents} title="인스타 팀" color="#ec4899" />
      <ProposalTable items={blogContents} title="블로그 팀" color="#22c55e" />
      {otherContents.length > 0 && <ProposalTable items={otherContents} title="단장 팀 / 기타" color="#4f46e5" />}
    </div>
  );
}
