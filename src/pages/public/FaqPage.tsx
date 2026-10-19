import { Accordion, LinkButton, PageHeader, Section } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

interface FaqGroup {
  id: string
  title: string
  description?: string
  items: { question: string; answer: string }[]
}

/**
 * Answers are written from what the system actually does. Anything this platform
 * cannot know — review times, provider rules, disbursement schedules — points to
 * the office or the provider rather than inventing a figure.
 */
const GROUPS: FaqGroup[] = [
  {
    id: 'finding',
    title: 'Finding scholarships',
    items: [
      {
        question: 'How do I search for scholarships?',
        answer:
          "Use the search field on the home page, or open the directory, which also filters by provider type, municipality, education level and deadline. Results update as you change them, and your filters are written into the address bar, so a filtered view can be bookmarked or shared.",
      },
      {
        question: 'What do the provider types mean?',
        answer:
          "Provincial listings are offered across the province by provincial offices. Municipal or city listings are administered by one local government, usually for its own residents. National listings are run by national agencies. Educational institution listings are awards and discounts from a school or university. Private organisation listings are funded by foundations and other private bodies.",
      },
      {
        question:
          "Some listings say applications are handled on the provider's website. What does that mean?",
        answer:
          "There are two kinds of listing. Applications submitted through this platform are sent here and tracked here. Externally handled applications are processed by the provider: the listing links to their website, and this platform neither receives nor tracks that submission, so it will not appear under your applications.",
      },
      {
        question: 'Can I save a listing to come back to?',
        answer:
          'Yes. Use the bookmark control on any listing card, then find it again under Saved scholarships. Saving requires an account.',
      },
    ],
  },
  {
    id: 'applying',
    title: 'Applying',
    items: [
      {
        question: 'How do I apply for a scholarship?',
        answer:
          'Open the listing and read the eligibility and requirements first. Then choose Start application, write a short statement, tick the requirements you already have, and confirm your information before submitting. You can save a draft and finish it later.',
      },
      {
        question: 'Can I edit or withdraw an application?',
        answer:
          'A draft can be edited and submitted. Drafts and submitted applications can be withdrawn. Once an application is under review it can no longer be changed here, so contact the scholarship office if something needs correcting.',
      },
      {
        question: 'What happens after I submit?',
        answer:
          'It is recorded with a reference number and moves through Submitted and Under review to Approved, Needs information or Declined. The full history, including any note from the reviewer, appears on the application page.',
      },
      {
        question: 'How long does a review take?',
        answer:
          'That is set by the scholarship office, not by this platform. Your dashboard always shows whether anything is waiting on you.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Requirements and documents',
    items: [
      {
        question: 'Can I upload my documents here?',
        answer:
          'Not yet. An application records which requirements you have ready, and you will be told separately how to submit the copies. Keep the originals.',
      },
      {
        question: 'What if my application needs more information?',
        answer:
          'Its status becomes Needs information, with a note explaining what is missing. It stays at the top of your dashboard as your next step until it is resolved.',
      },
    ],
  },
  {
    id: 'grants',
    title: 'Approval and grants',
    items: [
      {
        question: 'My application was approved. When do I receive the grant?',
        answer:
          'Approval records the review decision; it does not release funds. A grant record has to be confirmed by an administrator, and only then does it appear under My grants.',
      },
      {
        question: 'Why is My grants empty when I have an approved application?',
        answer:
          'Because no grant record has been confirmed for it yet. Approved and released are deliberately different states, so an approval on its own will not show up there.',
      },
      {
        question: 'What does the amount on a grant record mean?',
        answer:
          'The amount released for that academic year and semester, as recorded by the office. It documents what was released; it is not something you pay.',
      },
    ],
  },
  {
    id: 'registration',
    title: 'Semester registration',
    items: [
      {
        question: 'What is semester registration?',
        answer:
          'A short form that students who already hold a confirmed grant complete once per term, so their enrolment can be verified and the grant stays active.',
      },
      {
        question: 'Who can file one?',
        answer:
          'Only students with a confirmed grant. If you do not have one yet, the page will tell you that registration is not available to you.',
      },
      {
        question: 'How is it different from applying?',
        answer:
          'Applying is a request for a new scholarship. Registration keeps an existing grant active for a new term. They are separate records, reviewed separately, and you can have both.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    items: [
      {
        question: 'Do I need an account to browse?',
        answer:
          'No. Searching and reading listings is public. An account is needed to save listings, submit applications and follow their progress.',
      },
      {
        question: 'Who can see my information?',
        answer:
          'You, and the administrators who review submissions. Your profile, applications and grant records are only reachable from your own signed-in account, and the server checks ownership on every request rather than trusting the browser.',
      },
      {
        question: 'I forgot my password. What can I do?',
        answer:
          'Password reset is not available yet. Contact the scholarship office and they can help you regain access to your account.',
      },
    ],
  },
  {
    id: 'admin',
    title: 'For administrators',
    items: [
      {
        question: 'How do I publish a listing?',
        answer:
          'Open Scholarships and choose New scholarship. Listings start as a draft and only appear publicly once their status is set to open.',
      },
      {
        question: 'How do I review applications?',
        answer:
          'Open Applications and choose Review on any row. Every decision needs a short note, which the student then sees on their application.',
      },
      {
        question: 'How do I confirm a grant?',
        answer:
          'Open Grant records. Approved applications that have no grant yet appear under Awaiting grant confirmation, where you record the amount and term. This is the only place an approved application becomes a grant.',
      },
      {
        question: 'Can I export data?',
        answer:
          'Yes. Each breakdown on the Reports page downloads as a CSV file, using whatever filters are currently applied.',
      },
    ],
  },
]

export function FaqPage() {
  useDocumentTitle('Frequently asked questions')

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Frequently asked questions"
        description="How scholarships, applications, semester registration and grants work here."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'FAQs' }]}
        actions={<LinkButton to="/scholarships">Browse scholarships</LinkButton>}
      />

      <div className="mt-10 space-y-10">
        {GROUPS.map((group, index) => (
          <Section key={group.id} title={group.title} divider={index > 0}>
            <Accordion
              items={group.items.map((item, itemIndex) => ({
                id: `${group.id}-${itemIndex}`,
                title: item.question,
                content: <p className="max-w-[64ch]">{item.answer}</p>,
              }))}
            />
          </Section>
        ))}

        <Section title="Still need help?">
          <p className="max-w-[64ch] text-sm text-slate-600 dark:text-slate-300">
            For anything about a specific scholarship, contact the provider using the details on its
            listing. For your account, or an application you submitted here, contact the scholarship
            office.
          </p>
        </Section>
      </div>
    </div>
  )
}
