# PolitiLocal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first Next.js app where users swipe through local politics questions, vote, create questions, and view their history via a profile.

**Architecture:** Next.js 15 App Router with Supabase for auth + DB. All data access goes through the Supabase JS client directly from server/client components — no custom API layer. RLS policies enforce security at the database level.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Supabase JS v2, Vercel

---

## Prerequisites (do these manually before starting)

1. Create a Supabase project at https://supabase.com → note `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Enable Google OAuth in Supabase Dashboard → Authentication → Providers → Google (needs Google Cloud Console credentials)
3. Have Node.js 20+ and `git` installed

---

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `politilocal/` (project root)

**Step 1: Scaffold the project**

```bash
npx create-next-app@latest politilocal \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd politilocal
```

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 3: Create environment file**

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Step 4: Add `.env.local` to `.gitignore`** (it's already there by default — verify)

**Step 5: Verify project runs**

```bash
npm run dev
```
Expected: App visible at http://localhost:3000

**Step 6: Init git and commit**

```bash
git init
git add .
git commit -m "feat: bootstrap Next.js project with Supabase deps"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Step 1: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

**Step 2: Create setup file**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

**Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Run tests to verify setup**

```bash
npm test
```
Expected: "No test files found" (no error)

**Step 5: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json
git commit -m "chore: configure vitest"
```

---

### Task 3: Supabase client setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Step 1: Create browser client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 3: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client helpers"
```

---

### Task 4: Database schema + RLS

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Users profile (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Questions
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.users(id) on delete cascade not null,
  text text not null check (char_length(text) <= 120),
  type text not null check (type in ('yes_no', 'multiple')),
  options jsonb,
  location text not null,
  created_at timestamptz default now()
);

-- Votes
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  answer text not null,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

-- RLS
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;

-- Users: anyone can read, only own row editable
create policy "users_read" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- Questions: anyone can read, auth users can insert, only author can delete
create policy "questions_read" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (auth.uid() = author_id);
create policy "questions_delete" on public.questions for delete using (auth.uid() = author_id);

-- Votes: users see only their own votes, auth users can insert
create policy "votes_read" on public.votes for select using (auth.uid() = user_id);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Step 2: Apply migration**

In Supabase Dashboard → SQL Editor → paste the full SQL above → Run.
Expected: "Success. No rows returned"

**Step 3: Verify tables exist**

In Supabase Dashboard → Table Editor → check `users`, `questions`, `votes` tables exist.

**Step 4: Commit the migration file**

```bash
git add supabase/
git commit -m "feat: add initial database schema and RLS policies"
```

---

### Task 5: Auth middleware + layout

**Files:**
- Create: `middleware.ts`
- Modify: `app/layout.tsx`

**Step 1: Create middleware for session refresh**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 2: Update root layout with mobile-first meta**

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PolitiLocal',
  description: 'Les questions de politique locale près de chez vous',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${geist.className} bg-gray-50 max-w-md mx-auto min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add middleware.ts app/layout.tsx
git commit -m "feat: add auth middleware and root layout"
```

---

### Task 6: Auth pages (login + signup)

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Create: `app/auth/callback/route.ts`

**Step 1: Create login page**

```typescript
// app/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-2">PolitiLocal</h1>
      <p className="text-gray-500 mb-8 text-center">La politique locale, carte par carte.</p>

      <form onSubmit={handleEmailAuth} className="w-full space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium disabled:opacity-50"
        >
          {loading ? '...' : isSignup ? "S'inscrire" : 'Se connecter'}
        </button>
      </form>

      <button
        onClick={() => setIsSignup(!isSignup)}
        className="mt-3 text-sm text-gray-500 underline"
      >
        {isSignup ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
      </button>

      <div className="my-4 flex items-center w-full gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={handleGoogle}
        className="w-full border rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"
      >
        Continuer avec Google
      </button>
    </div>
  )
}
```

**Step 2: Create OAuth callback route**

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

**Step 3: Test login manually**

```bash
npm run dev
```
- Open http://localhost:3000/login
- Create an account with email/password
- Verify redirect to `/` happens
- Check Supabase Dashboard → Authentication → Users: user should appear
- Check Table Editor → users: profile row should exist (trigger fired)

**Step 4: Commit**

```bash
git add app/login/ app/auth/
git commit -m "feat: add email + Google auth pages"
```

---

### Task 7: Main layout with bottom navigation

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `components/BottomNav.tsx`

**Step 1: Write test for BottomNav**

```typescript
// components/BottomNav.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BottomNav from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('BottomNav', () => {
  it('renders three navigation items', () => {
    render(<BottomNav />)
    expect(screen.getByText('Découvrir')).toBeInTheDocument()
    expect(screen.getByText('Créer')).toBeInTheDocument()
    expect(screen.getByText('Profil')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module './BottomNav'"

**Step 3: Implement BottomNav**

```typescript
// components/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Découvrir', icon: '🗳️' },
  { href: '/create', label: 'Créer', icon: '✏️' },
  { href: '/profile', label: 'Profil', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors
            ${pathname === tab.href ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS

**Step 5: Create app layout with auth guard**

```typescript
// app/(app)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="pb-16">
      {children}
      <BottomNav />
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add components/ app/\(app\)/
git commit -m "feat: add bottom navigation and protected layout"
```

---

### Task 8: Discover screen — card component

**Files:**
- Create: `components/QuestionCard.tsx`
- Create: `components/QuestionCard.test.tsx`

**Step 1: Write test**

```typescript
// components/QuestionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import QuestionCard from './QuestionCard'

const mockQuestion = {
  id: '1',
  text: 'Faut-il piétonniser la rue de la Roquette ?',
  type: 'yes_no' as const,
  options: null,
  location: 'Paris 11e',
  author_id: 'user-1',
  created_at: new Date().toISOString(),
}

describe('QuestionCard', () => {
  it('displays the question text and location', () => {
    render(<QuestionCard question={mockQuestion} onVote={vi.fn()} />)
    expect(screen.getByText(/piétonniser/i)).toBeInTheDocument()
    expect(screen.getByText('Paris 11e')).toBeInTheDocument()
  })

  it('calls onVote with answer when button clicked', () => {
    const onVote = vi.fn()
    render(<QuestionCard question={mockQuestion} onVote={onVote} />)
    fireEvent.click(screen.getByText('Oui'))
    expect(onVote).toHaveBeenCalledWith('yes')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL

**Step 3: Implement QuestionCard**

```typescript
// components/QuestionCard.tsx
'use client'
import { motion } from 'framer-motion'

type Question = {
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
  const options = question.type === 'yes_no'
    ? [{ label: 'Oui', value: 'yes' }, { label: 'Non', value: 'no' }]
    : question.options ?? []

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-6 min-h-[420px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div>
        <span className="text-xs text-gray-400 font-medium">📍 {question.location}</span>
        <h2 className="text-xl font-bold mt-2 leading-snug">{question.text}</h2>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onVote(opt.value)}
            className="w-full py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-700
              hover:border-blue-500 hover:text-blue-600 transition-colors active:scale-95"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export type { Question }
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS

**Step 5: Commit**

```bash
git add components/QuestionCard.tsx components/QuestionCard.test.tsx
git commit -m "feat: add QuestionCard component with vote buttons"
```

---

### Task 9: Discover screen — feed page

**Files:**
- Create: `app/(app)/page.tsx`

**Step 1: Implement the Discover page**

```typescript
// app/(app)/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import QuestionCard, { type Question } from '@/components/QuestionCard'

export default function DiscoverPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get questions user hasn't voted on yet
    const { data: votedIds } = await supabase
      .from('votes')
      .select('question_id')
      .eq('user_id', user.id)

    const excludeIds = votedIds?.map(v => v.question_id) ?? []

    const query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (excludeIds.length > 0) {
      query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data } = await query
    setQuestions(data ?? [])
    setLoading(false)
  }

  async function handleVote(answer: string) {
    if (voting || questions.length === 0) return
    setVoting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
    return <div className="flex items-center justify-center h-screen text-gray-400">Chargement...</div>
  }

  return (
    <div className="flex flex-col h-screen p-4 pt-8">
      <h1 className="text-lg font-bold mb-4">Questions du moment</h1>

      {questions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <span className="text-4xl">🎉</span>
          <p className="font-semibold">Tu as tout vu !</p>
          <p className="text-gray-500 text-sm">Reviens plus tard ou crée une nouvelle question.</p>
        </div>
      ) : (
        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={questions[0].id}
              question={questions[0]}
              onVote={handleVote}
            />
          </AnimatePresence>
          <p className="text-center text-xs text-gray-400 mt-3">
            {questions.length} question{questions.length > 1 ? 's' : ''} restante{questions.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Test manually**

```bash
npm run dev
```
- Login, go to `/`
- Should see loading then empty state (no questions yet — normal)

**Step 3: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat: add Discover feed with vote logic"
```

---

### Task 10: Create question screen

**Files:**
- Create: `app/(app)/create/page.tsx`

**Step 1: Implement Create page**

```typescript
// app/(app)/create/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreatePage() {
  const [text, setText] = useState('')
  const [type, setType] = useState<'yes_no' | 'multiple'>('yes_no')
  const [options, setOptions] = useState(['', ''])
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function updateOption(index: number, value: string) {
    setOptions(prev => prev.map((o, i) => i === index ? value : o))
  }

  function addOption() {
    if (options.length < 4) setOptions(prev => [...prev, ''])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      author_id: user.id,
      text,
      type,
      options: type === 'multiple'
        ? options.filter(Boolean).map((label, i) => ({ label, value: String(i) }))
        : null,
      location,
    }

    const { error } = await supabase.from('questions').insert(payload)
    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 pt-8">
      <h1 className="text-lg font-bold mb-6">Nouvelle question</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Question <span className="text-gray-400">({text.length}/120)</span>
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={120}
            rows={3}
            placeholder="Faut-il créer une piste cyclable rue Victor Hugo ?"
            className="w-full border rounded-xl px-4 py-3 text-sm resize-none"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Type de réponse</label>
          <div className="flex gap-2">
            {(['yes_no', 'multiple'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-colors
                  ${type === t ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600'}`}
              >
                {t === 'yes_no' ? 'Oui / Non' : 'Choix multiple'}
              </button>
            ))}
          </div>
        </div>

        {type === 'multiple' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Options</label>
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="w-full border rounded-xl px-4 py-3 text-sm"
                required={i < 2}
              />
            ))}
            {options.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="text-sm text-blue-600 underline"
              >
                + Ajouter une option
              </button>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Lieu</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Paris 11e, Lyon 3e..."
            className="w-full border rounded-xl px-4 py-3 text-sm"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Publication...' : 'Publier'}
        </button>
      </form>
    </div>
  )
}
```

**Step 2: Test manually**

- Go to `/create`
- Create a Oui/Non question → submit → redirect to `/`
- Go back to Discover — the question should now appear
- Vote on it — it should disappear from the feed

**Step 3: Commit**

```bash
git add app/\(app\)/create/
git commit -m "feat: add Create question screen"
```

---

### Task 11: Profile screen

**Files:**
- Create: `app/(app)/profile/page.tsx`

**Step 1: Implement Profile page**

```typescript
// app/(app)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: myQuestions }, { data: myVotes }] = await Promise.all([
    supabase
      .from('questions')
      .select('id, text, location, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('votes')
      .select('answer, created_at, questions(id, text, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const username = user.email?.split('@')[0] ?? 'Utilisateur'

  return (
    <div className="p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">{username}</h1>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <LogoutButton />
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Mes questions ({myQuestions?.length ?? 0})</h2>
        {myQuestions?.length === 0 && (
          <p className="text-sm text-gray-400">Tu n'as pas encore posé de question.</p>
        )}
        <div className="space-y-2">
          {myQuestions?.map(q => (
            <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium">{q.text}</p>
              <p className="text-xs text-gray-400 mt-1">📍 {q.location}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Mes réponses ({myVotes?.length ?? 0})</h2>
        {myVotes?.length === 0 && (
          <p className="text-sm text-gray-400">Tu n'as pas encore répondu à des questions.</p>
        )}
        <div className="space-y-2">
          {myVotes?.map(v => {
            const q = v.questions as { text: string; location: string } | null
            return (
              <div key={`${v.created_at}`} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm font-medium">{q?.text}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {q?.location}</p>
                <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                  Ta réponse : {v.answer === 'yes' ? 'Oui' : v.answer === 'no' ? 'Non' : v.answer}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
```

**Step 2: Create LogoutButton component**

```typescript
// components/LogoutButton.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={logout}
      className="text-sm text-gray-500 border rounded-lg px-3 py-1.5"
    >
      Déconnexion
    </button>
  )
}
```

**Step 3: Test manually**

- Create a question → go to Profil → "Mes questions" should list it
- Go to Discover → vote → go to Profil → "Mes réponses" should list it

**Step 4: Commit**

```bash
git add app/\(app\)/profile/ components/LogoutButton.tsx
git commit -m "feat: add Profile screen with questions and answers history"
```

---

### Task 12: Deploy to Vercel

**Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/politilocal.git
git push -u origin main
```

**Step 2: Deploy on Vercel**

1. Go to https://vercel.com → New Project → Import from GitHub
2. Select `politilocal`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

**Step 3: Configure Supabase for production**

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: add `https://your-app.vercel.app/auth/callback`

**Step 4: Test production**

- Open the Vercel URL on your phone
- Create account, vote, create question, check profile
- On iPhone: Safari → Share → "Sur l'écran d'accueil" → app icon appears

**Step 5: Share the link with your first testers** 🎉

---

## Summary

| Task | What you get |
|------|-------------|
| 1-3  | Project scaffolded, Supabase connected |
| 4    | Database ready with security |
| 5-6  | Auth working (email + Google) |
| 7    | Navigation between screens |
| 8-9  | Discover feed with swipe voting |
| 10   | Question creation |
| 11   | Profile with history |
| 12   | Live on the internet |

**Estimated sessions with Claude Code:** 2-3 sessions of ~1h each.
