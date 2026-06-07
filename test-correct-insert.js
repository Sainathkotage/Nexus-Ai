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
  const rajId = '69b3ace5-ff85-46ad-85d1-c60f224254b5'; // Raj #4444
  const snehalId = 'ab26f3a3-d1f5-433f-9240-4ce0cd0a3afa'; // Snehal #1010

  console.log(`Testing insert from Raj (${rajId}) to Snehal (${snehalId})...`);
  const { data: inserted, error: iErr } = await supabase.from('direct_messages').insert({
    id: `test-msg-${Date.now()}`,
    sender_id: rajId,
    receiver_id: snehalId,
    content: 'test content'
  }).select();

  if (iErr) {
    console.error('Insert failed:', iErr.message, iErr);
  } else {
    console.log('Insert success!:', inserted);
  }
}

run();
