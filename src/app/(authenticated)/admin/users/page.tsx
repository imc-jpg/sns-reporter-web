import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import AdminRoleButton from "@/components/AdminRoleButton";
import AdminVisibilityButton from "@/components/AdminVisibilityButton";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // [B13] 인증 및 관리자 권한 이중 검증 (middleware 통과 후에도 서버 컴포넌트에서 재확인)
  const isAdmin =
    user?.user_metadata?.is_admin === true ||
    user?.email === 'admin@admin.com';
  if (!user || !isAdmin) {
    return <div style={{ padding: '2rem', color: '#ef4444', fontWeight: 600 }}>접근 권한이 없습니다.</div>;
  }

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return <div>유저 정보를 불러오는 데 실패했습니다: {error.message}</div>;
  }

  const getProviderName = (user: any) => {
    const providers = user.app_metadata?.providers || [];
    if (providers.includes('google')) return 'Google';
    return '이메일 가입';
  };

  const { data: dbProfiles } = await supabase.from('contents').select('description, author_name, team').eq('content_type', 'SYSTEM_PROFILE');
  const profileMap = new Map();
  (dbProfiles || []).forEach(p => {
    if (p.description) profileMap.set(p.description, { name: p.author_name, team: p.team });
  });

  return (
    <div className="flex flex-col gap-4 animate-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>가입된 전체 기자단 명단 (관리자)</h2>
      </div>

      <p style={{ color: '#64748B', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
        구글 계정 연동 및 이메일로 가입한 모든 회원의 정보입니다.
      </p>

      <div className="card motion-card animate-enter stagger-1" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', backgroundColor: 'rgba(248, 250, 252, 0.7)', backdropFilter: 'blur(10px)' }}>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '12%' }}>가입 방식</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '28%' }}>이메일</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '18%' }}>이름</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '12%' }}>소속 팀</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '15%' }}>최초 가입일</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '15%' }}>크루원 목록 노출</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748B', width: '15%' }}>권한 관리</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => {
              const dbP = profileMap.get(u.email);
              const name = dbP?.name || u.user_metadata?.full_name || u.user_metadata?.name || '-';
              const team = dbP?.team || u.user_metadata?.team || '-';
              const provider = getProviderName(u);
              
              return (
                <tr key={u.id} className="motion-row" style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.6)', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: provider === 'Google' ? 'rgba(224, 231, 255, 0.8)' : 'rgba(241, 245, 249, 0.8)', color: provider === 'Google' ? '#4338CA' : '#475569', display: 'inline-block', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                      {provider}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0F172A' }}>{u.email}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#334155' }}>{name}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontWeight: 700, color: team !== '-' ? '#002454' : '#94A3B8' }}>{team}</span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 500 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <AdminVisibilityButton 
                      userId={u.id}
                      isHidden={u.user_metadata?.is_hidden_in_crew === true}
                    />
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <AdminRoleButton 
                      userId={u.id} 
                      isCurrentlyAdmin={u.user_metadata?.is_admin === true}
                      isMaster={u.email === 'admin@admin.com'}
                    />
                  </td>
                </tr>
              );
            })}
            
            {users?.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  가입된 유저가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
