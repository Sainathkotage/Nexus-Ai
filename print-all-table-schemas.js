const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    envVars[key] = val;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const tables = [
  'documents',
  'tasks',
  'calendar_events',
  'emails',
  'conversations',
  'messages',
  'ai_insights',
  'channels',
  'channel_messages',
  'message_reactions',
  'message_reads',
  'profiles',
  'workspace_members',
  'direct_messages',
  'workspaces',
  'workspace_invites',
  'feedback',
  'ai_usage'
];

async function run() {
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`${table}: ERROR - ${error.message}`);
      } else {
        console.log(`${table}: Columns = [${data[0] ? Object.keys(data[0]).join(', ') : 'no data'}]`);
      }
    } catch (err) {
      console.log(`${table}: EXCEPTION - ${err.message}`);
    }
  }
}
run();
