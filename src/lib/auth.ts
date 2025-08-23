import { createSupabaseServerClient } from './supabase'
import { UserRole } from './types'

export interface User {
  id: string
  email: string
  name: string
  organizationId: string
  role: UserRole
}

export async function signUp(email: string, password: string, name: string, organizationName: string, role: UserRole = 'owner'): Promise<{ user: User; needsConfirmation: boolean } | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        organization_name: organizationName,
        role: role
      }
    }
  })

  if (error) {
    console.error('Supabase signup error:', error)
    return null
  }

  if (!data.user) {
    return null
  }

  // Get the created profile with organization info
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', data.user.id)
    .single()

  const user: User = {
    id: data.user.id,
    email: data.user.email!,
    name: name,
    organizationId: profile?.organization_id || '',
    role: profile?.role || 'owner'
  }

  // If user needs email confirmation, they won't have a session yet
  const needsConfirmation = !data.session

  return { user, needsConfirmation }
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data.user) {
    return null
  }

  // Get profile data with organization info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organization_id, role')
    .eq('id', data.user.id)
    .single()

  return {
    id: data.user.id,
    email: data.user.email!,
    name: profile?.full_name || data.user.user_metadata?.full_name || '',
    organizationId: profile?.organization_id || '',
    role: profile?.role || 'member'
  }
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get profile data with organization info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organization_id, role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email!,
    name: profile?.full_name || user.user_metadata?.full_name || '',
    organizationId: profile?.organization_id || '',
    role: profile?.role || 'member'
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
}