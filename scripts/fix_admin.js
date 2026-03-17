const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Manually parse .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=')
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1')
  }
})

async function setAdmin() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  const email = 'jhaseeb718@gmail.com'

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`Setting admin for ${email}...`)

  // 1. Find user in auth.users
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    console.error('Error fetching users:', userError)
    process.exit(1)
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    console.error(`User ${email} not found`)
    process.exit(1)
  }

  // 2. Update profile
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    process.exit(1)
  }

  console.log('Successfully set role to admin!')
}

setAdmin()
