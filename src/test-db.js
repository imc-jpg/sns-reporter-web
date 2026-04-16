const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing connection to:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('contents').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Connection successful! Item count:', data);
  }
}

test();
