const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zidnakewwktghimawede.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZG5ha2V3d2t0Z2hpbWF3ZWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQyMTMwOCwiZXhwIjoyMDkwOTk3MzA4fQ.5xCt8mlBLb-oObakQDP7eD4xqdB8zC7Q07b6PK0_-9o');
async function test() {
  const { data, error } = await supabase.from('contents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
test();
