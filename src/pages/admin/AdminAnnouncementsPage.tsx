import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui'
import { announcementsApi, type AnnouncementInput } from '../../lib/api.ts'
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_AUDIENCE_LABELS } from '../../lib/constants.ts'
import { formatDateTime } from '../../lib/format.ts'
import { minLength, required, validateValue } from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { Announcement, AnnouncementAudience } from '../../types/index.ts'

interface AnnouncementFormState {
  title: string
  body: string
  audience: AnnouncementAudience
  pinned: boolean
}

interface AnnouncementFormErrors {
  title?: string
  body?: string
}

const EMPTY_FORM: AnnouncementFormState = {
  title: '',
  body: '',
  audience: 'students',
  pinned: false,
}

/**
 * Announcements.
 *
 * A plain chronological list — pinned items first, then newest. No card per
 * notice: the date, title and body carry it. Creating and editing happen in a
 * dialog, and deleting is confirmed.
 */
export function AdminAnnouncementsPage() {
  useDocumentTitle('Announcements')
  const toast = useToast()
  const { user } = useAuth()
  const author = user ? `${user.firstName} ${user.lastName}` : 'Administrator'

  const list = useAsync(() => announcementsApi.list(), [])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<AnnouncementFormErrors>({})

  const saveAction = useAsyncAction((id: string | null, input: AnnouncementInput) =>
    id ? announcementsApi.update(id, input) : announcementsApi.create(input, author),
  )

  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const deleteAction = useAsyncAction(async (id: string) => {
    await announcementsApi.remove(id)
    return true
  })

  function openCreate(): void {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(announcement: Announcement): void {
    setEditing(announcement)
    setForm({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      pinned: announcement.pinned,
    })
    setErrors({})
    setDialogOpen(true)
  }

  function closeDialog(): void {
    setDialogOpen(false)
    setEditing(null)
  }

  function validate(): AnnouncementFormErrors {
    const next: AnnouncementFormErrors = {}
    const titleError = validateValue(form.title, [required('Title'), minLength(5, 'Title')])
    if (titleError) next.title = titleError
    const bodyError = validateValue(form.body, [required('Body'), minLength(10, 'Body')])
    if (bodyError) next.body = bodyError
    return next
  }

  async function handleSave(): Promise<void> {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: AnnouncementInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      pinned: form.pinned,
    }
    const result = await saveAction.run(editing ? editing.id : null, input)
    if (!result) return
    toast.success(
      editing ? 'Announcement updated' : 'Announcement published',
      editing ? `“${result.title}” was saved.` : `“${result.title}” is now visible in-app.`,
    )
    closeDialog()
    list.reload()
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    const result = await deleteAction.run(deleting.id)
    if (!result) return
    toast.success('Announcement deleted', `“${deleting.title}” was removed.`)
    setDeleting(null)
    list.reload()
  }

  const announcements = list.data ?? []

  return (
    <div className="space-y-10">
      <PageHeader
        title="Announcements"
        description="Post notices for students and administrators. They appear inside the app."
        actions={
          <Button leadingIcon={<Icon name="plus" className="size-4" />} onClick={openCreate}>
            New announcement
          </Button>
        }
      />

      <Alert tone="info">
        Publishing an announcement adds it to this platform. No email is sent and no external service
        is contacted.
      </Alert>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error && list.loading && list.data === null ? (
        <LoadingState label="Loading announcements…" />
      ) : null}

      {!list.error && list.data && announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Publish the first announcement to keep students informed about deadlines and requirements."
          action={<Button onClick={openCreate}>New announcement</Button>}
        />
      ) : null}

      {!list.error && announcements.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="flex flex-col gap-3 py-6 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(announcement.publishedAt)}
                  </span>
                  {announcement.pinned ? <Badge tone="gold">Pinned</Badge> : null}
                  <Badge tone="neutral">{ANNOUNCEMENT_AUDIENCE_LABELS[announcement.audience]}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {announcement.title}
                </h3>
                <p className="text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
                  {announcement.body}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Posted by {announcement.author}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(announcement)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                  onClick={() => setDeleting(announcement)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        size="lg"
        title={editing ? 'Edit announcement' : 'New announcement'}
        description="Announcements are visible to the audience you choose for as long as they exist here."
        footer={
          <>
            <Button variant="outline" onClick={closeDialog} disabled={saveAction.loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saveAction.loading}>
              {editing ? 'Save changes' : 'Publish announcement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="announcement-title"
            label="Title"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            error={errors.title}
            hint="At least 5 characters."
          />
          <Textarea
            id="announcement-body"
            label="Body"
            required
            rows={6}
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            error={errors.body}
            hint="At least 10 characters. Describe what changed and what recipients should do."
          />
          <Select
            id="announcement-audience"
            label="Audience"
            options={ANNOUNCEMENT_AUDIENCES.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={form.audience}
            onChange={(event) =>
              setForm({ ...form, audience: event.target.value as AnnouncementAudience })
            }
          />
          <Checkbox
            id="announcement-pinned"
            label="Pin this announcement to the top of every list"
            checked={form.pinned}
            onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
          />

          {saveAction.error ? (
            <Alert tone="danger" title="We could not save this announcement">
              {saveAction.error}
            </Alert>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete announcement"
        confirmLabel="Delete announcement"
        tone="danger"
        loading={deleteAction.loading}
        description={
          deleting ? `“${deleting.title}” will be permanently removed. This cannot be undone.` : undefined
        }
      />
    </div>
  )
}
