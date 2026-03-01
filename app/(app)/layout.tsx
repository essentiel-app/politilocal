import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div style={{ paddingBottom: '64px', minHeight: '100vh', backgroundColor: '#F4EFE6' }}>
      {children}
      <BottomNav />
    </div>
  )
}
