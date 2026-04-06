import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function FinalWorksListPage() {
  const supabase = await createClient();
  
  // 기획안이 통과되었거나 (approved), 완성본이 이미 제출된(completed 등) 모든 목록
  const { data: contents, error } = await supabase
    .from('contents')
    .select('*')
    .in('status', ['approved', 'completed'])
    .order('created_at', { ascending: false });

  const rawContents = contents || [];

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>완성본 목록</h2>
        <Link 
          href="/final-works/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 완성본 등록
        </Link>
      </div>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        기획안 검수가 통과된 항목의 최종 결과물을 등록하고, 이미 등록된 완성본들을 한눈에 확인합니다.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>제출 여부</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '20%' }}>작성자</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '45%' }}>기획안 제목</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '20%' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {rawContents.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>승인 대기 중인 완성본 대상이 없습니다.</td></tr>
            ) : (
              rawContents.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: item.final_url ? 'white' : '#fffbeb' }}>
                  <td style={{ padding: '1rem' }}>
                    {item.final_url ? (
                      <span className="badge" style={{ backgroundColor: '#10b981' }}>제출 완료</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#f59e0b' }}>제출 대기</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{item.author_name}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{item.title}</td>
                  <td style={{ padding: '1rem' }}>
                    {item.final_url ? (
                      <a href={item.final_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
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
}
