import { Navigate } from 'react-router'
import { LinkButton, LoadingState, PageHeader } from '../../components/ui'
import { EmailVerificationSection } from '../../components/EmailVerificationSection.tsx'
import { useAuth } from '../../context/authContext.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

/**
 * The confirmation step between signing up and using the account.
 *
 * Registration sends the first code, so this screen starts by asking for it
 * rather than by offering to send one. The student area redirects here while
 * the address is unconfirmed, and the server refuses to accept an application
 * or a saved listing from an unconfirmed account even if the redirect is
 * bypassed.
 */
export function VerifyEmailPage() {
  useDocumentTitle('Confirm Your Email')
  const { user, initialising } = useAuth()

  if (initialising) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-canvas dark:bg-ink-950">
        <LoadingState label="Checking your session." />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Nothing to do once the address is confirmed; the guard would have sent them
  // onwards anyway, and landing back here should not be a dead end.
  if (user.emailVerified) return <Navigate to="/student/dashboard" replace />

  return (
    <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <PageHeader title="Confirm Your Email" />

      <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-slate-900 dark:text-slate-100">
        Enter the six-digit code sent to your address. Confirming it is what lets you apply for a
        scholarship and save listings. If you do not have a code, send one below.
      </p>

      <div className="mt-8">
        <EmailVerificationSection />
      </div>

      <p className="mt-6 text-sm text-slate-900 dark:text-slate-100">
        Nothing arrived? Send another code, then check the spam folder. If it still does not arrive,
        contact the scholarship office.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {/* Not a trap: whether an unconfirmed address blocks anything is a
            deployment decision, so the student can always get to their own
            dashboard and come back here from the profile page. */}
        <LinkButton to="/student/dashboard" variant="outline">
          Go to My Dashboard
        </LinkButton>
        <LinkButton to="/faqs" variant="ghost">
          Read the FAQs
        </LinkButton>
      </div>
    </div>
  )
}
