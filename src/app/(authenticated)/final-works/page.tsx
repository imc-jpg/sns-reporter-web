import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { isTraineeContent } from "@/utils/trainee";
import { YoutubeIcon, InstagramIcon, NaverBlogIcon } from "@/components/platformIcons";

export default async function FinalWorksListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  // [성능 최적화] 프로필 조회와 완성본 목록 조회를 Promise.all로 병렬 실행
  const [{ data: profile }, { data: contents }] = await Promise.all([
    userEmail
      ? supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('contents')
      .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment, content_body')
      .in('status', ['final_submitted', 'final_revision', 'completed', 'uploaded'])
      .order('created_at', { ascending: false })
      .range(0, 49)
  ]);

  let realName = profile?.author_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null;

  const currentDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const rawContents = (contents || []).map(item => {
    let isDraft = false;
    let desiredDate = "-";
    let emailInJson = '';
    let crewString = '';

    if ((item as any).content_body && (item as any).content_body.startsWith('{')) {
      try {
        const parsed = JSON.parse((item as any).content_body);
        isDraft = parsed.isDraft || false;
        if (parsed.desiredDate) {
          desiredDate = parsed.desiredDate;
        }
        emailInJson = parsed.authorEmail || '';
        if (typeof parsed.crew === 'string') {
          crewString = parsed.crew;
        } else if (Array.isArray(parsed.crew)) {
          crewString = parsed.crew.map((c: any) => c.name || '').join(',');
        }
      } catch(e) {}
    }

    const isAuthor = user && (emailInJson === userEmail || 
                           item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = isAuthor || isCrew;

    return { ...item, isDraft, desiredDate, isMine, isAuthor, isCrew };
  }).filter(item => !isTraineeContent(item))
  .filter(item => {
    const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  const getTeamIcon = (title: string) => {
    if (title.includes('유튜브')) {
      return <YoutubeIcon className="w-6 h-6 inline-block" style={{ width: '24px', height: '24px' }} />;
    }
    if (title.includes('인스타')) {
      return <InstagramIcon className="w-6 h-6 inline-block" style={{ width: '24px', height: '24px' }} />;
    }
    if (title.includes('블로그')) {
      return <NaverBlogIcon className="w-6 h-6 inline-block" style={{ width: '24px', height: '24px' }} />;
    }
    return null;
  };

  const WorksTable = ({ items, title, color }: { items: any[], title: string, color: string }) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 className="typo-h2" style={{ marginBottom: '1rem', color: color, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '20px', backgroundColor: color, borderRadius: '3px', marginRight: '0.2rem' }}></span>
        {getTeamIcon(title)}
        {title}
      </h3>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#F8FAFC' }}>
              <tr>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '10%' }}>상태</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '10%' }}>작성자</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', width: '50%' }}>콘텐츠 제목</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '15%' }}>업로드 희망일</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', width: '15%' }}>등록일</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }} className="typo-meta">이 팀의 완성본 대상이 없습니다.</td></tr>
              ) : (
                 items.map(item => {
                    let bgColor = 'transparent';
                    let bdColor = '1px solid #f1f5f9';

                    if (item.isAuthor) {
                      bgColor = '#f0f9ff';
                      bdColor = '1px solid #bfdbfe';
                    } else if (item.isCrew) {
                      bgColor = '#f8fafc';
                      bdColor = '1px solid #e2e8f0';
                    }

                    return (
                  <tr key={item.id} style={{ borderBottom: bdColor, backgroundColor: bgColor, transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                      {!item.isMine ? (
                        <div style={{ display: 'inline-block', width: '80px', textAlign: 'center', color: '#cbd5e1', fontWeight: 600 }}>-</div>
                      ) : item.status === 'uploaded' ? (
                        <span className="badge" style={{ backgroundColor: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>업로드 완료</span>
                      ) : item.status === 'completed' ? (
                        <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>업로드 대기</span>
                      ) : item.status === 'final_submitted' ? (
                        <span className="badge" style={{ backgroundColor: '#059669', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>완성본 검수중</span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#dc2626', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>완성본 수정요청</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.author_name}</td>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 500 }}>
                      <Link href={`/final-works/submit?id=${item.id}`} className="hover-title-link" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600, fontSize: '0.88rem', display: 'block' }}>
                        {item.title}
                      </Link>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#475569', fontWeight: 500, fontSize: '0.82rem' }}>{item.desiredDate}</span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                    );
                 })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="typo-h1" style={{ margin: 0 }}>{currentMonth}월 완성본 목록</h2>
        <Link 
          href="/final-works/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.6rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)', textDecoration: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 완성본 등록
        </Link>
      </div>

      <p className="typo-body" style={{ margin: '0 0 2rem 0' }}>
        기획안 검수가 통과된 항목의 최종 결과물을 등록하고, 이미 등록된 완성본들을 팀별로 확인합니다.
      </p>

      <WorksTable items={youtubeWorks} title="유튜브 팀" color="#ef4444" />
      <WorksTable items={instaWorks} title="인스타 팀" color="#ec4899" />
      <WorksTable items={blogWorks} title="블로그 팀" color="#22c55e" />
      {otherWorks.length > 0 && <WorksTable items={otherWorks} title="단장 팀 / 기타" color="#4f46e5" />}
    </div>
  );
}
