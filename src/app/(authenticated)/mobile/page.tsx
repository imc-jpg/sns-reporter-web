import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import MobileShell from '@/components/mobile/MobileShell';

export const dynamic = 'force-dynamic';

export default async function MobilePage() {
  const supabase = await createClient();

  const [
    { data: { user } },
    { data: dbContents },
    { data: allProfilesData },
    { data: deadlineRow },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('contents')
      .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment, content_body')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('status', 'draft')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('contents')
      .select('author_name, keywords')
      .eq('content_type', 'SYSTEM_PROFILE'),
    supabaseAdmin
      .from('contents')
      .select('content_body')
      .eq('title', 'SYSTEM_DEADLINES')
      .maybeSingle(),
  ]);

  const rawContents = (dbContents || []) as any[];
  const allProfiles = allProfilesData || [];

  let deadlines: any = {};
  try { if (deadlineRow?.content_body) deadlines = JSON.parse(deadlineRow.content_body); } catch {}

  const contents = rawContents.filter(c => c.content_type !== 'NOTICE');
  const notices = rawContents.filter(c => c.content_type === 'NOTICE');

  return (
    <MobileShell
      contents={contents}
      notices={notices}
      deadlines={deadlines}
      allProfiles={allProfiles}
      user={user}
    />
  );
}
