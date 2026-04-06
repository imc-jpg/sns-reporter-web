import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";

export default async function ProposalsListPage() {
  const supabase = await createClient();
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .order('created_at', { ascending: false });

  const rawContents = contents || [];

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending': return <span className="badge pending">대기</span>;
      case 'revision': return <span className="badge revision">수정요청</span>;
      case 'approved': return <span className="badge approved">기획안 통과</span>;
      case 'completed': return <span className="badge completed">최종완료</span>;
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>기획안 목록</h2>
        <Link 
          href="/proposals/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 기획안 작성
        </Link>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        학생 기자단원들이 등록한 기획안 리스트입니다. 자신의 기획안 제목을 클릭하여 수정할 수 있습니다.
      </p>

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
            {rawContents.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다. 처음으로 기획안을 작성해보세요!</td></tr>
            )}
            {rawContents.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}><StatusBadge status={item.status} /></td>
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
                  <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'underline', color: 'var(--color-text-main)' }}>
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
}
