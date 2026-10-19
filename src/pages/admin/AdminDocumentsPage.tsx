import { useState } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { ErrorState, LoadingState } from '../../components/ui/States.tsx'
import { Field } from '../../components/ui/Field.tsx'
import { PageHeader } from '../../components/ui/PageHeader.tsx'
import { Section } from '../../components/ui/Section.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { Textarea } from '../../components/ui/Textarea.tsx'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { documentsApi } from '../../lib/api.ts'
import {
  DOCUMENT_CLASSIFICATIONS,
  DOCUMENT_CLASSIFICATION_LABELS,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from '../../lib/constants.ts'
import { formatDate, formatFileSize, fullName } from '../../lib/format.ts'
import type { DocumentStatus, DocumentRecord } from '../../types/index.ts'

/**
 * Document review for the scholarship office.
 *
 * Deliberately a list, not a table: a document is judged by looking at it, so
 * each row carries the one action that matters (open the file) and the one
 * decision (accept or return it). Classification is shown because it decides
 * which requirement the file answers.
 */

const STATUS_TONES: Record<DocumentStatus, BadgeTone> = {
  submitted: 'info',
  verified: 'success',
  rejected: 'danger',
}

export function AdminDocumentsPage() {
  useDocumentTitle('Documents')
  const toast = useToast()

  const state = useAsync(() => documentsApi.listRecords(), [])
  const records = state.data ?? []

  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('submitted')
  const [reviewing, setReviewing] = useState<DocumentRecord | null>(null)
  const [note, setNote] = useState('')
  const [classification, setClassification] = useState<DocumentRecord['document']['classification']>(
    'enrollment',
  )

  const decide = useAsyncAction(async (record: DocumentRecord, status: DocumentStatus) => {
    if (status === 'rejected' && !note.trim()) return null
    const updated = await documentsApi.update(record.document.id, {
      status,
      note: note.trim(),
      classification,
    })
    toast.success(
      status === 'verified' ? 'Document verified' : 'Document returned',
      `“${updated.title}” for ${fullName(record.student.firstName, record.student.lastName)}.`,
    )
    setReviewing(null)
    setNote('')
    state.reload()
    return updated
  })

  const visible = records.filter(
    (record) => statusFilter === 'all' || record.document.status === statusFilter,
  )
  const awaiting = records.filter((record) => record.document.status === 'submitted').length

  return (
    <div className="space-y-10">
      <PageHeader
        title="Documents"
        description="Files students have attached to their profiles. Verify a document once and it stands as evidence for every application that asks for it."
      />

      <Section
        title={
          state.loading
            ? 'Documents'
            : awaiting > 0
              ? `${awaiting} awaiting review`
              : 'All documents reviewed'
        }
        description="A verified document cannot be removed by the student, because it is the evidence a decision rested on."
        actions={
          <Select
            id="document-status-filter"
            label="Status"
            hideLabel
            value={statusFilter}
            options={[{ value: 'all', label: 'All statuses' }, ...DOCUMENT_STATUSES]}
            onChange={(event) => setStatusFilter(event.target.value as DocumentStatus | 'all')}
          />
        }
      >
        {state.loading ? <LoadingState label="Loading documents…" /> : null}
        {state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}

        {!state.loading && !state.error && visible.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            description={
              statusFilter === 'submitted'
                ? 'No documents are waiting for review.'
                : 'No documents match that status.'
            }
          />
        ) : null}

        {!state.loading && !state.error && visible.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-ink-800">
            {visible.map((record) => (
              <li key={record.document.id} className="flex flex-wrap items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {record.document.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {fullName(record.student.firstName, record.student.lastName)} ·{' '}
                    {DOCUMENT_CLASSIFICATION_LABELS[record.document.classification]} ·{' '}
                    {formatFileSize(record.document.size)} · added{' '}
                    {formatDate(record.document.uploadedAt)}
                  </p>
                  {record.document.note ? (
                    <p className="mt-1.5 max-w-[60ch] text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Note:</span> {record.document.note}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONES[record.document.status]}>
                    {DOCUMENT_STATUS_LABELS[record.document.status]}
                  </Badge>
                  <a
                    href={documentsApi.fileUrl(record.document.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
                  >
                    Open
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReviewing(record)
                      setNote(record.document.note ?? '')
                      setClassification(record.document.classification)
                    }}
                  >
                    Review
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Dialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={reviewing ? reviewing.document.title : 'Review document'}
        description={
          reviewing
            ? `${fullName(reviewing.student.firstName, reviewing.student.lastName)} · ${reviewing.document.fileName}`
            : undefined
        }
        size="md"
      >
        {reviewing ? (
          <div className="space-y-4">
            <Select
              id="review-classification"
              label="Classification"
              hint="Which requirement this file answers."
              value={classification}
              options={DOCUMENT_CLASSIFICATIONS}
              onChange={(event) =>
                setClassification(
                  event.target.value as DocumentRecord['document']['classification'],
                )
              }
            />

            <Field
              htmlFor="review-note"
              label="Note to the student"
              hint="Required when returning a document, so they know what to fix."
            >
              <Textarea
                id="review-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="The scan is unreadable below the seal — please upload a clearer copy."
              />
            </Field>

            {decide.error ? (
              <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {decide.error}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            disabled={decide.loading || !reviewing}
            onClick={() => {
              if (reviewing) void decide.run(reviewing, 'verified')
            }}
          >
            Verify document
          </Button>
          <Button
            variant="outline"
            disabled={decide.loading || !reviewing || !note.trim()}
            onClick={() => {
              if (reviewing) void decide.run(reviewing, 'rejected')
            }}
          >
            Return to student
          </Button>
          <Button variant="ghost" onClick={() => setReviewing(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
