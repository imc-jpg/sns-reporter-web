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
  
  let realName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (userEmail) {
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
    if (profile?.author_name) {
      realName = profile.author_name;
    }
  }
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
    let crewString = '';
    try {
      if (item.content_body && item.content_body.startsWith('{')) {
        const obj = JSON.parse(item.content_body);
        emailInJson = obj.authorEmail || '';
        if (typeof obj.crew === 'string') {
          crewString = obj.crew;
        } else if (Array.isArray(obj.crew)) {
          crewString = obj.crew.map((c: any) => c.name || '').join(',');
        }
      }
    } catch(e) {}
    
    const isAuthor = user && (emailInJson === userEmail || 
                           item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = isAuthor || isCrew;
    return { ...item, isMine, isAuthor, isCrew };
  });

  let monthContents = processedContents.filter(item => {
    const itemDate = new Date(new Date(item.created_at).toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
            <linearGradient id="insta" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <path fill="url(#insta)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
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

  const ProposalTable = ({ items, title, color }: { items: any[], title: string, color: string }) => (
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
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '10%' }}>소속 팀</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '10%' }}>콘텐츠 종류</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '15%' }}>작성자</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', width: '100%' }}>제목</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '15%' }}>취재일/발행일</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', width: '15%' }}>등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>등록된 기획안이 없습니다.</td></tr>
            )}
            {items.map(item => {
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
                    {item.isMine ? <StatusBadge status={item.status} /> : <div style={{ display: 'inline-block', width: '80px', textAlign: 'center', color: '#cbd5e1', fontWeight: 600 }}>-</div>}
                </td>
                <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                  {item.team ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '6px 10px', borderRadius: '6px', backgroundColor: getTeamColor(item.team).bg, color: getTeamColor(item.team).text, display: 'inline-block' }}>
                      {item.team}
                    </span>
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                  {item.content_type ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '6px 10px', borderRadius: '6px', backgroundColor: getTypeColor(item.content_type).bg, color: getTypeColor(item.content_type).text, display: 'inline-block' }}>
                      {item.content_type}
                    </span>
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td style={{ padding: '1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.author_name}</td>
                <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>
                  <Link href={`/proposals/submit?id=${item.id}`} className="hover-title-link" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', display: 'block' }}>
                    {item.title}
                  </Link>
                </td>
                <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {item.target_date && <div style={{ marginBottom: '0.2rem' }}>취재: {item.target_date}</div>}
                  {item.deadline && <div>발행: {item.deadline}</div>}
                  {(!item.target_date && !item.deadline) && '-'}
                </td>
                <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{currentMonth}월 기획안 목록</h2>
        <Link 
          href="/proposals/submit" 
          style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          새 기획안 작성
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
          학생 기자단원들이 등록한 기획안 리스트입니다. 자신의 기획안 제목을 클릭하여 수정할 수 있습니다.
        </p>
        
        {user && (
          <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: '#f1f5f9', padding: '0.3rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <Link 
              href="/proposals" 
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: !filterByMine ? '#ffffff' : 'transparent', color: !filterByMine ? '#0f172a' : '#64748b', textDecoration: 'none', boxShadow: !filterByMine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              전체 기획안
            </Link>
            <Link 
              href="/proposals?filter=mine" 
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: filterByMine ? '#ffffff' : 'transparent', color: filterByMine ? '#0f172a' : '#64748b', textDecoration: 'none', boxShadow: filterByMine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
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
