import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Playfair_Display, Lora } from 'next/font/google'
import LogoutButton from '@/components/LogoutButton'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700', '900'] })
const lora = Lora({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'] })

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: myQuestions }, { data: myVotes }] = await Promise.all([
    supabase
      .from('questions')
      .select('id, text, location, type, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('votes')
      .select('answer, created_at, questions(id, text, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const username = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Citoyen'

  const cardStyle = {
    backgroundColor: '#FDFAF4',
    border: '1px solid #C9C2B4',
    padding: '14px 16px',
    marginBottom: '8px',
  }

  const answerLabel = (answer: string) => {
    if (answer === 'yes') return 'Oui'
    if (answer === 'no') return 'Non'
    return answer
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4EFE6' }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #C9C2B4', backgroundColor: '#FDFAF4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: playfair.style.fontFamily, fontSize: '22px', fontWeight: 900, color: '#0F1F44' }}>
              {username}
            </h1>
            <p style={{ fontFamily: lora.style.fontFamily, fontSize: '12px', color: '#9A9080', fontStyle: 'italic', marginTop: '2px' }}>
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #C9C2B4' }}>
          {[
            { label: 'Questions posées', value: myQuestions?.length ?? 0 },
            { label: 'Questions répondues', value: myVotes?.length ?? 0 },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: playfair.style.fontFamily, fontSize: '24px', fontWeight: 900, color: '#0F1F44' }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: lora.style.fontFamily, fontSize: '10px', color: '#9A9080', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* My questions */}
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontFamily: lora.style.fontFamily,
            fontSize: '10px',
            fontWeight: 700,
            color: '#9A9080',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #C9C2B4',
          }}>
            Mes questions
          </h2>

          {(!myQuestions || myQuestions.length === 0) ? (
            <p style={{ fontFamily: lora.style.fontFamily, fontSize: '13px', color: '#9A9080', fontStyle: 'italic' }}>
              Vous n'avez pas encore posé de question.
            </p>
          ) : (
            myQuestions.map(q => (
              <div key={q.id} style={{ ...cardStyle, borderLeft: '3px solid #0F1F44' }}>
                <p style={{ fontFamily: playfair.style.fontFamily, fontSize: '14px', fontWeight: 700, color: '#0F1F44', lineHeight: 1.4 }}>
                  {q.text}
                </p>
                <p style={{ fontFamily: lora.style.fontFamily, fontSize: '11px', color: '#C8341A', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📍 {q.location}
                </p>
              </div>
            ))
          )}
        </section>

        {/* My answers */}
        <section>
          <h2 style={{
            fontFamily: lora.style.fontFamily,
            fontSize: '10px',
            fontWeight: 700,
            color: '#9A9080',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #C9C2B4',
          }}>
            Mes réponses
          </h2>

          {(!myVotes || myVotes.length === 0) ? (
            <p style={{ fontFamily: lora.style.fontFamily, fontSize: '13px', color: '#9A9080', fontStyle: 'italic' }}>
              Vous n'avez pas encore répondu à des questions.
            </p>
          ) : (
            myVotes.map((v, idx) => {
              const q = v.questions as { text: string; location: string } | null
              return (
                <div key={idx} style={{ ...cardStyle, borderLeft: '3px solid #C9C2B4' }}>
                  <p style={{ fontFamily: playfair.style.fontFamily, fontSize: '14px', fontWeight: 700, color: '#0F1F44', lineHeight: 1.4 }}>
                    {q?.text}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <p style={{ fontFamily: lora.style.fontFamily, fontSize: '11px', color: '#C8341A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      📍 {q?.location}
                    </p>
                    <span style={{
                      fontFamily: lora.style.fontFamily,
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#FDFAF4',
                      backgroundColor: v.answer === 'yes' ? '#0F1F44' : '#C9C2B4',
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      {answerLabel(v.answer)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
