import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  LoadingCards,
  LoadingDashboard,
  LoadingDetail,
  LoadingList,
  LoadingPage,
  LoadingTable,
} from '../src/components/ui/States.tsx'

/**
 * Page skeletons.
 *
 * The point of these is the shape they hold while data loads, so the assertions
 * are about structure: the number of rows or cards, and a single announced
 * loading status rather than a screen reader walking every grey block.
 */

afterEach(cleanup)

const shapes = (container: HTMLElement) => container.querySelectorAll('[aria-hidden="true"]')

describe('page skeletons', () => {
  it('announces a loading status without reading the blocks', () => {
    const { container } = render(<LoadingCards count={2} />)

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading content')
    expect(shapes(container).length).toBeGreaterThan(0)
  })

  it('draws one card per requested placeholder', () => {
    const { container } = render(<LoadingCards count={3} />)
    expect(container.querySelectorAll('.rounded-lg.border').length).toBe(3)
  })

  it('draws the requested number of list rows', () => {
    const { container } = render(<LoadingList rows={4} />)
    expect(container.firstElementChild?.children.length).toBe(4)
  })

  it('draws a table header and the requested rows', () => {
    render(<LoadingTable rows={2} columns={3} />)

    const table = screen.getByRole('status')
    const surface = table.firstElementChild as HTMLElement
    expect(surface.children[0].children.length).toBe(3) // header cells
    expect(surface.children[1].children.length).toBe(2) // body rows
    expect((surface.children[1].children[0] as HTMLElement).children.length).toBe(3) // cells in a row
  })

  it('holds the dashboard shape: a summary row and recent activity', () => {
    const { container } = render(<LoadingDashboard />)
    expect(container.firstElementChild?.children.length).toBe(2)
  })

  it('keeps a whole page on screen while a route chunk loads', () => {
    const { container } = render(<LoadingPage />)

    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading page')
    expect(shapes(container).length).toBeGreaterThan(5)
  })

  it('renders no readable text, so nothing looks like real content', () => {
    const { container } = render(
      <>
        <LoadingDetail />
        <LoadingList />
        <LoadingTable />
      </>,
    )
    expect(container.textContent).toBe('')
  })
})
