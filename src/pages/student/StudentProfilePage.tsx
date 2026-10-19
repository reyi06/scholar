import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  DefinitionList,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingState,
  PageHeader,
  Section,
  Select,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { EmailVerificationSection } from '../../components/EmailVerificationSection.tsx'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { studentsApi } from '../../lib/api.ts'
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  MUNICIPALITIES_ONLY,
  YEAR_LEVELS,
} from '../../lib/constants.ts'
import { formatCurrency, formatDate } from '../../lib/format.ts'
import {
  decimalBetween,
  hasErrors,
  numberBetween,
  phoneFormat,
  required,
  validateForm,
  type FormErrors,
  type Validator,
} from '../../lib/validation.ts'
import type { EducationLevel, StudentProfile } from '../../types/index.ts'

type ProfileFormValues = {
  studentNumber: string
  phone: string
  municipality: string
  barangay: string
  address: string
  birthDate: string
  educationLevel: string
  school: string
  course: string
  yearLevel: string
  gwa: string
  householdIncome: string
  guardianName: string
  guardianContact: string
}

type AccountFormValues = {
  firstName: string
  lastName: string
}

const EMPTY_PROFILE: ProfileFormValues = {
  studentNumber: '',
  phone: '',
  municipality: '',
  barangay: '',
  address: '',
  birthDate: '',
  educationLevel: '',
  school: '',
  course: '',
  yearLevel: '',
  gwa: '',
  householdIncome: '',
  guardianName: '',
  guardianContact: '',
}

const PROFILE_SCHEMA: Partial<Record<keyof ProfileFormValues, Validator[]>> = {
  studentNumber: [required('Student number')],
  phone: [required('Phone number'), phoneFormat()],
  municipality: [required('Municipality')],
  barangay: [required('Barangay')],
  address: [required('Address')],
  birthDate: [required('Birth date')],
  educationLevel: [required('Education level')],
  school: [required('School')],
  course: [required('Course')],
  yearLevel: [required('Year level')],
  gwa: [decimalBetween(1, 5, 'GWA')],
  householdIncome: [numberBetween(0, 10000000, 'Household income')],
  guardianName: [required('Guardian name')],
  guardianContact: [phoneFormat()],
}

const ACCOUNT_SCHEMA: Partial<Record<keyof AccountFormValues, Validator[]>> = {
  firstName: [required('First name')],
  lastName: [required('Last name')],
}

const MUNICIPALITY_OPTIONS = MUNICIPALITIES_ONLY.map((name) => ({ value: name, label: name }))
const EDUCATION_LEVEL_OPTIONS = EDUCATION_LEVELS.map((option) => ({
  value: option.value,
  label: option.label,
}))
const YEAR_LEVEL_OPTIONS = YEAR_LEVELS.map((level) => ({ value: level, label: level }))

function toFormValues(profile: StudentProfile): ProfileFormValues {
  return {
    studentNumber: profile.studentNumber,
    phone: profile.phone,
    municipality: profile.municipality,
    barangay: profile.barangay,
    address: profile.address,
    birthDate: profile.birthDate,
    educationLevel: profile.educationLevel,
    school: profile.school,
    course: profile.course,
    yearLevel: profile.yearLevel,
    gwa: profile.gwa === null ? '' : String(profile.gwa),
    householdIncome: profile.householdIncome === null ? '' : String(profile.householdIncome),
    guardianName: profile.guardianName,
    guardianContact: profile.guardianContact,
  }
}

/**
 * Student profile.
 *
 * Read-only by default: the saved details are a summary, and editing is an
 * explicit mode so the page does not present a wall of empty inputs. The
 * account name is a separate, smaller concern and has its own edit action.
 */
