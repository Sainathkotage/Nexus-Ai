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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  'ai_usage',
  'projects',
  'project_members',
  'invitations',
  'login_activities'
];

async function checkTables() {
  console.log("Checking all database tables...");
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}': ERROR - ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`✅ Table '${table}': SUCCESS (${data.length} rows previewed)`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': EXCEPTION - ${err.message}`);
    }
  }
}

checkTables();
