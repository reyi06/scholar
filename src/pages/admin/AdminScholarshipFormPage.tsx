import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingState,
  PageHeader,
  Section,
  Select,
  type SelectOption,
  Textarea,
} from '../../components/ui'
import { scholarshipsApi, type ScholarshipInput } from '../../lib/api.ts'
import {
  EDUCATION_LEVELS,
  MUNICIPALITIES,
  SCHOLARSHIP_STATUSES,
  SCHOLARSHIP_TYPES,
} from '../../lib/constants.ts'
import {
  atLeastOne,
  emailFormat,
  futureDate,
  hasErrors,
  minLength,
  phoneFormat,
  required,
  urlFormat,
  validateForm,
  type FormErrors,
  type Validator,
} from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import type {
  ApplicationMode,
  EducationLevel,
  ScholarshipStatus,
  ScholarshipType,
} from '../../types/index.ts'

const TYPE_OPTIONS: SelectOption[] = SCHOLARSHIP_TYPES.map((option) => ({
  value: option.value,
  label: option.label,
}))

const MUNICIPALITY_OPTIONS: SelectOption[] = MUNICIPALITIES.map((name) => ({
  value: name,
  label: name,
}))

const STATUS_OPTIONS: SelectOption[] = SCHOLARSHIP_STATUSES.map((option) => ({
  value: option.value,
  label: option.label,
}))

const APPLICATION_MODE_OPTIONS: SelectOption[] = [
  { value: 'internal', label: 'Applications Submitted on This Site' },
  { value: 'external', label: 'Applications Handled by the Provider' },
]

/** Raw form state. List fields stay as newline/comma text until submit. */
interface FormState {
  name: string
  provider: string
  type: ScholarshipType
  municipality: string
  educationLevels: EducationLevel[]
  description: string
  benefits: string
  eligibility: string
  requirements: string
  instructions: string
  deadline: string
  applicationMode: ApplicationMode
  externalUrl: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  status: ScholarshipStatus
  featured: boolean
  tags: string
}

/** The string subset that flows through `validateForm`. */
type FormValues = {
  name: string
  provider: string
  type: string
  municipality: string
  description: string
  deadline: string
  applicationMode: string
  externalUrl: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  status: string
  tags: string
  benefits: string
  eligibility: string
  requirements: string
  instructions: string
}

const EMPTY_FORM: FormState = {
  name: '',
  provider: '',
  type: 'provincial',
  municipality: MUNICIPALITIES[0],
  educationLevels: [],
  description: '',
  benefits: '',
  eligibility: '',
  requirements: '',
  instructions: '',
  deadline: '',
  applicationMode: 'internal',
  externalUrl: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  status: 'draft',
  featured: false,
  tags: '',
}

/** Split a textarea into a clean list, one item per line. */
function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Split a comma-separated input into clean tags. */
function toTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/**
 * Create or edit a scholarship listing.
 *
 * The same page serves both modes: when the route carries an `:id` the existing
 * listing is loaded and edited, otherwise a blank form is shown. The long form
 * is grouped into titled sections rather than a stack of boxes. Validation runs
 * on submit and every failure is surfaced inline on the field it belongs to.
 */