export function StudentProfilePage() {
  useDocumentTitle('My Profile')
  const { user, refresh } = useAuth()
  const toast = useToast()
  const userId = user?.id ?? ''

  const [editingProfile, setEditingProfile] = useState(false)
  const [editingAccount, setEditingAccount] = useState(false)
  const [form, setForm] = useState<ProfileFormValues>(EMPTY_PROFILE)
  const [errors, setErrors] = useState<FormErrors<ProfileFormValues>>({})
  // The session is available synchronously, so the account fields can be
  // initialised directly rather than synced with an effect.
  const [account, setAccount] = useState<AccountFormValues>(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  }))
  const [accountErrors, setAccountErrors] = useState<FormErrors<AccountFormValues>>({})

  const profile = useAsync(() => studentsApi.profile(userId), [userId], {
    // Seed the editable form when the saved profile arrives. Doing this in the
    // load callback avoids the extra render pass a watching effect causes.
    onSuccess: (loaded) => {
      if (loaded) setForm(toFormValues(loaded))
    },
  })

  const saveProfile = useAsyncAction((patch: Partial<StudentProfile>) =>
    studentsApi.updateProfile(userId, patch),
  )
  const saveAccount = useAsyncAction((patch: AccountFormValues) =>
    studentsApi.updateAccount(userId, patch),
  )

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to view and edit your profile."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const currentProfile = profile.data

  function setField<K extends keyof ProfileFormValues>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startProfileEdit() {
    if (currentProfile) setForm(toFormValues(currentProfile))
    setErrors({})
    saveProfile.setError(null)
    setEditingProfile(true)
  }

  function cancelProfileEdit() {
    if (currentProfile) setForm(toFormValues(currentProfile))
    setErrors({})
    setEditingProfile(false)
  }

  function startAccountEdit() {
    setAccount({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' })
    setAccountErrors({})
    saveAccount.setError(null)
    setEditingAccount(true)
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm(form, PROFILE_SCHEMA)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    const result = await saveProfile.run({
      studentNumber: form.studentNumber.trim(),
      phone: form.phone.trim(),
      municipality: form.municipality,
      barangay: form.barangay.trim(),
      address: form.address.trim(),
      birthDate: form.birthDate,
      educationLevel: form.educationLevel as EducationLevel,
      school: form.school.trim(),
      course: form.course.trim(),
      yearLevel: form.yearLevel,
      gwa: form.gwa.trim() === '' ? null : Number(form.gwa),
      householdIncome: form.householdIncome.trim() === '' ? null : Number(form.householdIncome),
      guardianName: form.guardianName.trim(),
      guardianContact: form.guardianContact.trim(),
    })
    if (result) {
      setEditingProfile(false)
      toast.success('Profile updated', 'Your profile details have been saved.')
      profile.reload()
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateForm(account, ACCOUNT_SCHEMA)
    setAccountErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    const result = await saveAccount.run({
      firstName: account.firstName.trim(),
      lastName: account.lastName.trim(),
    })
    if (result) {
      refresh()
      setEditingAccount(false)
      toast.success('Account name updated', 'Your account now shows the new name.')
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="My Profile"
        description={`Keep your student details up to date, ${user.firstName}. Accurate information helps with eligibility checks.`}
        actions={!editingProfile ? <Button onClick={startProfileEdit}>Edit Profile</Button> : undefined}
      />

      {profile.loading ? (
        <LoadingState label="Loading your profile…" />
      ) : profile.error ? (
        <ErrorState message={profile.error} onRetry={profile.reload} />
      ) : editingProfile ? (
        <form
          onSubmit={(event) => void handleProfileSubmit(event)}
          noValidate
          className="space-y-10"
        >
          {saveProfile.error ? (
            <Alert tone="danger" title="We could not save your profile">
              {saveProfile.error}
            </Alert>
          ) : null}

          <Section divider={false} title="Personal Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="profile-studentNumber"
                label="Student Number"
                value={form.studentNumber}
                error={errors.studentNumber}
                required
                onChange={(event) => setField('studentNumber', event.target.value)}
              />
              <Input
                id="profile-phone"
                label="Mobile or Landline"
                value={form.phone}
                error={errors.phone}
                required
                onChange={(event) => setField('phone', event.target.value)}
              />
              <Input
                id="profile-birthDate"
                label="Birth Date"
                type="date"
                value={form.birthDate}
                error={errors.birthDate}
                required
                onChange={(event) => setField('birthDate', event.target.value)}
              />
              <Select
                id="profile-municipality"
                label="Municipality or City"
                placeholder="Select a municipality"
                options={MUNICIPALITY_OPTIONS}
                value={form.municipality}
                error={errors.municipality}
                required
                onChange={(event) => setField('municipality', event.target.value)}
              />
              <Input
                id="profile-barangay"
                label="Barangay"
                value={form.barangay}
                error={errors.barangay}
                required
                onChange={(event) => setField('barangay', event.target.value)}
              />
              <Input
                id="profile-address"
                label="Address"
                value={form.address}
                error={errors.address}
                required
                className="sm:col-span-2"
                onChange={(event) => setField('address', event.target.value)}
              />
            </div>
          </Section>

          <Section title="Enrolment">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="profile-educationLevel"
                label="Education Level"
                placeholder="Select an education level"
                options={EDUCATION_LEVEL_OPTIONS}
                value={form.educationLevel}
                error={errors.educationLevel}
                required
                onChange={(event) => setField('educationLevel', event.target.value)}
              />
              <Input
                id="profile-school"
                label="School"
                value={form.school}
                error={errors.school}
                required
                onChange={(event) => setField('school', event.target.value)}
              />
              <Input
                id="profile-course"
                label="Course or Strand"
                value={form.course}
                error={errors.course}
                required
                onChange={(event) => setField('course', event.target.value)}
              />
              <Select
                id="profile-yearLevel"
                label="Year Level"
                placeholder="Select a year level"
                options={YEAR_LEVEL_OPTIONS}
                value={form.yearLevel}
                error={errors.yearLevel}
                required
                onChange={(event) => setField('yearLevel', event.target.value)}
              />
              <Input
                id="profile-gwa"
                label="General Weighted Average"
                type="number"
                step="0.01"
                min="1"
                max="5"
                value={form.gwa}
                error={errors.gwa}
                hint="Philippine scale, 1.00 (best) to 5.00."
                onChange={(event) => setField('gwa', event.target.value)}
              />
              <Input
                id="profile-householdIncome"
                label="Annual Household Income (PHP)"
                type="number"
                step="1000"
                min="0"
                value={form.householdIncome}
                error={errors.householdIncome}
                onChange={(event) => setField('householdIncome', event.target.value)}
              />
            </div>
          </Section>

          <Section title="Guardian & Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="profile-guardianName"
                label="Guardian Name"
                value={form.guardianName}
                error={errors.guardianName}
                required
                onChange={(event) => setField('guardianName', event.target.value)}
              />
              <Input
                id="profile-guardianContact"
                label="Guardian Contact Number"
                value={form.guardianContact}
                error={errors.guardianContact}
                onChange={(event) => setField('guardianContact', event.target.value)}
              />
            </div>
          </Section>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-6 dark:border-ink-800">
            <Button type="submit" loading={saveProfile.loading}>
              Save Profile
            </Button>
            <Button type="button" variant="outline" onClick={cancelProfileEdit}>
              Cancel
            </Button>
          </div>
        </form>
      ) : currentProfile ? (
        <div className="space-y-10">
          <Section divider={false} title="Personal Details">
            <DefinitionList
              items={[
                { label: 'Student Number', value: currentProfile.studentNumber || '—' },
                { label: 'Phone', value: currentProfile.phone || '—' },
                { label: 'Birth Date', value: currentProfile.birthDate || '—' },
                { label: 'Municipality or City', value: currentProfile.municipality || '—' },
                { label: 'Barangay', value: currentProfile.barangay || '—' },
                { label: 'Address', value: currentProfile.address || '—', wide: true },
                { label: 'Last Updated', value: formatDate(currentProfile.updatedAt), wide: true },
              ]}
            />
          </Section>

          <EmailVerificationSection />

          <Section title="Enrolment">
            <DefinitionList
              items={[
                {
                  label: 'Education Level',
                  value: EDUCATION_LEVEL_LABELS[currentProfile.educationLevel],
                },
                { label: 'School', value: currentProfile.school || '—' },
                { label: 'Course or Strand', value: currentProfile.course || '—' },
                { label: 'Year Level', value: currentProfile.yearLevel || '—' },
                {
                  label: 'GWA',
                  value: currentProfile.gwa === null ? '—' : currentProfile.gwa.toFixed(2),
                },
                { label: 'Household Income', value: formatCurrency(currentProfile.householdIncome) },
              ]}
            />
          </Section>

          <Section title="Guardian & Contact">
            <DefinitionList
              items={[
                { label: 'Guardian', value: currentProfile.guardianName || '—' },
                { label: 'Guardian Contact', value: currentProfile.guardianContact || '—' },
              ]}
            />
          </Section>
        </div>
      ) : (
        <EmptyState
          title="No Student Profile Yet"
          description="Add your details so they can be recorded and checked for eligibility."
          action={<Button onClick={startProfileEdit}>Add My Details</Button>}
        />
      )}

      <Section
        title="Account"
        description="The name attached to your sign-in. Changing it does not affect your saved records."
      >
        {editingAccount ? (
          <form
            onSubmit={(event) => void handleAccountSubmit(event)}
            noValidate
            className="space-y-4"
          >
            {saveAccount.error ? <Alert tone="danger">{saveAccount.error}</Alert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="account-firstName"
                label="First Name"
                value={account.firstName}
                error={accountErrors.firstName}
                required
                onChange={(event) =>
                  setAccount((current) => ({ ...current, firstName: event.target.value }))
                }
              />
              <Input
                id="account-lastName"
                label="Last Name"
                value={account.lastName}
                error={accountErrors.lastName}
                required
                onChange={(event) =>
                  setAccount((current) => ({ ...current, lastName: event.target.value }))
                }
              />
              <Input
                id="account-email"
                label="Email"
                value={user.email}
                readOnly
                hint="Contact support to change the email on your account."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={saveAccount.loading}>
                Save Account Name
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAccount(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <DefinitionList
              items={[
                { label: 'Name', value: `${user.firstName} ${user.lastName}` },
                { label: 'Email', value: user.email },
              ]}
            />
            <Button variant="outline" size="sm" onClick={startAccountEdit}>
              Edit Account
            </Button>
          </div>
        )}
      </Section>
    </div>
  )
}
