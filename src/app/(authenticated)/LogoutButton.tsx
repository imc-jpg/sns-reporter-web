'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        backgroundColor: '#f3f4f6',
        color: '#4b5563',
        fontWeight: 500,
        fontSize: '0.875rem'
      }}
    >
      로그아웃
    </button>
  );
}
