import { useState, type FormEvent, type ReactNode } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingState,
  PageHeader,
  Select,
  type Column,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { grantsApi, registrationsApi, type RegistrationInput } from '../../lib/api.ts'
import { ACADEMIC_YEARS, SEMESTERS, YEAR_LEVELS } from '../../lib/constants.ts'
import { formatDate } from '../../lib/format.ts'
import {
  decimalBetween,
  hasErrors,
  numberBetween,
  required,
  validateForm,
  type FormErrors,
  type Validator,
} from '../../lib/validation.ts'
import type { SemesterRegistration } from '../../types/index.ts'

type RegistrationFormValues = {
  academicYear: string
  semester: string
  school: string
  course: string
  yearLevel: string
  unitsEnrolled: string
  gwa: string
}

const EMPTY_FORM: RegistrationFormValues = {
  academicYear: '',
  semester: '',
  school: '',
  course: '',
  yearLevel: '',
  unitsEnrolled: '',
  gwa: '',
}

const SCHEMA: Partial<Record<keyof RegistrationFormValues, Validator[]>> = {
  academicYear: [required('Academic year')],
  semester: [required('Semester')],
  school: [required('School')],
  course: [required('Course')],
  yearLevel: [required('Year level')],
  unitsEnrolled: [required('Units enrolled'), numberBetween(1, 40, 'Units enrolled')],
  gwa: [decimalBetween(1, 5, 'GWA')],
}

const ACADEMIC_YEAR_OPTIONS = ACADEMIC_YEARS.map((year) => ({ value: year, label: year }))
const SEMESTER_OPTIONS = SEMESTERS.map((semester) => ({ value: semester, label: semester }))
const YEAR_LEVEL_OPTIONS = YEAR_LEVELS.map((level) => ({ value: level, label: level }))

const COLUMNS: Column<SemesterRegistration>[] = [
  {
    key: 'referenceNo',
    header: 'Reference',
    render: (row) => (
      <span className="font-medium text-slate-900 dark:text-white">{row.referenceNo}</span>
    ),
  },
  { key: 'term', header: 'Academic term', render: (row) => `${row.academicYear} · ${row.semester}` },
  { key: 'school', header: 'School', render: (row) => row.school },
  { key: 'units', header: 'Units', align: 'right', render: (row) => row.unitsEnrolled },
  {
    key: 'gwa',
    header: 'GWA',
    align: 'right',
    render: (row) => (row.gwa === null ? '—' : row.gwa.toFixed(2)),
  },
  { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge kind="registration" status={row.status} />,
  },
  { key: 'remarks', header: 'Remarks', render: (row) => row.remarks ?? '—' },
]

