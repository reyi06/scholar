import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DefinitionList,
  Dialog,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Textarea,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { applicationsApi, scholarshipsApi, type ApplicationInput } from '../../lib/api.ts'
import { APPLICATION_STATUS_LABELS } from '../../lib/constants.ts'
import { formatDate, formatDateTime } from '../../lib/format.ts'

const NOT_FOUND_DESCRIPTION =
  'This application does not exist, or it does not belong to your account.'

export function ApplicationDetailPage() {
  useDocumentTitle('Application details')
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const toast = useToast()
  const userId = user?.id ?? ''

  const [editing, setEditing] = useState(false)
  const [motivation, setMotivation] = useState('')
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const state = useAsync(
    async () => {
      if (!id || !userId) return { application: null, scholarship: null }
      const application = await applicationsApi.get(id, userId)
      const scholarship = application ? await scholarshipsApi.get(application.scholarshipId) : null
      return { application, scholarship }
    },
    [id, userId],
    {
      // Seed the edit box from the loaded record without a watching effect.
      onSuccess: (loaded) => {
        if (loaded.application) setMotivation(loaded.application.motivation)
      },
    },
  )

  const saveAction = useAsyncAction((input: ApplicationInput, asDraft: boolean) =>
    applicationsApi.update(id ?? '', input, asDraft),
  )
  const withdrawAction = useAsyncAction(() => applicationsApi.withdraw(id ?? '', userId))

  const application = state.data?.application ?? null

  if (!user) {
    return (
      <EmptyState
        title="You are not signed in"
        description="Sign in with a student account to view this application."
        action={<LinkButton to="/login">Sign in</LinkButton>}
      />
    )
  }

  async function handleSave(asDraft: boolean) {
    if (!application) return
    const result = await saveAction.run(
      {
        scholarshipId: application.scholarshipId,
        motivation,
        documentNames: application.documentNames,
        responses: application.responses,
      },
      asDraft,
    )
    if (result) {
      setEditing(false)
      toast.success(
        asDraft ? 'Draft saved' : 'Application submitted',
        asDraft ? 'Your changes were saved.' : `Reference ${result.referenceNo} is now submitted.`,
      )
      state.reload()
    }
  }

  async function handleWithdraw() {
    const result = await withdrawAction.run()
    if (result) {
      setConfirmingWithdraw(false)
      toast.success('Application withdrawn', 'This application is now closed.')
      state.reload()
    }
  }

  const scholarship = state.data?.scholarship ?? null

  let body: ReactNode
  if (state.loading) {
    body = <LoadingState label="Loading this application…" />
  } else if (state.error) {
    body = <ErrorState message={state.error} onRetry={state.reload} />
  } else if (!application) {
    body = (
      <EmptyState
        title="Application not found"
        description={NOT_FOUND_DESCRIPTION}
        action={
          <LinkButton to="/student/applications" variant="outline">
            Back to my applications
          </LinkButton>
        }
      />
    )
  } else {
    const canEdit = application.status === 'draft'
    const canWithdraw = application.status === 'draft' || application.status === 'submitted'

    body = (
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Application summary"
            description={
              scholarship
                ? `${scholarship.name} · ${scholarship.provider}`
                : 'Scholarship listing unavailable'
            }
            actions={<StatusBadge kind="application" status={application.status} size="md" />}
          />
          <CardBody>
            <DefinitionList
              items={[
                { label: 'Reference number', value: application.referenceNo },
                { label: 'Submitted', value: formatDate(application.submittedAt) },
                { label: 'Last updated', value: formatDate(application.updatedAt) },
                { label: 'Application mode', value: 'Internal — tracked in this system' },
                { label: 'Scholarship', value: scholarship?.name ?? 'Listing unavailable', wide: true },
                { label: 'Provider', value: scholarship?.provider ?? '—', wide: true },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Motivation"
            actions={
              canEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    saveAction.setError(null)
                    setEditing(true)
                  }}
                >
                  Edit
                </Button>
              ) : null
            }
          />
          <CardBody>
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-200">
              {application.motivation}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Your responses" description="Answers recorded with this application." />
          <CardBody>
            {application.responses.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No additional responses were recorded.
              </p>
            ) : (
              <DefinitionList
                columns={1}
                items={application.responses.map((response) => ({
                  label: response.label,
                  value: response.value,
                }))}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Documents" description="File names you listed for this application." />
          <CardBody className="space-y-3">
            {application.documentNames.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No documents were listed.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {application.documentNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {application.reviewNotes ? (
          <Alert tone="info" title="Reviewer notes">
            {application.reviewNotes}
            {application.reviewedBy ? (
              <p className="mt-1 text-xs opacity-80">Reviewed by {application.reviewedBy}</p>
            ) : null}
          </Alert>
        ) : null}

        <Card>
          <CardHeader title="Timeline" description="Every status change recorded for this application." />
          <CardBody>
            {application.timeline.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No activity has been recorded yet.
              </p>
            ) : (
              <ol className="space-y-4">
                {application.timeline.map((entry, index) => (
                  <li
                    key={`${entry.status}-${entry.at}-${index}`}
                    className="border-l border-slate-200 pl-4 dark:border-slate-800"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {APPLICATION_STATUS_LABELS[entry.status]}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(entry.at)}
                      {entry.actor ? ` · ${entry.actor}` : ''}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        {canWithdraw ? (
          <Card>
            <CardHeader
              title="Withdraw application"
              description="Close this application if you no longer want to continue with it."
            />
            <CardBody>
              <Button variant="danger" onClick={() => setConfirmingWithdraw(true)}>
                Withdraw application
              </Button>
            </CardBody>
          </Card>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={application ? `Application ${application.referenceNo}` : 'Application details'}
        description="Review the details, documents and status history for this application."
        breadcrumbs={[
          { label: 'My applications', to: '/student/applications' },
          { label: application ? application.referenceNo : 'Details' },
        ]}
        actions={
          <LinkButton to="/student/applications" variant="outline">
            Back to my applications
          </LinkButton>
        }
      />
      {body}

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit motivation"
        description="Update your motivation, then save it as a draft or submit the application."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saveAction.loading}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void handleSave(true)} loading={saveAction.loading}>
              Save draft
            </Button>
            <Button onClick={() => void handleSave(false)} loading={saveAction.loading}>
              Submit application
            </Button>
          </>
        }
      >
        {saveAction.error ? (
          <Alert tone="danger" className="mb-3">
            {saveAction.error}
          </Alert>
        ) : null}
        <Textarea
          id="application-motivation"
          label="Motivation"
          rows={6}
          value={motivation}
          onChange={(event) => setMotivation(event.target.value)}
          hint="Explain why you are applying and how the scholarship would help."
        />
      </Dialog>

      <ConfirmDialog
        open={confirmingWithdraw}
        onClose={() => setConfirmingWithdraw(false)}
        onConfirm={() => void handleWithdraw()}
        title="Withdraw this application?"
        description="Withdrawing closes the application and cannot be undone. You would need to apply again."
        confirmLabel="Withdraw"
        tone="danger"
        loading={withdrawAction.loading}
      />
    </div>
  )
}
