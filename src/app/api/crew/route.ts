import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { cleanAuthorName } from '@/utils/dateUtils';

/**
 * [B9] /api/crew 인증 게이트 추가
 * 기존: 인증 체크 전혀 없이 supabaseAdmin으로 전체 사용자 PII 반환
 * 수정: 로그인한 사용자만 접근 가능
 * (전체 crew 목록은 로그인한 기자단원이라면 누구나 볼 수 있는 정보이므로
 *  admin 체크는 불필요하고, 인증 여부만 확인한다)
 */
export async function GET() {
  // [B9] 인증 검증
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch dbProfiles to get the actual names set in profile
  const { data: dbProfiles } = await supabaseAdmin.from('contents').select('description, author_name, team').eq('content_type', 'SYSTEM_PROFILE');
  const profileMap = new Map();
  (dbProfiles || []).forEach(p => {
    if (p.description) profileMap.set(p.description, { name: p.author_name, team: p.team });
  });

  const crewList = (users || [])
    .filter(u => u.user_metadata?.is_hidden_in_crew !== true)
    .map(u => {
      const dbP = profileMap.get(u.email);
      const rawName = dbP?.name || u.user_metadata?.full_name || u.user_metadata?.name || u.email;
      const name = cleanAuthorName(rawName);
      const team = dbP?.team || u.user_metadata?.team || '팀 미지정';
      return {
        id: u.id,
        email: u.email,
        name: name,
        team: team
      };
    })
    // Sort by name alphabetically
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(crewList);
}
