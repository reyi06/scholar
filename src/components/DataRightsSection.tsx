import { useState } from 'react'
import { Alert, Button, ConfirmDialog, Section, Textarea } from './ui'
import { useAuth } from '../context/authContext.ts'
import { useToast } from '../context/toastContext.ts'
import { useAsyncAction } from '../hooks/useAsync.ts'
import { meApi } from '../lib/api.ts'

/**
 * The student's own data rights, in the place they would look for them.
 *
 * Access is served directly: the export is the whole record, in a file the
 * student keeps. Erasure is a **request** rather than a button that deletes,
 * because a confirmed grant is evidence of a decision and of the use of public
 * funds — destroying it on a click would destroy the record that explains it.
 * The office decides the scope against its retention obligations.
 */
export function DataRightsSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')

  const download = useAsyncAction(async () => {
    const bundle = await meApi.exportRecords()

    // Built and revoked in the browser: the record never leaves the device
    // through a third party.
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `scholar-records-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    toast.success('Records downloaded', 'The file contains everything held about your account.')
    return true
  })

  const request = useAsyncAction(async () => {
    await meApi.requestErasure(reason.trim())
    toast.success(
      'Request sent',
      'The scholarship office has been notified and will contact you about scope.',
    )
    setReason('')
    return true
  })

  if (!user || user.role !== 'student') return null

  return (
    <Section
      title="Your Records"
      description="Under the Data Privacy Act you may ask for a copy of the records held about you, and ask for them to be erased. A record that funds were released is kept as evidence of that decision."
    >
      <div className="max-w-[70ch] space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Download a copy of your profile, applications, semester registrations, grants and document
          descriptions. Uploaded files themselves are not bundled — download those from My Documents.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" loading={download.loading} onClick={() => void download.run()}>
            {download.loading ? 'Preparing…' : 'Download My Records'}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            Request Erasure
          </Button>
        </div>

        {download.error ? <Alert tone="danger">{download.error}</Alert> : null}
        {request.error ? <Alert tone="danger">{request.error}</Alert> : null}
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void request.run()
          setConfirming(false)
        }}
        title="Request Erasure of Your Records"
        confirmLabel="Send Request"
        tone="danger"
        loading={request.loading}
        description={
          <>
            <p>
              This sends a request to the scholarship office rather than deleting anything now. A
              member of staff will review what can be removed and contact you.
            </p>
            <p className="mt-3">
              Records of a confirmed grant are kept, because they evidence a decision and the use of
              public funds.
            </p>
          </>
        }
      >
        <Textarea
          id="erasure-reason"
          label="Reason"
          rows={3}
          value={reason}
          hint="Optional, but it helps the office act on your request."
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>
    </Section>
  )
}
