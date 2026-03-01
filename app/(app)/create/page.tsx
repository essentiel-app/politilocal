'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Playfair_Display, Lora } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] })
const lora = Lora({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'] })

const MAX_CHARS = 120

export default function CreatePage() {
  const [text, setText] = useState('')
  const [type, setType] = useState<'yes_no' | 'multiple'>('yes_no')
  const [options, setOptions] = useState(['', ''])
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const charsLeft = MAX_CHARS - text.length
  const isOverLimit = charsLeft < 0

  function updateOption(index: number, value: string) {
    setOptions(prev => prev.map((o, i) => (i === index ? value : o)))
  }

  function addOption() {
    if (options.length < 4) setOptions(prev => [...prev, ''])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isOverLimit) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const payload = {
      author_id: user.id,
      text: text.trim(),
      type,
      options:
        type === 'multiple'
          ? options.filter(Boolean).map((label, i) => ({ label, value: String(i) }))
          : null,
      location: location.trim(),
    }

    const { error } = await supabase.from('questions').insert(payload)
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid #C9C2B4',
    backgroundColor: '#F4EFE6',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#0F1F44',
    outline: 'none',
    fontFamily: lora.style.fontFamily,
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: '#0F1F44',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '6px',
    fontFamily: lora.style.fontFamily,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4EFE6' }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #C9C2B4', backgroundColor: '#FDFAF4' }}>
        <h1 style={{ fontFamily: playfair.style.fontFamily, fontSize: '22px', fontWeight: 900, color: '#0F1F44' }}>
          Nouvelle question
        </h1>
        <p style={{ fontFamily: lora.style.fontFamily, fontSize: '12px', color: '#9A9080', fontStyle: 'italic', marginTop: '2px' }}>
          Posez une question à votre communauté locale
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Question text */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Votre question</label>
            <span style={{
              fontFamily: lora.style.fontFamily,
              fontSize: '11px',
              color: isOverLimit ? '#C8341A' : charsLeft < 20 ? '#C8341A' : '#9A9080',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {charsLeft}
            </span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Faut-il créer une piste cyclable rue Victor Hugo ?"
            required
            style={{
              ...inputStyle,
              resize: 'none',
              border: isOverLimit ? '1px solid #C8341A' : '1px solid #C9C2B4',
            }}
            onFocus={e => { e.target.style.borderColor = isOverLimit ? '#C8341A' : '#0F1F44' }}
            onBlur={e => { e.target.style.borderColor = isOverLimit ? '#C8341A' : '#C9C2B4' }}
          />
        </div>

        {/* Type selector */}
        <div>
          <label style={labelStyle}>Type de réponse</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['yes_no', 'multiple'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: type === t ? '2px solid #0F1F44' : '1px solid #C9C2B4',
                  backgroundColor: type === t ? '#0F1F44' : 'transparent',
                  color: type === t ? '#FDFAF4' : '#7A7060',
                  fontFamily: lora.style.fontFamily,
                  fontSize: '12px',
                  fontWeight: type === t ? 700 : 400,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'yes_no' ? 'Oui / Non' : 'Choix multiple'}
              </button>
            ))}
          </div>
        </div>

        {/* Multiple choice options */}
        {type === 'multiple' && (
          <div>
            <label style={labelStyle}>Options de réponse</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: playfair.style.fontFamily,
                    fontSize: '12px',
                    color: '#C9C2B4',
                    width: '16px',
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    required={i < 2}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => { e.target.style.borderColor = '#0F1F44' }}
                    onBlur={e => { e.target.style.borderColor = '#C9C2B4' }}
                  />
                </div>
              ))}
              {options.length < 4 && (
                <button
                  type="button"
                  onClick={addOption}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: lora.style.fontFamily,
                    fontSize: '12px',
                    color: '#C8341A',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '4px 0',
                    textDecoration: 'underline',
                  }}
                >
                  + Ajouter une option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <label style={labelStyle}>Lieu concerné</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Paris 11e, Lyon 3e, Bordeaux centre…"
            required
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#0F1F44' }}
            onBlur={e => { e.target.style.borderColor = '#C9C2B4' }}
          />
        </div>

        {error && (
          <p style={{ color: '#C8341A', fontSize: '13px', borderLeft: '2px solid #C8341A', paddingLeft: '10px', fontFamily: lora.style.fontFamily }}>
            {error}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#C9C2B4' }} />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || isOverLimit || !text.trim() || !location.trim()}
          style={{
            backgroundColor: loading || isOverLimit ? '#9A9080' : '#0F1F44',
            color: '#FDFAF4',
            padding: '14px',
            fontFamily: lora.style.fontFamily,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            border: 'none',
            cursor: loading || isOverLimit ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => { if (!loading && !isOverLimit) (e.currentTarget).style.backgroundColor = '#C8341A' }}
          onMouseLeave={e => { if (!loading && !isOverLimit) (e.currentTarget).style.backgroundColor = '#0F1F44' }}
        >
          {loading ? 'Publication…' : 'Publier la question'}
        </button>

      </form>
    </div>
  )
}
