const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: members, error: mErr } = await supabase.from('workspace_members').select('*');
  if (mErr) {
    console.error('Error fetching members:', mErr);
    return;
  }
  console.log('--- Workspace Members ---');
  members.forEach(m => {
    console.log(`Workspace ID: ${m.workspace_id}, User ID: ${m.user_id}, Role: ${m.role}, Status: ${m.status}`);
  });
}
run();
