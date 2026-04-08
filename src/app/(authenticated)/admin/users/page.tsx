import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 간단한 접근 제어 (실제 운영 시에는 별도의 관리자 식별을 추가할 수 있습니다)
  // if (!user) return <div>접근 권한이 없습니다.</div>;

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
    <div className="flex-col gap-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>가입된 전체 기자단 명단 (관리자)</h2>
      </div>

      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        구글 계정 연동 및 이메일로 가입한 모든 회원의 정보입니다.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>가입 방식</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '30%' }}>이메일</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '20%' }}>이름 (설정된 경우)</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '15%' }}>소속 팀</th>
              <th style={{ padding: '1rem', fontWeight: 500, width: '20%' }}>최초 가입일</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => {
              const dbP = profileMap.get(u.email);
              const name = dbP?.name || u.user_metadata?.full_name || u.user_metadata?.name || '-';
              const team = dbP?.team || u.user_metadata?.team || '-';
              const provider = getProviderName(u);
              
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: provider === 'Google' ? '#e0e7ff' : '#f3f4f6', color: provider === 'Google' ? '#4f46e5' : '#4b5563', display: 'inline-block' }}>
                      {provider}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>{name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 600, color: team !== '-' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{team}</span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
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
