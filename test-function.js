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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const rajId = '69b3ace5-ff85-46ad-85d1-c60f224254b5'; // Raj #4444
  const snehalId = 'ab26f3a3-d1f5-433f-9240-4ce0cd0a3afa'; // Snehal #1010

  const { data, error } = await supabase.rpc('users_share_workspace', {
    first_user_id: rajId,
    second_user_id: snehalId
  });

  if (error) {
    console.error('Error executing function:', error);
  } else {
    console.log('Result of users_share_workspace:', data);
  }
}

run();
