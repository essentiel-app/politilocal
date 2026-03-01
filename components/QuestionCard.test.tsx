import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}))

vi.mock('next/font/google', () => ({
  Playfair_Display: () => ({ style: { fontFamily: 'Playfair Display' } }),
  Lora: () => ({ style: { fontFamily: 'Lora' } }),
}))

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

  it('renders Oui and Non buttons for yes_no type', () => {
    render(<QuestionCard question={mockQuestion} onVote={vi.fn()} />)
    expect(screen.getByText('Oui')).toBeInTheDocument()
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('calls onVote with correct answer when Oui clicked', () => {
    const onVote = vi.fn()
    render(<QuestionCard question={mockQuestion} onVote={onVote} />)
    fireEvent.click(screen.getByText('Oui'))
    expect(onVote).toHaveBeenCalledWith('yes')
  })

  it('calls onVote with correct answer when Non clicked', () => {
    const onVote = vi.fn()
    render(<QuestionCard question={mockQuestion} onVote={onVote} />)
    fireEvent.click(screen.getByText('Non'))
    expect(onVote).toHaveBeenCalledWith('no')
  })

  it('renders multiple choice options', () => {
    const mcQuestion = {
      ...mockQuestion,
      type: 'multiple' as const,
      options: [
        { label: 'Totalement', value: '0' },
        { label: 'Partiellement', value: '1' },
        { label: 'Non', value: '2' },
      ],
    }
    render(<QuestionCard question={mcQuestion} onVote={vi.fn()} />)
    expect(screen.getByText('Totalement')).toBeInTheDocument()
    expect(screen.getByText('Partiellement')).toBeInTheDocument()
  })
})
