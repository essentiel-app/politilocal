'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      style={{
        background: 'none',
        border: '1px solid #C9C2B4',
        padding: '6px 12px',
        fontSize: '11px',
        color: '#7A7060',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#C8341A'
        e.currentTarget.style.color = '#C8341A'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#C9C2B4'
        e.currentTarget.style.color = '#7A7060'
      }}
    >
      Déconnexion
    </button>
  )
}
