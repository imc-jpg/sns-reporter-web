import { createClient } from '@/utils/supabase/server';
import NoticesClient from './NoticesClient';
import { Suspense } from 'react';

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;

  // Fetch notices from contents table
  // [P-G] .range() 추가
  const { data: notices } = await supabase
    .from('contents')
    .select('*')
    .eq('content_type', 'NOTICE')
    .order('created_at', { ascending: false })
    .range(0, 49);

  return (
    <Suspense fallback={<div>Loading notices...</div>}>
      <NoticesClient notices={notices || []} isAdmin={isAdmin} />
    </Suspense>
  );
}
