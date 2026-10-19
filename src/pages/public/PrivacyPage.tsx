import { PageHeader, Section } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

/**
 * Privacy notice.
 *
 * Required by the Data Privacy Act (RA 10173), which treats a student's
 * education record as sensitive personal information and requires a notice at
 * the point of collection. It is written in plain language on purpose: a notice
 * nobody reads is a notice that does not inform.
 *
 * It states what the system actually does. Where a policy is not yet enforced by
 * the software — automatic retention, for example — it says so rather than
 * implying an automation that does not exist.
 */
export function PrivacyPage() {
  useDocumentTitle('Privacy Notice')

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <PageHeader
        title="Privacy Notice"
        description="What this system collects, why, who can see it, and what you can ask us to do about it."
      />

      <div className="mt-10 space-y-10">
        <Section title="Who Is Responsible">
          <p className="max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            The scholarship office of the Provincial Government of Pampanga is the personal
            information controller for the records held in Scholar. Questions about this notice, or
            about your own records, should be addressed to that office using the contact details
            published on this site.
          </p>
        </Section>

        <Section title="What We Collect">
          <ul className="max-w-[70ch] space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">Account details</span> —
              your name, email address, and a password stored only as an irreversible hash.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">Student details</span> —
              contact number, birth date, municipality, barangay, address, education level, school,
              course, year level, and optionally your general weighted average, household income and
              guardian contact.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">Documents you upload</span> —
              for example a certificate of enrolment, your grades, or proof of residency.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">Your activity here</span> —
              applications you submit, applications you save, semester registrations, and grants
              confirmed for you.
            </li>
          </ul>
        </Section>

        <Section title="Why We Collect It">
          <ul className="max-w-[70ch] space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>To decide whether you are eligible for a scholarship or grant.</li>
            <li>To record applications, semester registrations and released grants accurately.</li>
            <li>To contact you about an application, a missing document or a deadline.</li>
            <li>To report to the office and to funding providers on how assistance was used.</li>
          </ul>
          <p className="mt-3 max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            Some of this information — birth date, address, income, grades, and identification
            documents — is <span className="font-medium">sensitive personal information</span> under
            the Data Privacy Act. It is collected only because eligibility for these programmes is
            decided on it, and it is used for no other purpose.
          </p>
        </Section>

        <Section title="Who Can See It">
          <ul className="max-w-[70ch] space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">You</span> can see your own
              profile, documents, applications and grants.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">Scholarship office staff</span>{' '}
              signed in as administrators can see student records in order to review them.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">No other student</span> can
              see your records. Access is checked for every request on the server, not only in the
              interface.
            </li>
            <li>
              <span className="font-medium text-slate-900 dark:text-slate-100">No third party</span>{' '}
              receives your information from this system. Scholarship listings link to providers'
              own websites; opening such a link is your choice and is governed by that provider's
              own privacy notice.
            </li>
          </ul>
        </Section>

        <Section title="How Long We Keep It">
          <p className="max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            Records are kept for as long as they are needed to administer the grant and to satisfy
            the office's audit obligations. Documents attached to an application that is declined, or
            that is never submitted, are not needed for that purpose and are intended to be removed
            after a defined period. That period is set by the office; the system currently does not
            delete them automatically, so removal is carried out by staff.
          </p>
        </Section>

        <Section title="Your Rights">
          <p className="max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            Under the Data Privacy Act you have the right to be informed, to object, to access your
            data, to correct it, to have it erased or blocked in certain circumstances, to damages
            for a violation, and to complain to the National Privacy Commission.
          </p>
          <p className="mt-3 max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            Much of this is available directly: you can view and correct your profile, delete your
            own documents, and see every application and grant recorded for you. For anything else,
            contact the scholarship office. Requests are acted on after your identity is confirmed.
          </p>
          <p className="mt-3 max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            A record that funds were released is retained even if you ask for erasure, because it is
            evidence of a decision and of the use of public funds. Your right to erasure applies to
            information that is no longer necessary for that purpose.
          </p>
        </Section>

        <Section title="How We Protect It">
          <ul className="max-w-[70ch] space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>Passwords are stored only as salted scrypt hashes and can never be read back.</li>
            <li>Sessions are held in a server-side record; the browser carries only an opaque identifier in a cookie that scripts cannot read.</li>
            <li>Every request is authorised on the server, including ownership checks.</li>
            <li>Uploaded files are stored under generated names and always downloaded as attachments, never displayed inside the site.</li>
            <li>Uploads are limited by type and size, and rejected if they do not match.</li>
          </ul>
        </Section>

        <Section title="Changes to This Notice">
          <p className="max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">
            If what the system collects or how it is used changes, this notice will be updated and
            the date below changed.
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Last updated 19 October 2026.
          </p>
        </Section>
      </div>
    </div>
  )
}
