import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function FinalWorksListPage() {
  const supabase = await createClient();
  
  // 기획안이 통과되었거나 (approved), 완성본이 이미 제출된(completed, uploaded 등) 모든 목록
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .in('status', ['final_submitted', 'final_revision', 'completed', 'uploaded'])
    .order('created_at', { ascending: false });

  const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const rawContents = (contents || []).map(item => {
    let isDraft = false;
    if (item.content_body && item.content_body.startsWith('{')) {
      try {
        const parsed = JSON.parse(item.content_body);
        isDraft = parsed.isDraft || false;
      } catch(e) {}
    }
    return { ...item, isDraft };
  }).filter(item => {
    const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

  const getTeamColor = (team: string) => {
    switch(team) {
      case '유튜브': return { bg: '#fee2e2', text: '#ef4444' };
      case '인스타': return { bg: '#fce7f3', text: '#ec4899' };
      case '블로그': return { bg: '#dcfce7', text: '#22c55e' };
      case '단장 팀': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  }

  const youtubeWorks = rawContents.filter(item => item.team === '유튜브');
  const instaWorks = rawContents.filter(item => item.team === '인스타');
  const blogWorks = rawContents.filter(item => item.team === '블로그');
  const otherWorks = rawContents.filter(item => item.team !== '유튜브' && item.team !== '인스타' && item.team !== '블로그');

  const WorksTable = ({ items, title, color }: { items: any[], title: string, color: string }) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '20px', backgroundColor: color, borderRadius: '4px' }}></span>
        {title}
      </h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>상태</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>작성자</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '45%' }}>기획안 제목</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '25%' }}>완성본 확인 / 링크</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>이 팀의 완성본 대상이 없습니다.</td></tr>
            ) : (
               items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}>
                  <td style={{ padding: '1rem' }}>
                    {item.status === 'uploaded' ? (
                      <span className="badge" style={{ backgroundColor: '#10b981' }}>업로드 완료</span>
                    ) : item.status === 'completed' ? (
                      <span className="badge" style={{ backgroundColor: '#3b82f6' }}>업로드 대기</span>
                    ) : item.status === 'final_submitted' ? (
                      <span className="badge" style={{ backgroundColor: '#059669' }}>완성본 검수중</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#dc2626' }}>완성본 수정요청</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{item.author_name}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    <Link href={`/final-works/submit?id=${item.id}`} style={{ textDecoration: 'underline', color: 'var(--color-primary)' }}>
                      {item.title}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {item.final_url ? (
                      <a href={item.final_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                        원본 보기 ↗
                      </a>
                    ) : (
                      <Link href={`/final-works/submit?id=${item.id}`} style={{ padding: '0.4rem 0.8rem', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        작성하기
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{currentMonth}월 완성본 목록</h2>
        <Link 
          href="/final-works/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 완성본 등록
        </Link>
      </div>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
        기획안 검수가 통과된 항목의 최종 결과물을 등록하고, 이미 등록된 완성본들을 팀별로 확인합니다.
      </p>

      <WorksTable items={youtubeWorks} title="유튜브 팀" color="#ef4444" />
      <WorksTable items={instaWorks} title="인스타 팀" color="#ec4899" />
      <WorksTable items={blogWorks} title="블로그 팀" color="#22c55e" />
      {otherWorks.length > 0 && <WorksTable items={otherWorks} title="단장 팀 / 기타" color="#4f46e5" />}
    </div>
  );
}
