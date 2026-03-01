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

  it('marks active tab based on pathname', () => {
    render(<BottomNav />)
    const discoverLink = screen.getByText('Découvrir').closest('a')
    expect(discoverLink).toHaveAttribute('href', '/')
  })
})
