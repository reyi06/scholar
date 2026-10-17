import { useState } from 'react'
import { useParams } from 'react-router'
import { DeadlineBadge } from '../../components/DeadlineBadge.tsx'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  DefinitionList,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  PageHeader,
  Section,
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

/** Renders a list of plain strings, or a muted fallback when empty. */
function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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

  const { run: submitApplication, loading: submitting } = useAsyncAction(async (asDraft: boolean) => {
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
  })

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
        : `Reference number ${result.referenceNo}.`,
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <LoadingState label="Loading scholarship…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!scholarship) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <EmptyState
          title="Scholarship not found"
          description="This listing may have been removed, or the link may be incorrect."
          action={<LinkButton to="/scholarships">Back to scholarships</LinkButton>}
        />
      </div>
    )
  }

  const isOpen = scholarship.status === 'open'
  const isExternal = scholarship.applicationMode === 'external'
  const saved = savedIds.includes(scholarship.id)

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        title={scholarship.name}
        breadcrumbs={[
          { label: 'Scholarships', to: '/scholarships' },
          { label: truncate(scholarship.name, 40) },
        ]}
        description={scholarship.provider}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge tone="brand">{SCHOLARSHIP_TYPE_LABELS[scholarship.type]}</Badge>
        <Badge tone="neutral">{scholarship.municipality}</Badge>
        <StatusBadge kind="scholarship" status={scholarship.status} />
        <DeadlineBadge deadline={scholarship.deadline} open={isOpen} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_19rem]">
        {/* ------------------------------- Content ------------------------------- */}
        <div className="order-2 space-y-10 lg:order-1">
          <Section divider={false} title="Summary">
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
              {scholarship.description}
            </p>
          </Section>

          <Section title="Benefits">
            <BulletList
              items={scholarship.benefits}
              emptyLabel="No benefits have been published for this listing."
            />
          </Section>

          <Section title="Eligibility">
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
            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {isExternal
                  ? 'This provider processes applications on their own website. This platform lists the opportunity only and cannot track that submission.'
                  : 'Submit your application here and follow its progress from your dashboard.'}
              </p>
              <BulletList
                items={scholarship.instructions}
                emptyLabel="Refer to the provider for application instructions."
              />

              {/* An external link is shown whenever the provider supplied one. */}
              {scholarship.externalUrl ? (
                <a
                  href={scholarship.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
                >
                  <Icon name="external" className="size-4" />
                  {isExternal ? 'Open the provider website' : 'Provider website'}
                </a>
              ) : null}
            </div>
          </Section>
        </div>

        {/* ------------------------------- Sidebar ------------------------------- */}
        <aside className="order-1 space-y-8 lg:order-2 lg:sticky lg:top-24">
          <Card>
            <CardBody className="space-y-5">
              {isExternal ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Applications are handled by the provider.
                  </p>
                  {scholarship.externalUrl ? (
                    <a
                      href={scholarship.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
                    >
                      <Icon name="external" className="size-4" />
                      Apply on provider website
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No provider link has been supplied yet.
                    </p>
                  )}
                </>
              ) : applicationLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Checking your applications…</p>
              ) : existingApplication ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    You already have an application for this scholarship.
                  </p>
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="application" status={existingApplication.status} size="md" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {existingApplication.referenceNo}
                    </span>
                  </div>
                  <LinkButton to={`/student/applications/${existingApplication.id}`} fullWidth>
                    View your application
                  </LinkButton>
                </>
              ) : !user ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Sign in to apply and track your progress.
                  </p>
                  <LinkButton to="/login" fullWidth>
                    Sign in to apply
                  </LinkButton>
                </>
              ) : !isStudent ? (
                <Alert tone="warning" title="Student accounts only">
                  Administrator accounts cannot submit applications.
                </Alert>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {isOpen
                      ? 'Prepare a short statement and start your application. You can save a draft.'
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

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => toggle(scholarship)}
                  aria-pressed={saved}
                >
                  {saved ? 'Saved' : 'Save for later'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Section title="At a glance" divider={false}>
            <DefinitionList
              columns={1}
              items={[
                { label: 'Deadline', value: formatDate(scholarship.deadline) },
                { label: 'Provider', value: scholarship.provider },
                { label: 'Coverage', value: scholarship.municipality },
                {
                  label: 'Education level',
                  value: scholarship.educationLevels.map((value) => EDUCATION_LEVEL_LABELS[value]).join(', '),
                },
                {
                  label: 'Application method',
                  value: isExternal ? 'Provider website' : 'Through this platform',
                },
              ]}
            />
          </Section>

          <Section title="Contact">
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {scholarship.contact.person ? <p>{scholarship.contact.person}</p> : null}
              {scholarship.contact.email ? (
                <p>
                  <a
                    href={`mailto:${scholarship.contact.email}`}
                    className="break-all text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
                  >
                    {scholarship.contact.email}
                  </a>
                </p>
              ) : null}
              {scholarship.contact.phone ? <p>{scholarship.contact.phone}</p> : null}
              {scholarship.contact.address ? (
                <p className="text-slate-500 dark:text-slate-400">{scholarship.contact.address}</p>
              ) : null}
              {!scholarship.contact.person &&
              !scholarship.contact.email &&
              !scholarship.contact.phone &&
              !scholarship.contact.address ? (
                <p className="text-slate-500 dark:text-slate-400">
                  No contact details have been published for this listing.
                </p>
              ) : null}
            </div>
          </Section>
        </aside>
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
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSubmit(true)} loading={submitting}>
              Save draft
            </Button>
            <Button onClick={() => handleSubmit(false)} loading={submitting}>
              Submit application
            </Button>
          </>
        }
      >
        <div className="space-y-6">
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
            <p className="mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
              Tick the ones you already have. You will be told separately how to submit the copies.
            </p>
            <div className="space-y-2.5">
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
