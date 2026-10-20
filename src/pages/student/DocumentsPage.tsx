import { useRef, useState } from 'react'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { ErrorState, LoadingState } from '../../components/ui/States.tsx'
import { Field } from '../../components/ui/Field.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { PageHeader } from '../../components/ui/PageHeader.tsx'
import { Section } from '../../components/ui/Section.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { documentsApi } from '../../lib/api.ts'
import {
  DOCUMENT_ACCEPT_ATTRIBUTE,
  ACCEPTED_DOCUMENT_LABEL,
  MAX_DOCUMENT_MB,
  classifyDocument,
  suggestDocumentTitle,
  validateDocumentFile,
} from '../../lib/documents.ts'
import {
  DOCUMENT_CLASSIFICATIONS,
  DOCUMENT_STATUSES,
} from '../../lib/constants.ts'
import { formatDate, formatFileSize } from '../../lib/format.ts'
import type { DocumentClassification, StudentDocument } from '../../types/index.ts'
import { DOCUMENT_STATUS_TONES } from '../../lib/tones.ts'

/**
 * The student's document library.
 *
 * Documents are filed against the profile rather than one application, so a
 * certificate uploaded once answers that requirement on every listing. The
 * page is therefore grouped by classification: the question it answers is
 * "what have I supplied?", not "what did I send last time?".
 */

export function DocumentsPage() {
  useDocumentTitle('My Documents')
  const toast = useToast()

  const state = useAsync(() => documentsApi.list(), [])
  const documents = state.data ?? []

  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [classification, setClassification] = useState<DocumentClassification>('enrollment')
  const [fileError, setFileError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<StudentDocument | null>(null)

  const upload = useAsyncAction(async () => {
    if (!file) {
      setFileError('Choose a file to upload.')
      return null
    }
    const problem = validateDocumentFile(file)
    if (problem) {
      setFileError(problem)
      return null
    }
    const saved = await documentsApi.upload({ file, title, classification })
    toast.success('Document added', `Saved to your profile as “${saved.title}”.`)
    setFile(null)
    setTitle('')
    if (fileInput.current) fileInput.current.value = ''
    state.reload()
    return saved
  })

  const remove = useAsyncAction(async (document: StudentDocument) => {
    await documentsApi.remove(document.id)
    toast.success('Document removed', `“${document.title}” was deleted.`)
    state.reload()
  })

  /** The classification suggestion follows the chosen file, but is editable. */
  function chooseFile(chosen: File | null) {
    setFileError(null)
    setFile(chosen)
    if (!chosen) return
    const problem = validateDocumentFile(chosen)
    if (problem) {
      setFileError(problem)
      return
    }
    setClassification(classifyDocument(chosen.name, chosen.type))
    if (!title.trim()) setTitle(suggestDocumentTitle(chosen.name))
  }

  const grouped = DOCUMENT_CLASSIFICATIONS.map((option) => ({
    ...option,
    items: documents.filter((document) => document.classification === option.value),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="space-y-10">
      <PageHeader
        title="My Documents"
        description="Keep the certificates and records your applications depend on in one place. Upload a file once and it stays on your profile for every listing that asks for it."
      />

      <Section title="Add a Document">
        <form
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void upload.run()
          }}
        >
          <Field
            htmlFor="document-file"
            label="File"
            required
            error={fileError ?? undefined}
            hint={`${ACCEPTED_DOCUMENT_LABEL}, up to ${MAX_DOCUMENT_MB} MB.`}
            className="sm:col-span-2"
          >
            <input
              ref={fileInput}
              id="document-file"
              type="file"
              accept={DOCUMENT_ACCEPT_ATTRIBUTE}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              aria-describedby="document-file-hint document-file-error"
              className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:border-slate-400 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-300 dark:file:bg-ink-800 dark:file:text-slate-200"
            />
          </Field>

          <Field htmlFor="document-title" label="Title" hint="What you would call this document.">
            <Input
              id="document-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Certificate of enrolment"
              aria-describedby="document-title-hint"
            />
          </Field>

          <Select
            id="document-classification"
            label="Classification"
            hint="Pre-filled from the file name. Change it if it is wrong."
            value={classification}
            options={DOCUMENT_CLASSIFICATIONS}
            onChange={(event) =>
              setClassification(event.target.value as DocumentClassification)
            }
          />

          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={upload.loading || !file}>
              {upload.loading ? 'Uploading…' : 'Add document'}
            </Button>
            {file ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {file.name} · {formatFileSize(file.size)}
              </span>
            ) : null}
          </div>

          {upload.error ? (
            <p role="alert" className="text-sm font-medium text-rose-600 sm:col-span-2 dark:text-rose-400">
              {upload.error}
            </p>
          ) : null}
        </form>
      </Section>

      <Section title="Your Documents">
        {state.loading ? <LoadingState label="Loading your documents…" /> : null}
        {state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : null}

        {!state.loading && !state.error && documents.length === 0 ? (
          <EmptyState
            title="No Documents Yet"
            description="Add a certificate of enrolment, your grades, or proof of residency. They stay on your profile and can be reused across applications."
          />
        ) : null}

        {!state.loading && !state.error && documents.length > 0 ? (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.value}>
                <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2 dark:border-ink-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {group.label}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {group.items.length} {group.items.length === 1 ? 'document' : 'documents'}
                  </span>
                </div>

                <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                  {group.items.map((document) => (
                    <li key={document.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {document.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {document.fileName} · {formatFileSize(document.size)} · added{' '}
                          {formatDate(document.uploadedAt)}
                        </p>
                        {document.note ? (
                          <p className="mt-1.5 max-w-[60ch] text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium">Note:</span> {document.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge tone={DOCUMENT_STATUS_TONES[document.status]}>
                          {DOCUMENT_STATUSES.find((option) => option.value === document.status)?.label ??
                            document.status}
                        </Badge>
                        <a
                          href={documentsApi.fileUrl(document.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
                        >
                          Open
                        </a>
                        {/* A verified document is the evidence a decision rested
                            on, so it is not the student's to remove. The server
                            enforces this too; hiding the control stops the
                            student discovering it as an error. */}
                        {document.status === 'verified' ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(document)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this document?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be deleted from your profile. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove Document"
        tone="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void remove.run(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