export function AdminScholarshipFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  useDocumentTitle(isEdit ? 'Edit scholarship' : 'New scholarship')

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors<FormValues>>({})
  const [educationError, setEducationError] = useState<string | undefined>(undefined)

  const scholarshipState = useAsync(
    () => (id ? scholarshipsApi.get(id) : Promise.resolve(null)),
    [id],
    {
      // Populate the form once an existing listing arrives. Keeping this in the
      // load callback avoids the extra render pass a watching effect causes.
      onSuccess: (existingListing) => {
        if (!existingListing) return
        setForm({
          name: existingListing.name,
          provider: existingListing.provider,
          type: existingListing.type,
          municipality: existingListing.municipality,
          educationLevels: existingListing.educationLevels,
          description: existingListing.description,
          benefits: existingListing.benefits.join('\n'),
          eligibility: existingListing.eligibility.join('\n'),
          requirements: existingListing.requirements.join('\n'),
          instructions: existingListing.instructions.join('\n'),
          deadline: existingListing.deadline,
          applicationMode: existingListing.applicationMode,
          externalUrl: existingListing.externalUrl ?? '',
          contactPerson: existingListing.contact.person ?? '',
          contactEmail: existingListing.contact.email ?? '',
          contactPhone: existingListing.contact.phone ?? '',
          contactAddress: existingListing.contact.address ?? '',
          status: existingListing.status,
          featured: existingListing.featured,
          tags: existingListing.tags.join(', '),
        })
      },
    },
  )

  const submitAction = useAsyncAction(async (input: ScholarshipInput) => {
    if (id) {
      await scholarshipsApi.update(id, input)
    } else {
      await scholarshipsApi.create(input)
    }
    return true
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleLevel(level: EducationLevel) {
    setForm((current) => {
      const selected = current.educationLevels.includes(level)
      return {
        ...current,
        educationLevels: selected
          ? current.educationLevels.filter((item) => item !== level)
          : [...current.educationLevels, level],
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const values: FormValues = {
      name: form.name,
      provider: form.provider,
      type: form.type,
      municipality: form.municipality,
      description: form.description,
      deadline: form.deadline,
      applicationMode: form.applicationMode,
      externalUrl: form.externalUrl,
      contactPerson: form.contactPerson,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      contactAddress: form.contactAddress,
      status: form.status,
      tags: form.tags,
      benefits: form.benefits,
      eligibility: form.eligibility,
      requirements: form.requirements,
      instructions: form.instructions,
    }

    const schema: Partial<Record<keyof FormValues, Validator[]>> = {
      name: [required('Scholarship name')],
      provider: [required('Provider')],
      type: [required('Type')],
      municipality: [required('Municipality')],
      description: [required('Description'), minLength(30, 'Description')],
      deadline: [required('Deadline'), futureDate('Deadline')],
      applicationMode: [required('Application mode')],
      externalUrl:
        form.applicationMode === 'external'
          ? [required('External link'), urlFormat()]
          : [urlFormat()],
      contactEmail: [emailFormat()],
      contactPhone: [phoneFormat()],
      status: [required('Status')],
    }

    const nextErrors = validateForm(values, schema)
    const levelError = atLeastOne(form.educationLevels, 'education level')
    setErrors(nextErrors)
    setEducationError(levelError)

    if (hasErrors(nextErrors) || levelError) return

    const input: ScholarshipInput = {
      name: form.name.trim(),
      provider: form.provider.trim(),
      type: form.type,
      municipality: form.municipality,
      educationLevels: form.educationLevels,
      description: form.description.trim(),
      benefits: toLines(form.benefits),
      eligibility: toLines(form.eligibility),
      requirements: toLines(form.requirements),
      instructions: toLines(form.instructions),
      deadline: form.deadline,
      applicationMode: form.applicationMode,
      externalUrl: form.applicationMode === 'external' ? form.externalUrl.trim() : undefined,
      contact: {
        person: form.contactPerson.trim(),
        email: form.contactEmail.trim(),
        phone: form.contactPhone.trim(),
        address: form.contactAddress.trim(),
      },
      status: form.status,
      featured: form.featured,
      tags: toTags(form.tags),
    }

    const ok = await submitAction.run(input)
    if (ok) {
      toast.success(
        isEdit ? 'Scholarship updated' : 'Scholarship created',
        'Demo mode: this change is stored in your browser only.',
      )
      navigate('/admin/scholarships')
    }
  }

  const title = isEdit ? 'Edit scholarship' : 'New scholarship'
  const breadcrumbs = [
    { label: 'Scholarships', to: '/admin/scholarships' },
    { label: isEdit ? 'Edit' : 'New' },
  ]

  if (isEdit && scholarshipState.loading) {
    return (
      <div className="space-y-10">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <LoadingState label="Loading scholarship…" />
      </div>
    )
  }

  if (isEdit && scholarshipState.error) {
    return (
      <div className="space-y-10">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <ErrorState message={scholarshipState.error} onRetry={scholarshipState.reload} />
      </div>
    )
  }

  if (isEdit && !scholarshipState.data) {
    return (
      <div className="space-y-10">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <EmptyState
          title="That Scholarship Listing Was Not Found"
          description="It may have been deleted. Return to the register to pick another listing."
          action={<LinkButton to="/admin/scholarships">Back to Scholarships</LinkButton>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={title}
        description="Provide clear, accurate details. Students rely on this information when deciding whether to apply."
        breadcrumbs={breadcrumbs}
      />

      {submitAction.error ? (
        <Alert tone="danger" title="We could not save this listing">
          {submitAction.error}
        </Alert>
      ) : null}

      <form className="space-y-10" onSubmit={handleSubmit} noValidate>
        <Section
          divider={false}
          title="Basics"
          description="How the listing is named, who provides it and where it applies."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="scholarship-name"
              label="Scholarship Name"
              required
              value={form.name}
              error={errors.name}
              className="sm:col-span-2"
              onChange={(event) => update('name', event.target.value)}
            />
            <Input
              id="scholarship-provider"
              label="Provider"
              required
              value={form.provider}
              error={errors.provider}
              onChange={(event) => update('provider', event.target.value)}
            />
            <Select
              id="scholarship-type"
              label="Type"
              required
              options={TYPE_OPTIONS}
              value={form.type}
              error={errors.type}
              onChange={(event) => update('type', event.target.value as ScholarshipType)}
            />
            <Select
              id="scholarship-municipality"
              label="Municipality"
              required
              options={MUNICIPALITY_OPTIONS}
              value={form.municipality}
              error={errors.municipality}
              onChange={(event) => update('municipality', event.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Coverage"
          description="The education levels this scholarship is open to."
        >
          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Education levels
              <span className="ml-1 text-rose-600 dark:text-rose-400" aria-hidden="true">
                *
              </span>
            </legend>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select every level this scholarship is open to. At least one is required.
            </p>
            <div className="mt-3 space-y-2">
              {EDUCATION_LEVELS.map((option, index) => (
                <Checkbox
                  key={option.value}
                  id={`scholarship-level-${option.value}`}
                  label={option.label}
                  checked={form.educationLevels.includes(option.value)}
                  error={index === 0 ? educationError : undefined}
                  onChange={() => toggleLevel(option.value)}
                />
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Details" description="The summary students read first, and how the listing is found.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              id="scholarship-description"
              label="Description"
              required
              rows={5}
              value={form.description}
              error={errors.description}
              hint="Explain what the scholarship offers and who it is for."
              className="sm:col-span-2"
              onChange={(event) => update('description', event.target.value)}
            />
            <Input
              id="scholarship-tags"
              label="Tags"
              value={form.tags}
              hint="Comma-separated keywords, e.g. STEM, financial aid, Pampanga."
              className="sm:col-span-2"
              onChange={(event) => update('tags', event.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Benefits and Eligibility"
          description="Enter one item per line. Each line becomes a separate bullet."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              id="scholarship-benefits"
              label="Benefits"
              rows={4}
              value={form.benefits}
              hint="One item per line."
              onChange={(event) => update('benefits', event.target.value)}
            />
            <Textarea
              id="scholarship-eligibility"
              label="Eligibility"
              rows={4}
              value={form.eligibility}
              hint="One item per line."
              onChange={(event) => update('eligibility', event.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Requirements"
          description="What an applicant must submit or prepare. One item per line."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              id="scholarship-requirements"
              label="Requirements"
              rows={4}
              value={form.requirements}
              hint="One item per line."
              onChange={(event) => update('requirements', event.target.value)}
            />
            <Textarea
              id="scholarship-instructions"
              label="Application Instructions"
              rows={4}
              value={form.instructions}
              hint="One item per line."
              onChange={(event) => update('instructions', event.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Application"
          description="When applications close, and how they are submitted."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="scholarship-deadline"
              label="Application Deadline"
              type="date"
              required
              value={form.deadline}
              error={errors.deadline}
              onChange={(event) => update('deadline', event.target.value)}
            />
            <Select
              id="scholarship-application-mode"
              label="Application Mode"
              required
              options={APPLICATION_MODE_OPTIONS}
              value={form.applicationMode}
              error={errors.applicationMode}
              onChange={(event) => update('applicationMode', event.target.value as ApplicationMode)}
            />
            {form.applicationMode === 'external' ? (
              <Input
                id="scholarship-external-url"
                label="External Application Link"
                type="url"
                required
                placeholder="https://"
                value={form.externalUrl}
                error={errors.externalUrl}
                hint="Applications on an external site are not tracked here."
                className="sm:col-span-2"
                onChange={(event) => update('externalUrl', event.target.value)}
              />
            ) : null}
          </div>
        </Section>

        <Section
          title="Contact"
          description="Who a student should reach out to with questions."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="scholarship-contact-person"
              label="Contact Person"
              value={form.contactPerson}
              onChange={(event) => update('contactPerson', event.target.value)}
            />
            <Input
              id="scholarship-contact-email"
              label="Contact Email"
              type="email"
              value={form.contactEmail}
              error={errors.contactEmail}
              onChange={(event) => update('contactEmail', event.target.value)}
            />
            <Input
              id="scholarship-contact-phone"
              label="Contact Phone"
              type="tel"
              value={form.contactPhone}
              error={errors.contactPhone}
              onChange={(event) => update('contactPhone', event.target.value)}
            />
            <Input
              id="scholarship-contact-address"
              label="Contact Address"
              value={form.contactAddress}
              onChange={(event) => update('contactAddress', event.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Publishing"
          description="Whether the listing is live, and whether it is highlighted on the home page."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="scholarship-status"
              label="Status"
              required
              options={STATUS_OPTIONS}
              value={form.status}
              error={errors.status}
              onChange={(event) => update('status', event.target.value as ScholarshipStatus)}
            />
          </div>
          <div className="mt-4">
            <Checkbox
              id="scholarship-featured"
              label="Feature This Listing on the Home Page"
              checked={form.featured}
              onChange={(event) => update('featured', event.target.checked)}
            />
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-6 dark:border-ink-800">
          <LinkButton to="/admin/scholarships" variant="ghost">
            Cancel
          </LinkButton>
          <Button type="submit" loading={submitAction.loading}>
            {isEdit ? 'Save changes' : 'Create scholarship'}
          </Button>
        </div>
      </form>
    </div>
  )
}
