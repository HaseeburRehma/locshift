import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // 1. Get current logged in user from Auth
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
  // 2. Try fetching their specific profile
  let myProfile = null;
  let myProfileError = null;
  if (user) {
    const res = await supabase.from('profiles').select('*').eq('id', user.id).single()
    myProfile = res.data;
    myProfileError = res.error;
  }

  // 3. Try fetching ALL profiles to see if the admin one exists but under a different UUID
  const { data: allProfiles, error: allProfilesError } = await supabase.from('profiles').select('*')

  return NextResponse.json({
    debug_info: "Supabase DB State",
    current_auth_user: user,
    auth_error: authError,
    my_profile_fetch: myProfile,
    my_profile_error: myProfileError,
    all_profiles_fetch: allProfiles,
    all_profiles_error: allProfilesError,
    action_required: "Please copy this entire JSON output and paste it back to the AI."
  })
}
