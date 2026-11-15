import { Accordion, LinkButton, Section } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

interface FaqGroup {
  id: string
  title: string
  items: { question: string; answer: string }[]
}

/**
 * Answers are written from what the system actually does. Anything this platform
 * cannot know, such as review times, provider rules or disbursement schedules,
 * points to the office or the provider rather than inventing a figure.
 */
const GROUPS: FaqGroup[] = [
  {
    id: 'finding',
    title: 'Finding Scholarships',
    items: [
      {
        question: 'How do I search for scholarships?',
        answer:
          'Use the search box on the home page, or open the directory to filter by provider type, municipality, education level or deadline. Your filters are kept in the address bar, so a filtered view can be bookmarked or shared.',
      },
      {
        question: 'What do the provider types mean?',
        answer:
          'Provincial: offered across Pampanga by provincial offices. Municipal or city: run by one local government, usually for its own residents. National: run by national agencies. Educational institution: awards and discounts from a school or university. Private organisation: funded by foundations and private bodies.',
      },
      {
        question: "Some listings say applications are handled on the provider's website. What does that mean?",
        answer:
          'The provider runs its own application. The listing links to their website, and this platform does not receive or track that submission, so it will not appear under your applications.',
      },
      {
        question: 'Can I save a listing to come back to?',
        answer:
          'Yes. Use the bookmark control on a listing, then find it under Saved scholarships. Saving needs an account.',
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
          'Open the listing and read the eligibility and requirements first. Choose Start application, write a short statement, tick the requirements you already have, and confirm your details. You can save a draft and finish it later.',
      },
      {
        question: 'Can I edit or withdraw an application?',
        answer:
          'A draft can be edited, and drafts or submitted applications can be withdrawn. Once an application is under review it cannot be changed here, so contact the scholarship office if something needs correcting.',
      },
      {
        question: 'What happens after I submit?',
        answer:
          'It gets a reference number and moves from Submitted to Under review, then to Approved, Needs information or Declined. The full history and any reviewer note appear on the application page.',
      },
      {
        question: 'How long does a review take?',
        answer:
          'The scholarship office sets that, not this platform. Your dashboard always shows when something is waiting on you.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Requirements and Documents',
    items: [
      {
        question: 'Can I upload my documents here?',
        answer:
          'Not yet. An application records which requirements you have ready, and you will be told separately how to send the copies. Keep the originals.',
      },
      {
        question: 'What if my application needs more information?',
        answer:
          'Its status becomes Needs information, with a note on what is missing. It stays at the top of your dashboard as your next step until you resolve it.',
      },
    ],
  },
  {
    id: 'grants',
    title: 'Approval and Grants',
    items: [
      {
        question: 'My application was approved. When do I receive the grant?',
        answer:
          'Approval is a decision on the review. The grant itself is released by the provider, not by this platform. Once the office confirms a grant record, it appears under My grants.',
      },
      {
        question: 'Why is My grants empty when I have an approved application?',
        answer:
          'Because no grant record has been confirmed for it yet. Approved and confirmed are different states, so an approval on its own will not show there.',
      },
      {
        question: 'What does the amount on a grant record mean?',
        answer:
          'The amount the provider released for that academic year and semester, as recorded by the office. It documents the grant; it is not something you pay.',
      },
    ],
  },
  {
    id: 'registration',
    title: 'Semester Registration',
    items: [
      {
        question: 'What is semester registration?',
        answer:
          'A short form that students with a confirmed grant complete once per term, so their enrolment can be verified and the grant stays active.',
      },
      {
        question: 'Who can file one?',
        answer:
          'Only students with a confirmed grant. If you do not have one yet, the page will say that registration is not available to you.',
      },
      {
        question: 'How is it different from applying?',
        answer:
          'Applying asks for a new scholarship. Registration keeps an existing grant active for a new term. They are separate records, reviewed separately, and you can have both.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Your Account',
    items: [
      {
        question: 'Do I need an account to browse?',
        answer:
          'No. Searching and reading listings is public. You need an account to save listings, submit applications and follow their progress.',
      },
      {
        question: 'Who can see my information?',
        answer:
          'You, and the administrators who review submissions. Your profile, applications and grant records are reachable only from your own account, and the server checks ownership on every request.',
      },
      {
        question: 'I forgot my password. What can I do?',
        answer:
          'Password reset is not available yet. Contact the scholarship office and they can help you regain access.',
      },
    ],
  },
  {
    id: 'admin',
    title: 'For Administrators',
    items: [
      {
        question: 'How do I publish a listing?',
        answer:
          'Open Scholarships and choose New scholarship. Listings start as a draft and appear publicly once their status is set to open.',
      },
      {
        question: 'How do I review applications?',
        answer:
          'Open Applications and choose Review on a row. Every decision needs a short note, which the student then sees on their application.',
      },
      {
        question: 'How do I confirm a grant?',
        answer:
          'Open Grant records. Approved applications without a grant appear under Awaiting grant confirmation, where you record the amount and term. This is the only place an approval becomes a grant.',
      },
      {
        question: 'Can I export data?',
        answer:
          'Yes. Each breakdown on the Reports page downloads as a CSV file, using the filters currently applied.',
      },
    ],
  },
]

export function FaqPage() {
  useDocumentTitle('Frequently Asked Questions')

  return (
    <>
      <section className="bg-brand-800 dark:bg-ink-900">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
          <p className="text-xs font-medium tracking-[0.18em] text-gold-300 uppercase">Questions</p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="space-y-10">
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

          <Section title="Still Need Help?">
            <div className="space-y-5">
              <p className="max-w-[64ch] text-sm text-slate-900 dark:text-slate-100">
                For a specific scholarship, contact the provider using the details on its listing.
                For your account, or an application you submitted here, contact the scholarship
                office.
              </p>
              <LinkButton to="/scholarships">Browse Scholarships</LinkButton>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}
