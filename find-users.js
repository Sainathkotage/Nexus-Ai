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
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.error('Error fetching profiles:', pErr);
    return;
  }
  
  console.log('--- Profiles ---');
  profiles.forEach(p => console.log(`ID: ${p.id}, Username: ${p.username}, Tag: ${p.tag}`));

  const raj = profiles.find(p => p.username === 'Raj');
  const snehal = profiles.find(p => p.username === 'Snehal');

  if (!raj || !snehal) {
    console.log('Raj or Snehal not found!');
    return;
  }

  console.log(`\nTesting insert from Raj (${raj.id}) to Snehal (${snehal.id})...`);
  const { data: inserted, error: iErr } = await supabase.from('direct_messages').insert({
    id: `test-msg-${Date.now()}`,
    sender_id: raj.id,
    receiver_id: snehal.id,
    content: 'test content'
  }).select();

  if (iErr) {
    console.error('Insert failed:', iErr.message, iErr);
  } else {
    console.log('Insert success!:', inserted);
  }
}

run();
