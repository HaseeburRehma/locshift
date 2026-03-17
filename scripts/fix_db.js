const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manual .env parse
const envContent = fs.readFileSync('.env', 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) processEnv[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = processEnv.SUPABASE_SERVICE_ROLE_KEY || processEnv.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFixes() {
  console.log('Running database fixes...');
  
  // 1. Add budget column to leads
  // We use the REST API to RPC if possible, but simpler is to just use the query logic via SQL editor if we have the right key.
  // Since we might only have anon key, we can't run arbitrary SQL unless there's an RPC.
  // Wait, I can try to use the 'pg' library if I have it.
  
  console.log('UPDATING ROLES...');
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('email', 'jhaseeb718@gmail.com');
  
  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log('Role updated successfully for jhaseeb718@gmail.com');
  }

  // Check if budget exists by trying to select it
  const { error: selectError } = await supabase
    .from('leads')
    .select('budget')
    .limit(1);
    
  if (selectError && selectError.message.includes('column "budget" does not exist')) {
    console.log('Budget column is missing. You need to add it via Supabase Dashboard SQL Editor:');
    console.log('ALTER TABLE leads ADD COLUMN budget text;');
  } else {
    console.log('Budget column exists or other error:', selectError?.message);
  }
}

runFixes();
