import { useState, type FormEvent } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  DefinitionList,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingList,
  PageHeader,
  Section,
  Select,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { grantsApi, registrationsApi, studentsApi, type RegistrationInput } from '../../lib/api.ts'
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

type Step = 'details' | 'review' | 'submitted'

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

const STEPS: { id: Step; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
  { id: 'submitted', label: 'Submitted' },
]

/** Numbered progress row. Static labels only — no motion, no iconography. */
function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Registration Progress">
      {STEPS.map((step, index) => {
        const isCurrent = step.id === current
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex size-5 items-center justify-center rounded-full text-xs font-medium ${
                isCurrent
                  ? 'bg-brand-700 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-ink-800 dark:text-slate-400'
              }`}
            >
              {index + 1}
            </span>
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={`text-sm ${
                isCurrent
                  ? 'font-semibold text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Semester registration for existing grantees.
 *
 * The form is completed in three visible steps so the student confirms exactly
 * what will be sent before anything is recorded. Nothing is written until the
 * review step's submit button is pressed.
 */
export function SemesterRegistrationPage() {
  useDocumentTitle('Semester Registration')
  const { user } = useAuth()
  const toast = useToast()
  const userId = user?.id ?? ''

  const [step, setStep] = useState<Step>('details')
  const [form, setForm] = useState<RegistrationFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors<RegistrationFormValues>>({})
  const [submitted, setSubmitted] = useState<SemesterRegistration | null>(null)

  const state = useAsync(
    async () => {
      if (!userId) {
        return { registrations: [] as SemesterRegistration[], hasGrant: false, profile: null }
      }
      const [registrations, grants, profile] = await Promise.all([
        registrationsApi.listForStudent(userId),
        grantsApi.listForStudent(userId),
        studentsApi.profile(userId),
      ])
      return { registrations, hasGrant: grants.length > 0, profile }
    },
    [userId],
    {
      /**
       * WCAG 2.2 SC 3.3.7 (Redundant Entry): the school, course and year level
       * are already on the profile, so the student is not asked to type them
       * again every term. The fields stay editable — a student does move up a
       * year level.
       */
      onSuccess: (data) => {
        const profile = data.profile
        if (!profile) return
        setForm((current) => ({
          ...current,
          school: current.school || profile.school,
          course: current.course || profile.course,
          yearLevel: current.yearLevel || profile.yearLevel,
        }))
      },
    },
  )

  const createRegistration = useAsyncAction((input: RegistrationInput) =>
    registrationsApi.create(userId, input),
  )

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to register for a semester."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const hasGrant = state.data?.hasGrant ?? false
  const registrations = state.data?.registrations ?? []

  function setField<K extends keyof RegistrationFormValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm(form, SCHEMA)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    createRegistration.setError(null)
    setStep('review')
  }

  async function handleConfirm() {
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
      setSubmitted(result)
      setStep('submitted')
      setForm(EMPTY_FORM)
      setErrors({})
      state.reload()
    }
  }

  function handleStartAnother() {
    setSubmitted(null)
    setStep('details')
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Semester Registration"
        description="Re-register each semester to keep an existing grant active."
      />

      {state.loading ? (
        <LoadingList />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <>
          <Alert tone="info" title="This is separate from new scholarship applications">
            Semester registration keeps an existing confirmed grant active for a new term; it is not how you
            apply for a new scholarship.
          </Alert>

          {!hasGrant ? (
            <Alert tone="warning" title="Registration is only available to confirmed grantees">
              Once an administrator confirms a grant record for you, you will be able to submit a semester
              registration here.
              <div className="mt-3">
                <LinkButton to="/student/applications" variant="outline" size="sm">
                  View My Applications
                </LinkButton>
              </div>
            </Alert>
          ) : null}

          {hasGrant ? (
            <div className="space-y-6">
              <StepIndicator current={step} />

              {step === 'details' ? (
                <Card>
                  <CardHeader
                    title="Submit a Semester Registration"
                    description="One registration is allowed per academic year and semester."
                  />
                  <form onSubmit={handleReview} noValidate>
                    <fieldset disabled={createRegistration.loading}>
                      <div className="px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Term</h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Select
                            id="registration-academicYear"
                            label="Academic Year"
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
                        </div>
                      </div>

                      <div className="border-t border-slate-200 px-5 py-4 dark:border-ink-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enrolment</h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                            label="Course or Strand"
                            value={form.course}
                            error={errors.course}
                            required
                            onChange={(event) => setField('course', event.target.value)}
                          />
                          <Select
                            id="registration-yearLevel"
                            label="Year Level"
                            placeholder="Select a year level"
                            options={YEAR_LEVEL_OPTIONS}
                            value={form.yearLevel}
                            error={errors.yearLevel}
                            required
                            onChange={(event) => setField('yearLevel', event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-200 px-5 py-4 dark:border-ink-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Academic Performance</h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Input
                            id="registration-unitsEnrolled"
                            label="Units Enrolled"
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
                            label="GWA for the Semester"
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
                      </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4 dark:border-ink-800">
                      <Button type="submit">Review Registration</Button>
                    </div>
                  </form>
                </Card>
              ) : step === 'review' ? (
                <Card>
                  <CardHeader
                    title="Review Your Registration"
                    description="Check these details before submitting. Nothing is recorded until you submit."
                  />
                  <div className="px-5 py-4">
                    {createRegistration.error ? (
                      <Alert
                        tone="danger"
                        title="We could not submit this registration"
                        className="mb-4"
                      >
                        {createRegistration.error}
                      </Alert>
                    ) : null}
                    <DefinitionList
                      items={[
                        { label: 'Academic Year', value: form.academicYear },
                        { label: 'Semester', value: form.semester },
                        { label: 'School', value: form.school },
                        { label: 'Course or Strand', value: form.course },
                        { label: 'Year Level', value: form.yearLevel },
                        { label: 'Units Enrolled', value: form.unitsEnrolled },
                        {
                          label: 'GWA for the Semester',
                          value: form.gwa.trim() === '' ? 'Not provided' : form.gwa,
                        },
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4 dark:border-ink-800">
                    <Button onClick={() => void handleConfirm()} loading={createRegistration.loading}>
                      Submit registration
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setStep('details')}
                      disabled={createRegistration.loading}
                    >
                      Back to edit
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title="Registration Submitted"
                    description="Your registration is now pending verification."
                  />
                  <div className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        Reference {submitted?.referenceNo}
                      </p>
                      {submitted ? (
                        <StatusBadge kind="registration" status={submitted.status} />
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      An administrator will verify the details you submitted. The status updates on this page
                      once that happens.
                    </p>
                    <Button variant="outline" onClick={handleStartAnother}>
                      Submit Another Registration
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          ) : null}

          <Section
            title="Past Registrations"
            description="Registrations you have submitted, most recent first."
          >
            {registrations.length === 0 ? (
              <EmptyState
                title="No Semester Registrations Yet"
                description="Once you are a confirmed grantee, submit a registration each semester to keep your grant active."
              />
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                {registrations.map((registration) => (
                  <li key={registration.id} className="space-y-1 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {registration.referenceNo}
                      </p>
                      <StatusBadge kind="registration" status={registration.status} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {registration.academicYear} · {registration.semester} · {registration.school} ·{' '}
                      {registration.unitsEnrolled} units · GWA{' '}
                      {registration.gwa === null ? '—' : registration.gwa.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Submitted {formatDate(registration.submittedAt)}
                    </p>
                    {registration.remarks ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Remarks: {registration.remarks}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  )
}
