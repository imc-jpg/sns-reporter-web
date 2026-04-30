import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const SYSTEM_TITLE = 'SYSTEM_DEADLINES';

export async function GET() {
  // Use admin client to bypass RLS for system records
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('content_body')
    .eq('title', SYSTEM_TITLE)
    .single();

  if (error || !data?.content_body) {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null, proposalLabel: null, finalLabel: null });
  }
  try {
    return NextResponse.json(JSON.parse(data.content_body));
  } catch {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null, proposalLabel: null, finalLabel: null });
  }
}

export async function POST(req: NextRequest) {
  // Verify the user is authenticated via the regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const contentBody = JSON.stringify(body);

  // Use admin client to bypass RLS for writing system records
  const { data: existing } = await supabaseAdmin
    .from('contents')
    .select('id')
    .eq('title', SYSTEM_TITLE)
    .maybeSingle();

  let dbError = null;

  if (existing) {
    const { error } = await supabaseAdmin
      .from('contents')
      .update({ content_body: contentBody })
      .eq('title', SYSTEM_TITLE);
    dbError = error;
  } else {
    const { error } = await supabaseAdmin
      .from('contents')
      .insert({
        title: SYSTEM_TITLE,
        content_type: 'SYSTEM_DEADLINES',
        content_body: contentBody,
        status: 'active',
        author_name: 'SYSTEM',
      });
    dbError = error;
  }

  if (dbError) {
    console.error('[Deadlines API] DB error:', dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Invalidate dashboard cache so changes appear immediately
  revalidatePath('/dashboard');

  return NextResponse.json({ ok: true });
}
