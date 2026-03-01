'use client'

import { motion } from 'framer-motion'
import { Playfair_Display, Lora } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] })
const lora = Lora({ subsets: ['latin'], weight: ['400', '500'] })

export type Question = {
  id: string
  text: string
  type: 'yes_no' | 'multiple'
  options: { label: string; value: string }[] | null
  location: string
  author_id: string
  created_at: string
}

type Props = {
  question: Question
  onVote: (answer: string) => void
}

export default function QuestionCard({ question, onVote }: Props) {
  const options =
    question.type === 'yes_no'
      ? [
          { label: 'Oui', value: 'yes' },
          { label: 'Non', value: 'no' },
        ]
      : question.options ?? []

  const isYesNo = question.type === 'yes_no'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -80, rotate: -3 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        backgroundColor: '#FDFAF4',
        border: '1px solid #C9C2B4',
        boxShadow: '4px 4px 0 #C9C2B4',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '440px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top rule — editorial accent */}
      <div style={{ height: '4px', backgroundColor: '#0F1F44', flexShrink: 0 }} />

      {/* Location tag */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#C8341A',
            fontFamily: lora.style.fontFamily,
          }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5C4.2 5.5 3.5 4.8 3.5 4S4.2 2.5 5 2.5 6.5 3.2 6.5 4 5.8 5.5 5 5.5z"/>
          </svg>
          {question.location}
        </span>
      </div>

      {/* Question text */}
      <div style={{ padding: '12px 24px 0', flex: 1 }}>
        {/* Decorative quote mark */}
        <div
          style={{
            fontFamily: playfair.style.fontFamily,
            fontSize: '72px',
            lineHeight: 0.7,
            color: '#E8E0D0',
            marginBottom: '4px',
            userSelect: 'none',
          }}
        >
          "
        </div>
        <h2
          style={{
            fontFamily: playfair.style.fontFamily,
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F1F44',
            lineHeight: 1.35,
          }}
        >
          {question.text}
        </h2>

        {/* Date */}
        <p
          style={{
            fontFamily: lora.style.fontFamily,
            fontSize: '11px',
            color: '#9A9080',
            fontStyle: 'italic',
            marginTop: '12px',
          }}
        >
          {new Date(question.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#C9C2B4', margin: '16px 24px 0' }} />

      {/* Vote buttons */}
      <div
        style={{
          padding: '16px 24px 24px',
          display: 'flex',
          flexDirection: isYesNo ? 'row' : 'column',
          gap: '10px',
        }}
      >
        {options.map((opt, i) => {
          const isOui = opt.value === 'yes'
          const isNon = opt.value === 'no'
          return (
            <button
              key={opt.value}
              onClick={() => onVote(opt.value)}
              style={{
                flex: isYesNo ? 1 : undefined,
                padding: isYesNo ? '14px 8px' : '12px 20px',
                border: isOui
                  ? '2px solid #0F1F44'
                  : isNon
                  ? '2px solid #C9C2B4'
                  : '2px solid #C9C2B4',
                backgroundColor: isOui ? '#0F1F44' : 'transparent',
                color: isOui ? '#FDFAF4' : '#0F1F44',
                fontFamily: playfair.style.fontFamily,
                fontSize: isYesNo ? '16px' : '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left' as const,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (isOui) {
                  el.style.backgroundColor = '#C8341A'
                  el.style.borderColor = '#C8341A'
                } else {
                  el.style.backgroundColor = '#F4EFE6'
                  el.style.borderColor = '#0F1F44'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (isOui) {
                  el.style.backgroundColor = '#0F1F44'
                  el.style.borderColor = '#0F1F44'
                } else {
                  el.style.backgroundColor = 'transparent'
                  el.style.borderColor = isNon ? '#C9C2B4' : '#C9C2B4'
                }
              }}
            >
              {i + 1 > 0 && !isYesNo && (
                <span style={{ opacity: 0.4, marginRight: '8px', fontSize: '11px' }}>
                  {String.fromCharCode(64 + i + 1)}.
                </span>
              )}
              {opt.label}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
