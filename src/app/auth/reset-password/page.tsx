import { createSupabaseServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ResetPasswordForm from '@/components/auth/reset-password-form'

export default async function ResetPassword() {
  // Check authentication server-side
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/auth-error')
  }

  return <ResetPasswordForm />
}