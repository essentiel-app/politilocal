'use client'

import { useEffect, useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import QuestionCard, { type Question } from '@/components/QuestionCard'
import { Playfair_Display, Lora } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] })
const lora = Lora({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'] })

export default function DiscoverPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const supabase = createClient()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    loadQuestions()
  }, [])

  async function loadQuestions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: votedRows } = await supabase
      .from('votes')
      .select('question_id')
      .eq('user_id', user.id)

    const excludeIds = votedRows?.map(v => v.question_id) ?? []

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data } = await query
    setQuestions(data ?? [])
    setLoading(false)
  }

  async function handleVote(answer: string) {
    if (voting || questions.length === 0) return
    setVoting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setVoting(false); return }

    const question = questions[0]
    await supabase.from('votes').insert({
      user_id: user.id,
      question_id: question.id,
      answer,
    })

    setQuestions(prev => prev.slice(1))
    setVoting(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F4EFE6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: playfair.style.fontFamily, fontSize: '14px', color: '#9A9080', fontStyle: 'italic' }}>
            Chargement des questions…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4EFE6', padding: '0' }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #C9C2B4', backgroundColor: '#FDFAF4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontFamily: playfair.style.fontFamily, fontSize: '22px', fontWeight: 900, color: '#0F1F44' }}>
            Questions du moment
          </h1>
          {questions.length > 0 && (
            <span style={{ fontFamily: lora.style.fontFamily, fontSize: '11px', color: '#9A9080', fontStyle: 'italic' }}>
              {questions.length} restante{questions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Card area */}
      <div style={{ padding: '20px' }}>
        {questions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '12px' }}>
            <div style={{ fontFamily: playfair.style.fontFamily, fontSize: '48px', color: '#C9C2B4' }}>✓</div>
            <h2 style={{ fontFamily: playfair.style.fontFamily, fontSize: '20px', fontWeight: 700, color: '#0F1F44' }}>
              Tout vu !
            </h2>
            <p style={{ fontFamily: lora.style.fontFamily, fontSize: '14px', color: '#9A9080', fontStyle: 'italic', maxWidth: '240px' }}>
              Vous avez répondu à toutes les questions disponibles. Revenez demain ou créez-en une nouvelle.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <QuestionCard
              key={questions[0].id}
              question={questions[0]}
              onVote={handleVote}
            />
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
