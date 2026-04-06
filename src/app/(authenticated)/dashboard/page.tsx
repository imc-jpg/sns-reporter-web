import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";
import DashboardCalendar from "@/components/DashboardCalendar";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isAdmin = resolvedParams?.admin === 'true';

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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          {isAdmin ? '월간 콘텐츠 현황 (관리자)' : '전체 기획안 타임라인'}
        </h2>
        {isAdmin && <span className="badge" style={{ backgroundColor: 'var(--color-primary)' }}>관리자 모드</span>}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* 중앙 스프레드시트 뷰 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: 500 }}>등록일/상태</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>소속 팀</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>콘텐츠 종류</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>작성자</th>
                <th style={{ padding: '1rem', fontWeight: 500, width: '25%' }}>제목</th>
                {isAdmin && <th style={{ padding: '1rem', fontWeight: 500 }}>관리 (상태변경/코멘트)</th>}
              </tr>
            </thead>
            <tbody>
              {rawContents.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td></tr>
              )}
              {rawContents.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <StatusBadge status={item.status} />
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
                    {item.publish_date && (
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: 'var(--color-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginBottom: '0.25rem' }}>
                        📅 업로드 희망: {item.publish_date}
                      </span>
                    )}
                    {item.feedback_comment && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--status-revision)', marginTop: '0.5rem', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '4px' }}>
                        💬 {item.feedback_comment}
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

        {/* 우측 상단 캘린더 */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '10px' }}>
          <DashboardCalendar contents={rawContents} />
        </div>

      </div>
    </div>
  );
}
