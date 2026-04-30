import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import AdminStatusManager from "@/components/AdminStatusManager";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchResultsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';
  const isAdmin = resolvedParams?.admin === 'true';

  const supabase = await createClient();

  const { data: contents } = await supabase
    .from('contents')
    .select('*')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  let results = contents || [];

  if (query) {
    const qLower = query.toLowerCase();
    results = results.filter(item => 
      item.title?.toLowerCase().includes(qLower) ||
      item.author_name?.toLowerCase().includes(qLower) ||
      item.team?.toLowerCase().includes(qLower) ||
      item.content_type?.toLowerCase().includes(qLower) ||
      item.feedback_comment?.toLowerCase().includes(qLower) ||
      item.content_body?.toLowerCase().includes(qLower)
    );
  }

  const getTeamColor = (team: string) => {
    switch (team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fce7f3', text: '#ec4899' };
      case '블로그': return { bg: '#dcfce7', text: '#22c55e' };
      case '단장 팀': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case '영상(롱폼)': return { bg: '#ffedd5', text: '#f97316' };
      case '영상(숏폼)': return { bg: '#fef3c7', text: '#d97706' };
      case '카드뉴스': return { bg: '#dbeafe', text: '#3b82f6' };
      case '글 기사': return { bg: '#ecfdf5', text: '#10b981' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
          "{query}" 검색 결과 <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>({results.length}건)</span>
        </h2>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E6EBF2', backgroundColor: '#F8FAFC' }}>
              <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>등록일/상태</th>
              <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>팀/종류</th>
              <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>작성자</th>
              <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>콘텐츠 제목</th>
              {isAdmin && <th style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#64748B', fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'left' }}>상태 관리</th>}
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
            {results.map(item => {
              const tc = getTeamColor(item.team || '');
              const tyc = getTypeColor(item.content_type || '');
              const statusColors: Record<string, { bg: string; text: string }> = {
                pending: { bg: '#FEF3C7', text: '#B45309' },
                revision: { bg: '#FEE2E2', text: '#B91C1C' },
                approved: { bg: '#D1FAE5', text: '#047857' },
                final_submitted: { bg: '#DBEAFE', text: '#1D4ED8' },
                final_revision: { bg: '#FEE2E2', text: '#B91C1C' },
                completed: { bg: '#E6EBF2', text: '#003378' },
                uploaded: { bg: '#D1FAE5', text: '#047857' },
              };
              const sc = statusColors[item.status] || { bg: '#f3f4f6', text: '#6b7280' };
              const statusLabel: Record<string, string> = {
                pending: '대기', revision: '기획안 수정요청',
                approved: '기획안 통과', final_submitted: '완성본 제출', final_revision: '완성본 수정요청',
                completed: '업로드 대기', uploaded: '업로드 완료'
              };

              let pDate = null;
              if (item.content_body?.startsWith('{')) {
                try {
                  pDate = JSON.parse(item.content_body).publishDate;
                } catch {}
              }

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.85rem 0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </div>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '999px', backgroundColor: sc.bg, color: sc.text, fontWeight: 700 }}>
                      {statusLabel[item.status] || item.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {item.team && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text, display: 'inline-block' }}>{item.team}</span>}
                      {item.content_type && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: tyc.bg, color: tyc.text, display: 'inline-block' }}>{item.content_type}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#334155' }}>
                    {item.author_name}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem' }}>
                    <Link href={`/proposals/submit?id=${item.id}`} style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', display: 'block', marginBottom: '0.3rem' }}>
                      {item.title}
                    </Link>
                    {pDate && (
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        📅 {pDate}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '0.85rem 0.75rem', minWidth: '180px' }}>
                      <AdminStatusManager item={item} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
