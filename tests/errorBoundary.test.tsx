import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../src/components/ErrorBoundary.tsx'

/**
 * The error boundary.
 *
 * React unmounts the whole tree when a render throws, so this component is the
 * difference between "one page failed" and "the site is blank". It had never
 * actually been made to catch anything before this test.
 */

afterEach(cleanup)

function Explodes(): never {
  throw new Error('deliberate failure')
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeTruthy()
  })

  it('shows a recovery screen instead of a blank page', () => {
    // React reports the caught error; the assertion below is about the fallback,
    // so the console noise is suppressed rather than asserted.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/Something Went Wrong/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /reload the page/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /go to the home page/i })).toBeTruthy()
  })

  it('logs the error rather than swallowing it', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>,
    )

    expect(spy).toHaveBeenCalled()
    const logged = spy.mock.calls.map((call) => String(call[0])).join(' ')
    expect(logged).toMatch(/render error/)
  })
})
