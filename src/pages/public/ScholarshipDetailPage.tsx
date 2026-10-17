import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { DeadlineBadge } from '../../components/DeadlineBadge.tsx'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DefinitionList,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  PageHeader,
  SampleDataNotice,
  Textarea,
} from '../../components/ui'
import { applicationsApi, scholarshipsApi } from '../../lib/api.ts'
import { EDUCATION_LEVEL_LABELS, SCHOLARSHIP_TYPE_LABELS } from '../../lib/constants.ts'
import { formatDate, truncate } from '../../lib/format.ts'
import { hasErrors, minLength, required, validateForm, type FormErrors } from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useSavedScholarships } from '../../hooks/useSavedScholarships.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'

interface ApplicationFormValues {
  motivation: string
}

/** Renders a list of plain strings as a bulleted list, or a muted fallback. */
function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-300">
          <Icon name="check" className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

export function ScholarshipDetailPage() {
  const { id = '' } = useParams()
  const { user, isStudent } = useAuth()
  const toast = useToast()
  const { savedIds, toggle } = useSavedScholarships()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [values, setValues] = useState<ApplicationFormValues>({ motivation: '' })
  const [errors, setErrors] = useState<FormErrors<ApplicationFormValues>>({})
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)

  const { data: scholarship, loading, error, reload } = useAsync(() => scholarshipsApi.get(id), [id])

  const {
    data: existingApplication,
    loading: applicationLoading,
    reload: reloadApplication,
  } = useAsync(
    () =>
      user && isStudent
        ? applicationsApi.findForStudentAndScholarship(user.id, id)
        : Promise.resolve(null),
    [user?.id, id, isStudent],
  )

  const { run: submitApplication, loading: submitting } = useAsyncAction(
    async (asDraft: boolean) => {
      if (!user) throw new Error('You need to be signed in to apply.')
      return applicationsApi.create(
        user.id,
        {
          scholarshipId: id,
          motivation: values.motivation.trim(),
          documentNames: selectedDocs,
          responses: [
            { label: 'Documents ready for submission', value: asDraft ? 'Not yet' : 'Yes' },
            { label: 'Information confirmed accurate', value: confirmed ? 'Yes' : 'No' },
          ],
        },
        asDraft,
      )
    },
  )

  useDocumentTitle(scholarship?.name ?? 'Scholarship')

  const handleSubmit = async (asDraft: boolean) => {
    const validationErrors = validateForm(values, {
      motivation: [required('A short statement'), minLength(20, 'Your statement')],
    })
    setErrors(validationErrors)

    if (!asDraft && hasErrors(validationErrors)) return
    if (!asDraft && !confirmed) {
      toast.warning('Please confirm your information', 'Tick the confirmation box before submitting.')
      return
    }

    const result = await submitApplication(asDraft)
    if (!result) return

    setDialogOpen(false)
    setValues({ motivation: '' })
    setSelectedDocs([])
    setConfirmed(false)
    reloadApplication()
    toast.success(
      asDraft ? 'Draft saved' : 'Application submitted',
      asDraft
        ? 'You can complete and submit it from My applications.'
        : `Reference number ${result.referenceNo}. Review usually happens in the order received.`,
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <LoadingState label="Loading scholarship details…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!scholarship) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Icon name="search" className="size-8" />}
          title="Scholarship not found"
          description="This listing may have been removed, or the link may be incorrect."
          action={<LinkButton to="/scholarships">Back to the directory</LinkButton>}
        />
      </div>
    )
  }

  const isOpen = scholarship.status === 'open'
  const isExternal = scholarship.applicationMode === 'external'
  const saved = savedIds.includes(scholarship.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={scholarship.name}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Scholarships', to: '/scholarships' },
          { label: truncate(scholarship.name, 40) },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{SCHOLARSHIP_TYPE_LABELS[scholarship.type]}</Badge>
            <StatusBadge kind="scholarship" status={scholarship.status} size="md" />
            <DeadlineBadge deadline={scholarship.deadline} open={isOpen} />
            <Badge tone="neutral">{scholarship.municipality}</Badge>
            {scholarship.isSample ? <Badge tone="warning">Sample data</Badge> : null}
          </span>
        }
        actions={
          <>
            <Button
              variant={saved ? 'secondary' : 'outline'}
              onClick={() => toggle(scholarship)}
              aria-pressed={saved}
              leadingIcon={<Icon name="star" className="size-4" />}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
            <LinkButton to="/scholarships" variant="ghost">
              Back to directory
            </LinkButton>
          </>
        }
      />

      {scholarship.isSample ? (
        <SampleDataNotice className="mt-6" />
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* --------------------------- Main content --------------------------- */}
        <div className="space-y-6">
          <Section title="About this scholarship">
            <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">
              {scholarship.description}
            </p>
          </Section>

          <Section title="Benefits">
            <BulletList items={scholarship.benefits} emptyLabel="No benefits have been published for this listing." />
          </Section>

          <Section title="Who can apply (eligibility)">
            <BulletList
              items={scholarship.eligibility}
              emptyLabel="Eligibility criteria have not been published for this listing."
            />
          </Section>

          <Section title="Requirements">
            <BulletList
              items={scholarship.requirements}
              emptyLabel="No document requirements have been published for this listing."
            />
          </Section>

          <Section title="How to apply">
            {isExternal ? (
              <div className="space-y-4">
                <Alert tone="info" title="This provider handles its own applications">
                  Applications for this scholarship are processed on the provider's website. This
                  platform lists the opportunity only — it does not receive your submission and cannot
                  track its progress.
                </Alert>
                <BulletList
                  items={scholarship.instructions}
                  emptyLabel="Refer to the provider's website for application instructions."
                />
                {scholarship.externalUrl ? (
                  <a
                    href={scholarship.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                  >
                    <Icon name="external" className="size-4" />
                    Apply on the provider's website
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert tone="info" title="Apply through this platform">
                  Submit your application here and follow its progress from your student dashboard.
                  Approving an application does not by itself release a grant — a grant record has to be
                  confirmed by an administrator.
                </Alert>
                <BulletList
                  items={scholarship.instructions}
                  emptyLabel="No step-by-step instructions have been published for this listing."
                />
              </div>
            )}

            {/* An external link must still be shown if the provider supplied one. */}
            {!isExternal && scholarship.externalUrl ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The provider also publishes information at:
                </p>
                <a
                  href={scholarship.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium break-all text-brand-700 underline underline-offset-2 dark:text-brand-300"
                >
                  <Icon name="external" className="size-4 shrink-0" />
                  {scholarship.externalUrl}
                </a>
              </div>
            ) : null}
          </Section>
        </div>

        {/* ----------------------------- Sidebar ----------------------------- */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Application" />
            <CardBody className="space-y-4">
              {isExternal ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Applications are handled externally by the provider.
                  </p>
                  {scholarship.externalUrl ? (
                    <a
                      href={scholarship.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Icon name="external" className="size-4" />
                      Open provider website
                    </a>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      No provider link has been supplied for this listing yet.
                    </p>
                  )}
                </>
              ) : applicationLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Checking your applications…</p>
              ) : existingApplication ? (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      You already have an application for this scholarship.
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge kind="application" status={existingApplication.status} size="md" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {existingApplication.referenceNo}
                      </span>
                    </div>
                  </div>
                  <LinkButton to={`/student/applications/${existingApplication.id}`} fullWidth>
                    View your application
                  </LinkButton>
                </>
              ) : !user ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Sign in to your student account to apply and track your progress.
                  </p>
                  <LinkButton to="/login" fullWidth>
                    Sign in to apply
                  </LinkButton>
                  <LinkButton to="/register" variant="outline" fullWidth>
                    Create an account
                  </LinkButton>
                </>
              ) : !isStudent ? (
                <Alert tone="warning" title="Student accounts only">
                  Administrator accounts cannot submit scholarship applications.
                </Alert>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {isOpen
                      ? 'Prepare your statement and start your application. You can save a draft and finish it later.'
                      : 'This listing is not currently accepting applications.'}
                  </p>
                  <Button
                    fullWidth
                    disabled={!isOpen}
                    onClick={() => {
                      setValues({ motivation: '' })
                      setErrors({})
                      setDialogOpen(true)
                    }}
                  >
                    {isOpen ? 'Start application' : 'Applications closed'}
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="At a glance" />
            <CardBody>
              <DefinitionList
                columns={1}
                items={[
                  { label: 'Provider', value: scholarship.provider },
                  { label: 'Deadline', value: formatDate(scholarship.deadline) },
                  { label: 'Coverage area', value: scholarship.municipality },
                  {
                    label: 'Education level',
                    value: scholarship.educationLevels
                      .map((level) => EDUCATION_LEVEL_LABELS[level])
                      .join(', '),
                  },
                  {
                    label: 'Application method',
                    value: isExternal ? 'External provider website' : 'Through this platform',
                  },
                  {
                    label: 'Last updated',
                    value: formatDate(scholarship.updatedAt),
                  },
                ]}
              />
              {scholarship.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200 pt-4 dark:border-slate-800">
                  {scholarship.tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Contact details" description="Provided by the scholarship provider." />
            <CardBody className="space-y-3 text-sm">
              {scholarship.contact.person ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Contact person</span>
                  {scholarship.contact.person}
                </p>
              ) : null}
              {scholarship.contact.email ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Email</span>
                  <a
                    href={`mailto:${scholarship.contact.email}`}
                    className="break-all text-brand-700 underline underline-offset-2 dark:text-brand-300"
                  >
                    {scholarship.contact.email}
                  </a>
                </p>
              ) : null}
              {scholarship.contact.phone ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Telephone</span>
                  {scholarship.contact.phone}
                </p>
              ) : null}
              {scholarship.contact.address ? (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Address</span>
                  {scholarship.contact.address}
                </p>
              ) : null}
              {!scholarship.contact.person &&
              !scholarship.contact.email &&
              !scholarship.contact.phone &&
              !scholarship.contact.address ? (
                <p className="text-slate-500 dark:text-slate-400">
                  No contact details have been published for this listing.
                </p>
              ) : null}
              <p className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Always verify contact details with the official provider before sending personal
                information.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Looking for something else?{' '}
                <Link to="/scholarships" className="font-medium text-brand-700 dark:text-brand-300">
                  Browse all scholarships
                </Link>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* --------------------------- Application dialog --------------------------- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Start your application"
        description={scholarship.name}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={() => handleSubmit(true)} loading={submitting}>
              Save as draft
            </Button>
            <Button onClick={() => handleSubmit(false)} loading={submitting}>
              Submit application
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Alert tone="info">
            Document upload is not implemented in this prototype. Tick the requirements you already have
            ready — you will be told separately how to submit the physical copies.
          </Alert>

          <Textarea
            id="application-motivation"
            label="Why are you applying?"
            hint="At least 20 characters. This is shared with the reviewing administrator."
            required
            rows={5}
            value={values.motivation}
            error={errors.motivation}
            onChange={(event) => setValues({ motivation: event.target.value })}
          />

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Requirements you have ready
            </legend>
            <div className="mt-2 space-y-2">
              {scholarship.requirements.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No specific requirements are listed for this scholarship.
                </p>
              ) : (
                scholarship.requirements.map((requirement, index) => (
                  <Checkbox
                    key={requirement}
                    id={`requirement-${index}`}
                    label={requirement}
                    checked={selectedDocs.includes(requirement)}
                    onChange={(event) => {
                      setSelectedDocs((current) =>
                        event.target.checked
                          ? [...current, requirement]
                          : current.filter((item) => item !== requirement),
                      )
                    }}
                  />
                ))
              )}
            </div>
          </fieldset>

          <Checkbox
            id="application-confirm"
            label="I confirm the information I am submitting is accurate and my own."
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
        </div>
      </Dialog>
    </div>
  )
}
