import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Deadlines are stored as a special system record in the contents table
// title: 'SYSTEM_DEADLINES', content_body: JSON { proposalDeadline, finalDeadline, proposalDDayLabel, finalDDayLabel }

const SYSTEM_TITLE = 'SYSTEM_DEADLINES';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contents')
    .select('content_body')
    .eq('title', SYSTEM_TITLE)
    .single();

  if (!data?.content_body) {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null, label: null, finalLabel: null });
  }
  try {
    return NextResponse.json(JSON.parse(data.content_body));
  } catch {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const contentBody = JSON.stringify(body);

  const { data: existing } = await supabase
    .from('contents')
    .select('id')
    .eq('title', SYSTEM_TITLE)
    .single();

  if (existing) {
    await supabase.from('contents').update({ content_body: contentBody }).eq('title', SYSTEM_TITLE);
  } else {
    await supabase.from('contents').insert({ title: SYSTEM_TITLE, content_type: 'SYSTEM_DEADLINES', content_body: contentBody, status: 'active' });
  }

  return NextResponse.json({ ok: true });
}
