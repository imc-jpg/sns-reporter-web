import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function FinalWorksListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  let realName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (userEmail) {
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
    if (profile?.author_name) {
      realName = profile.author_name;
    }
  }
  
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
    let desiredDate = "-";
    let emailInJson = '';
    let crewString = '';

    if (item.content_body && item.content_body.startsWith('{')) {
      try {
        const parsed = JSON.parse(item.content_body);
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
  }).filter(item => {
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
      return (
        <svg fill="#ff0000" viewBox="0 0 24 24" width="26" height="26">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    }
    if (title.includes('인스타')) {
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" width="26" height="26">
          <defs>
            <linearGradient id="instaGramFW" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <path fill="url(#instaGramFW)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    }
    if (title.includes('블로그')) {
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: 'translateY(1px)' }}>
            <rect width="24" height="24" rx="4" fill="#03c75a"/>
            <path d="M15.5 15.5V8.5h-3v3.6l-3-3.6H6.5v7h3v-3.6l3 3.6h3z" fill="white"/>
        </svg>
      );
    }
    return null;
  }

  const WorksTable = ({ items, title, color }: { items: any[], title: string, color: string }) => (
    <div style={{ marginBottom: '3rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: color, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '26px', backgroundColor: color, borderRadius: '4px', marginRight: '0.2rem' }}></span>
        {getTeamIcon(title)}
        {title}
      </h3>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead style={{ borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '10%' }}>상태</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '10%' }}>작성자</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', width: '50%' }}>콘텐츠 제목</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '15%' }}>업로드 희망일</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>이 팀의 완성본 대상이 없습니다.</td></tr>
            ) : (
               items.map(item => {
                  let bgColor = 'transparent';
                  let bdColor = '1px solid #f1f5f9';
                  let leftBarColor = null;

                  if (item.isAuthor) {
                    bgColor = '#f0f9ff';
                    bdColor = '1px solid #bfdbfe';
                    leftBarColor = '#3b82f6';
                  } else if (item.isCrew) {
                    bgColor = '#f8fafc';
                    bdColor = '1px solid #e2e8f0';
                    leftBarColor = '#94a3b8';
                  }

                  return (
                <tr key={item.id} style={{ borderBottom: bdColor, backgroundColor: bgColor, transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap', borderLeft: leftBarColor ? `4px solid ${leftBarColor}` : '4px solid transparent' }}>
                    {!item.isMine ? (
                      <div style={{ display: 'inline-block', width: '80px', textAlign: 'center', color: '#cbd5e1', fontWeight: 600 }}>-</div>
                    ) : item.status === 'uploaded' ? (
                      <span className="badge" style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>업로드 완료</span>
                    ) : item.status === 'completed' ? (
                      <span className="badge" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>업로드 대기</span>
                    ) : item.status === 'final_submitted' ? (
                      <span className="badge" style={{ backgroundColor: '#059669', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>완성본 검수중</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#dc2626', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>완성본 수정요청</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.author_name}</td>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>
                    <Link href={`/final-works/submit?id=${item.id}`} className="hover-title-link" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', display: 'block' }}>
                      {item.title}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.95rem' }}>{item.desiredDate}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
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
  );

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{currentMonth}월 완성본 목록</h2>
        <Link 
          href="/final-works/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 완성본 등록
        </Link>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 2rem 0', lineHeight: 1.5 }}>
        기획안 검수가 통과된 항목의 최종 결과물을 등록하고, 이미 등록된 완성본들을 팀별로 확인합니다.
      </p>

      <WorksTable items={youtubeWorks} title="유튜브 팀" color="#ef4444" />
      <WorksTable items={instaWorks} title="인스타 팀" color="#ec4899" />
      <WorksTable items={blogWorks} title="블로그 팀" color="#22c55e" />
      {otherWorks.length > 0 && <WorksTable items={otherWorks} title="단장 팀 / 기타" color="#4f46e5" />}
    </div>
  );
}
