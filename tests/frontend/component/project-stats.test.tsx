import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProjectStats } from '@renderer/components/project-stats'
import { createStats } from '../mocks/factories'

describe('ProjectStats', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders three stat cards', () => {
    const stats = createStats()

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('displays correct counts for each status', () => {
    const stats = createStats({
      byStatus: { completed: 5, 'in-progress': 3, 'not-started': 2 }
    })

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('displays correct counts for each type', () => {
    const stats = createStats({
      byType: { bug: 4, feature: 6, improvement: 1, planning: 2, research: 0 }
    })

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('renders all status labels', () => {
    const stats = createStats()

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })

  it('renders all type labels', () => {
    const stats = createStats()

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature')).toBeInTheDocument()
    expect(screen.getByText('Improvement')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('Research')).toBeInTheDocument()
  })

  it('renders all priority labels', () => {
    const stats = createStats()

    render(<ProjectStats stats={stats} />)

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })
})
