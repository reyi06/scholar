import { useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  ConfirmDialog,
  DefinitionList,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Section,
  Select,
  Textarea,
} from '../../components/ui'
import { demoApi, settingsApi } from '../../lib/api.ts'
import { ACADEMIC_YEARS, SEMESTERS } from '../../lib/constants.ts'
import { formatDateTime, formatNumber } from '../../lib/format.ts'
import { emailFormat, oneOf, required, validateValue } from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import type { PlatformSettings } from '../../types/index.ts'

interface SettingsFormState {
  currentAcademicYear: string
  currentSemester: string
  applicationsOpen: boolean
  maintenanceMessage: string
  contactEmail: string
}

interface SettingsFormErrors {
  currentAcademicYear?: string
  currentSemester?: string
  contactEmail?: string
}

const YEAR_OPTIONS = ACADEMIC_YEARS.map((year) => ({ value: year, label: `AY ${year}` }))
const SEMESTER_OPTIONS = SEMESTERS.map((semester) => ({ value: semester, label: semester }))

/**
 * Platform settings.
 *
 * Two sections only: the configuration form, and the records this deployment
 * currently holds with the restore action. Restoring is irreversible and is
 * confirmed before it runs.
 */
export function AdminSettingsPage() {
  useDocumentTitle('Settings')
  const toast = useToast()

  const [form, setForm] = useState<SettingsFormState | null>(null)
  const [errors, setErrors] = useState<SettingsFormErrors>({})

  // Copy the loaded settings into editable state. Re-runs after a save or a
  // restore, so the form always reflects what is actually persisted.
  const settings = useAsync(() => settingsApi.get(), [], {
    onSuccess: (loaded) => {
      setForm({
        currentAcademicYear: loaded.currentAcademicYear,
        currentSemester: loaded.currentSemester,
        applicationsOpen: loaded.applicationsOpen,
        maintenanceMessage: loaded.maintenanceMessage,
        contactEmail: loaded.contactEmail,
      })
    },
  })
  const demoStats = useAsync(async () => demoApi.stats(), [])

  const saveAction = useAsyncAction((patch: Partial<PlatformSettings>) => settingsApi.update(patch))

  const [resetOpen, setResetOpen] = useState(false)
  const resetAction = useAsyncAction(async () => {
    await demoApi.reset()
    return true
  })

  function validate(current: SettingsFormState): SettingsFormErrors {
    const found: SettingsFormErrors = {}
    const yearError = validateValue(current.currentAcademicYear, [
      required('Academic year'),
      oneOf(ACADEMIC_YEARS, 'Academic year'),
    ])
    if (yearError) found.currentAcademicYear = yearError
    const semesterError = validateValue(current.currentSemester, [
      required('Semester'),
      oneOf(SEMESTERS, 'Semester'),
    ])
    if (semesterError) found.currentSemester = semesterError
    const emailError = validateValue(current.contactEmail, [
      required('Contact email'),
      emailFormat(),
    ])
    if (emailError) found.contactEmail = emailError
    return found
  }

  async function handleSave(): Promise<void> {
    if (!form) return
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const result = await saveAction.run({
      currentAcademicYear: form.currentAcademicYear,
      currentSemester: form.currentSemester,
      applicationsOpen: form.applicationsOpen,
      maintenanceMessage: form.maintenanceMessage.trim(),
      contactEmail: form.contactEmail.trim(),
    })
    if (!result) return
    toast.success('Settings saved', `Last updated ${formatDateTime(result.updatedAt)}.`)
    settings.reload()
  }

  async function handleReset(): Promise<void> {
    const result = await resetAction.run()
    if (!result) return
    toast.success(
      'Demo data reset',
      'The shipped sample records were restored. You are still signed in.',
    )
    setResetOpen(false)
    demoStats.reload()
    settings.reload()
  }

  const stats = demoStats.data

  return (
    <div className="space-y-10">
      <PageHeader
        title="Settings"
        description="Platform-wide configuration for the current term and public-facing messages."
      />

      {settings.error ? <ErrorState message={settings.error} onRetry={settings.reload} /> : null}

      {!settings.error && settings.loading && !form ? (
        <LoadingState label="Loading settings…" />
      ) : null}

      {!settings.error && form ? (
        <Section
          divider={false}
          title="Platform Settings"
          description="These values drive which academic term is treated as current and whether applications are open."
        >
          <div className="max-w-2xl space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="settings-year"
                label="Current Academic Year"
                options={YEAR_OPTIONS}
                value={form.currentAcademicYear}
                onChange={(event) => setForm({ ...form, currentAcademicYear: event.target.value })}
                error={errors.currentAcademicYear}
              />
              <Select
                id="settings-semester"
                label="Current Semester"
                options={SEMESTER_OPTIONS}
                value={form.currentSemester}
                onChange={(event) => setForm({ ...form, currentSemester: event.target.value })}
                error={errors.currentSemester}
              />
            </div>

            <Checkbox
              id="settings-applications-open"
              label="Accept New Scholarship Applications"
              checked={form.applicationsOpen}
              onChange={(event) => setForm({ ...form, applicationsOpen: event.target.checked })}
              hint="When unchecked, students cannot submit new applications."
            />

            <Input
              id="settings-contact-email"
              label="Contact Email"
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
              error={errors.contactEmail}
              hint="Shown to students who need to reach the scholarship office."
            />

            <Textarea
              id="settings-maintenance-message"
              label="Maintenance Message"
              rows={3}
              value={form.maintenanceMessage}
              onChange={(event) => setForm({ ...form, maintenanceMessage: event.target.value })}
              hint="Displayed as a banner when non-empty. Leave blank to show no banner."
            />

            {saveAction.error ? (
              <Alert tone="danger" title="We could not save these settings">
                {saveAction.error}
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSave} loading={saveAction.loading}>
                Save Settings
              </Button>
              {settings.data ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last saved {formatDateTime(settings.data.updatedAt)}
                </span>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      <Section
        title="Stored Records"
        description="Records currently held by this deployment. Restoring replaces them with the set the application ships with."
      >
        <div className="max-w-2xl space-y-5">
          {demoStats.loading && !stats ? (
            <LoadingState label="Counting records…" />
          ) : demoStats.error ? (
            <ErrorState message={demoStats.error} onRetry={demoStats.reload} />
          ) : (
            <DefinitionList
              columns={2}
              items={[
                { label: 'Scholarships', value: formatNumber(stats?.scholarships ?? 0) },
                { label: 'Applications', value: formatNumber(stats?.applications ?? 0) },
                { label: 'Students', value: formatNumber(stats?.students ?? 0) },
                { label: 'Grant Records', value: formatNumber(stats?.grants ?? 0) },
              ]}
            />
          )}

          <Alert tone="warning" title="This cannot be undone">
            Restoring discards everything currently held, including records you have created, and puts
            back the shipped set. You will not be signed out automatically, so reload afterwards to see
            the restored data.
          </Alert>

          <div>
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              Restore shipped records
            </Button>
          </div>
        </div>
      </Section>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Restore shipped records"
        confirmLabel="Restore Everything"
        tone="danger"
        loading={resetAction.loading}
        description="This puts back the records the application ships with and permanently discards everything currently held. It cannot be undone."
      />
    </div>
  )
}
