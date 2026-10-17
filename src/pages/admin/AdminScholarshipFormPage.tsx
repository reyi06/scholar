import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingState,
  PageHeader,
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
  { value: 'internal', label: 'Applications submitted on this site' },
  { value: 'external', label: 'Applications handled by the provider' },
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
 * listing is loaded and edited, otherwise a blank form is shown. Validation runs
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
      <div className="space-y-6">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <LoadingState label="Loading scholarship…" />
      </div>
    )
  }

  if (isEdit && scholarshipState.error) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <ErrorState message={scholarshipState.error} onRetry={scholarshipState.reload} />
      </div>
    )
  }

  if (isEdit && !scholarshipState.data) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <EmptyState
          title="That scholarship listing was not found"
          description="It may have been deleted. Return to the register to pick another listing."
          action={<LinkButton to="/admin/scholarships">Back to scholarships</LinkButton>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Provide clear, verified details. Listing content stays placeholder until confirmed with the provider."
        breadcrumbs={breadcrumbs}
      />

      <Alert tone="info" title="Placeholder content until verified">
        Anything entered here is sample content for this prototype. It does not represent a real
        partnership, benefit or eligibility rule until the provider confirms it. Verify every detail
        before publishing.
      </Alert>

      {submitAction.error ? (
        <Alert tone="danger" title="We could not save this listing">
          {submitAction.error}
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader title="Listing details" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="scholarship-name"
              label="Scholarship name"
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
            <Input
              id="scholarship-deadline"
              label="Application deadline"
              type="date"
              required
              value={form.deadline}
              error={errors.deadline}
              onChange={(event) => update('deadline', event.target.value)}
            />
            <Select
              id="scholarship-status"
              label="Status"
              required
              options={STATUS_OPTIONS}
              value={form.status}
              error={errors.status}
              onChange={(event) => update('status', event.target.value as ScholarshipStatus)}
            />
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
            <div className="sm:col-span-2">
              <Checkbox
                id="scholarship-featured"
                label="Feature this listing on the home page"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Education levels"
            description="Select every level this scholarship is open to. At least one is required."
          />
          <CardBody className="space-y-2">
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
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Benefits, eligibility and requirements"
            description="Enter one item per line. Each line becomes a separate bullet."
          />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Textarea
              id="scholarship-requirements"
              label="Requirements"
              rows={4}
              value={form.requirements}
              hint="One item per line. Document upload is not implemented in this demo."
              onChange={(event) => update('requirements', event.target.value)}
            />
            <Textarea
              id="scholarship-instructions"
              label="Application instructions"
              rows={4}
              value={form.instructions}
              hint="One item per line."
              onChange={(event) => update('instructions', event.target.value)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="How students apply" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="scholarship-application-mode"
              label="Application mode"
              required
              options={APPLICATION_MODE_OPTIONS}
              value={form.applicationMode}
              error={errors.applicationMode}
              onChange={(event) => update('applicationMode', event.target.value as ApplicationMode)}
            />
            {form.applicationMode === 'external' ? (
              <Input
                id="scholarship-external-url"
                label="External application link"
                type="url"
                required
                placeholder="https://"
                value={form.externalUrl}
                error={errors.externalUrl}
                hint="Applications on an external site are not tracked here."
                onChange={(event) => update('externalUrl', event.target.value)}
              />
            ) : null}
            <Input
              id="scholarship-contact-person"
              label="Contact person"
              value={form.contactPerson}
              onChange={(event) => update('contactPerson', event.target.value)}
            />
            <Input
              id="scholarship-contact-email"
              label="Contact email"
              type="email"
              value={form.contactEmail}
              error={errors.contactEmail}
              onChange={(event) => update('contactEmail', event.target.value)}
            />
            <Input
              id="scholarship-contact-phone"
              label="Contact phone"
              type="tel"
              value={form.contactPhone}
              error={errors.contactPhone}
              onChange={(event) => update('contactPhone', event.target.value)}
            />
            <Input
              id="scholarship-contact-address"
              label="Contact address"
              value={form.contactAddress}
              onChange={(event) => update('contactAddress', event.target.value)}
            />
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <LinkButton to="/admin/scholarships" variant="outline">
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