export function SemesterRegistrationPage() {
  useDocumentTitle('Semester registration')
  const { user } = useAuth()
  const toast = useToast()
  const userId = user?.id ?? ''

  const state = useAsync(async () => {
    if (!userId) return { registrations: [] as SemesterRegistration[], hasGrant: false }
    const [registrations, grants] = await Promise.all([
      registrationsApi.listForStudent(userId),
      grantsApi.listForStudent(userId),
    ])
    return { registrations, hasGrant: grants.length > 0 }
  }, [userId])

  const createRegistration = useAsyncAction((input: RegistrationInput) =>
    registrationsApi.create(userId, input),
  )

  const [form, setForm] = useState<RegistrationFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors<RegistrationFormValues>>({})

  if (!user) {
    return (
      <EmptyState
        title="You are not signed in"
        description="Sign in with a student account to register for a semester."
        action={<LinkButton to="/login">Sign in</LinkButton>}
      />
    )
  }

  function setField<K extends keyof RegistrationFormValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm(form, SCHEMA)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    const result = await createRegistration.run({
      academicYear: form.academicYear,
      semester: form.semester,
      school: form.school.trim(),
      course: form.course.trim(),
      yearLevel: form.yearLevel,
      unitsEnrolled: Number(form.unitsEnrolled),
      gwa: form.gwa.trim() === '' ? null : Number(form.gwa),
    })
    if (result) {
      toast.success(
        'Registration submitted',
        `Reference ${result.referenceNo} is now pending verification.`,
      )
      setForm(EMPTY_FORM)
      setErrors({})
      state.reload()
    }
  }

  const hasGrant = state.data?.hasGrant ?? false
  const registrations = state.data?.registrations ?? []

  let body: ReactNode
  if (state.loading) {
    body = <LoadingState label="Loading your registrations…" />
  } else if (state.error) {
    body = <ErrorState message={state.error} onRetry={state.reload} />
  } else {
    body = (
      <div className="space-y-6">
        <div className="space-y-4">
          {registrations.length === 0 ? (
            <EmptyState
              title="No semester registrations yet"
              description="Once you are a confirmed grantee, submit a registration each semester to keep your grant active."
            />
          ) : (
            <Card>
              <DataTable
                columns={COLUMNS}
                rows={registrations}
                getRowId={(row) => row.id}
                caption="Your semester registrations"
              />
            </Card>
          )}
        </div>

        <Card>
          <CardHeader
            title="Submit a semester registration"
            description="For existing grantees only. One registration is allowed per academic year and semester."
          />
          <CardBody>
            <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
              {createRegistration.error ? (
                <Alert tone="danger" title="We could not submit this registration">
                  {createRegistration.error}
                </Alert>
              ) : null}

              <fieldset disabled={!hasGrant} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    id="registration-academicYear"
                    label="Academic year"
                    placeholder="Select an academic year"
                    options={ACADEMIC_YEAR_OPTIONS}
                    value={form.academicYear}
                    error={errors.academicYear}
                    required
                    onChange={(event) => setField('academicYear', event.target.value)}
                  />
                  <Select
                    id="registration-semester"
                    label="Semester"
                    placeholder="Select a semester"
                    options={SEMESTER_OPTIONS}
                    value={form.semester}
                    error={errors.semester}
                    required
                    onChange={(event) => setField('semester', event.target.value)}
                  />
                  <Input
                    id="registration-school"
                    label="School"
                    value={form.school}
                    error={errors.school}
                    required
                    onChange={(event) => setField('school', event.target.value)}
                  />
                  <Input
                    id="registration-course"
                    label="Course or strand"
                    value={form.course}
                    error={errors.course}
                    required
                    onChange={(event) => setField('course', event.target.value)}
                  />
                  <Select
                    id="registration-yearLevel"
                    label="Year level"
                    placeholder="Select a year level"
                    options={YEAR_LEVEL_OPTIONS}
                    value={form.yearLevel}
                    error={errors.yearLevel}
                    required
                    onChange={(event) => setField('yearLevel', event.target.value)}
                  />
                  <Input
                    id="registration-unitsEnrolled"
                    label="Units enrolled"
                    type="number"
                    min="1"
                    max="40"
                    value={form.unitsEnrolled}
                    error={errors.unitsEnrolled}
                    required
                    onChange={(event) => setField('unitsEnrolled', event.target.value)}
                  />
                  <Input
                    id="registration-gwa"
                    label="GWA for the semester"
                    type="number"
                    step="0.01"
                    min="1"
                    max="5"
                    value={form.gwa}
                    error={errors.gwa}
                    hint="Optional. Philippine scale, 1.00 (best) to 5.00."
                    onChange={(event) => setField('gwa', event.target.value)}
                  />
                </div>
                <Button type="submit" loading={createRegistration.loading} disabled={!hasGrant}>
                  Submit registration
                </Button>
              </fieldset>
            </form>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semester registration"
        description="Re-register each semester to keep an existing grant active."
      />
      <Alert tone="info" title="This is separate from new scholarship applications">
        Semester registration is for students who already hold a confirmed grant. It keeps an existing
        grant active for a new term; it is not how you apply for a new scholarship.
      </Alert>
      {state.data && !state.data.hasGrant ? (
        <Alert tone="warning" title="Registration is only available to confirmed grantees">
          Once an administrator confirms a grant record for you, you will be able to submit a semester
          registration here.
          <div className="mt-3">
            <LinkButton to="/student/applications" variant="outline" size="sm">
              View my applications
            </LinkButton>
          </div>
        </Alert>
      ) : null}
      {body}
    </div>
  )
}
