'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Playfair_Display, Lora } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundColor: '#F4EFE6',
        fontFamily: lora.style.fontFamily,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23F4EFE6'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23D9D0C0' opacity='0.4'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="w-full max-w-sm">

        {/* Masthead */}
        <div className="mb-8">
          <div style={{ borderTop: '4px solid #0F1F44', borderBottom: '1px solid #0F1F44', paddingTop: '8px', paddingBottom: '6px' }}>
            <h1
              style={{ fontFamily: playfair.style.fontFamily, color: '#0F1F44', letterSpacing: '-0.5px' }}
              className="text-5xl font-black leading-none"
            >
              PolitiLocal
            </h1>
          </div>
          <div style={{ borderBottom: '3px solid #0F1F44', paddingTop: '5px', paddingBottom: '5px' }} className="flex justify-between items-center">
            <p style={{ fontFamily: lora.style.fontFamily, color: '#0F1F44' }} className="text-xs italic">
              La voix de votre quartier
            </p>
            <p className="text-xs font-mono" style={{ color: '#C8341A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {today}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div style={{ backgroundColor: '#FDFAF4', border: '1px solid #C9C2B4', boxShadow: '3px 3px 0 #C9C2B4' }}>

          {/* Card header */}
          <div style={{ borderBottom: '1px solid #C9C2B4', padding: '20px 28px 16px' }}>
            <h2
              style={{ fontFamily: playfair.style.fontFamily, color: '#0F1F44' }}
              className="text-xl font-bold leading-tight"
            >
              {isSignup ? 'Rejoindre le débat' : 'Reprendre le débat'}
            </h2>
            <p className="text-xs mt-1" style={{ color: '#7A7060', fontStyle: 'italic' }}>
              {isSignup
                ? 'Créez votre compte pour participer'
                : 'Connectez-vous à votre compte citoyen'}
            </p>
          </div>

          {/* Form body */}
          <div style={{ padding: '24px 28px' }}>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: '10px', fontWeight: 700, color: '#0F1F44', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #C9C2B4',
                    backgroundColor: '#F4EFE6',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#0F1F44',
                    outline: 'none',
                    fontFamily: lora.style.fontFamily,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0F1F44' }}
                  onBlur={e => { e.target.style.borderColor = '#C9C2B4' }}
                />
              </div>

              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: '10px', fontWeight: 700, color: '#0F1F44', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #C9C2B4',
                    backgroundColor: '#F4EFE6',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#0F1F44',
                    outline: 'none',
                    fontFamily: lora.style.fontFamily,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0F1F44' }}
                  onBlur={e => { e.target.style.borderColor = '#C9C2B4' }}
                />
              </div>

              {error && (
                <p style={{ color: '#C8341A', fontSize: '13px', borderLeft: '2px solid #C8341A', paddingLeft: '10px' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#5a6a8a' : '#0F1F44',
                  color: '#FDFAF4',
                  padding: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                  fontFamily: lora.style.fontFamily,
                  width: '100%',
                }}
                onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#C8341A' }}
                onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#0F1F44' }}
              >
                {loading ? 'Connexion…' : isSignup ? "Créer mon compte" : 'Se connecter'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div style={{ flex: 1, height: '1px', backgroundColor: '#C9C2B4' }} />
              <span style={{ fontSize: '10px', color: '#9A9080', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#C9C2B4' }} />
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              style={{
                width: '100%',
                border: '1px solid #C9C2B4',
                backgroundColor: 'transparent',
                padding: '11px',
                fontSize: '13px',
                color: '#0F1F44',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontFamily: lora.style.fontFamily,
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = '#0F1F44'
                el.style.backgroundColor = '#F4EFE6'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = '#C9C2B4'
                el.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
              </svg>
              Continuer avec Google
            </button>
          </div>

          {/* Card footer */}
          <div style={{ borderTop: '1px solid #C9C2B4', padding: '14px 28px' }}>
            <button
              onClick={() => { setIsSignup(!isSignup); setError('') }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#7A7060',
                cursor: 'pointer',
                fontFamily: lora.style.fontFamily,
                fontStyle: 'italic',
                padding: 0,
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#C8341A' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#7A7060' }}
            >
              {isSignup ? '← Déjà inscrit ? Se connecter' : 'Pas encore inscrit ? Rejoindre →'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center mt-6" style={{ fontSize: '11px', color: '#9A9080', fontStyle: 'italic' }}>
          En participant, vous rejoignez le débat démocratique local.
        </p>
      </div>
    </div>
  )
}
