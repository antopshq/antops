import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase'

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (user) {
    // User is authenticated, redirect to dashboard
    redirect('/dashboard')
  } else {
    // User is not authenticated, redirect to sign in
    redirect('/auth/signin')
  }
}
