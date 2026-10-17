import { Badge, type BadgeTone } from './ui/index.ts'
import {
  APPLICATION_STATUS_LABELS,
  GRANT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  SCHOLARSHIP_STATUS_LABELS,
} from '../lib/constants.ts'
import type {
  ApplicationStatus,
  GrantStatus,
  RegistrationStatus,
  ScholarshipStatus,
} from '../types/index.ts'

export type StatusKind = 'scholarship' | 'application' | 'registration' | 'grant'

/**
 * Tone per status, chosen so the meaning reads at a glance:
 * green = good, amber = needs attention, rose = negative, blue = in progress.
 */
const TONES: Record<StatusKind, Record<string, BadgeTone>> = {
  scholarship: {
    open: 'success',
    closed: 'neutral',
    draft: 'warning',
  },
  application: {
    draft: 'neutral',
    submitted: 'info',
    'under-review': 'brand',
    'needs-info': 'warning',
    approved: 'success',
    rejected: 'danger',
  },
  registration: {
    pending: 'warning',
    verified: 'success',
    rejected: 'danger',
  },
  grant: {
    active: 'success',
    completed: 'info',
    suspended: 'danger',
  },
}

const LABELS: Record<StatusKind, Record<string, string>> = {
  scholarship: SCHOLARSHIP_STATUS_LABELS,
  application: APPLICATION_STATUS_LABELS,
  registration: REGISTRATION_STATUS_LABELS,
  grant: GRANT_STATUS_LABELS,
}

export interface StatusBadgeProps {
  kind: StatusKind
  status: ScholarshipStatus | ApplicationStatus | RegistrationStatus | GrantStatus
  size?: 'sm' | 'md'
}

/** Single place that turns a domain status into a labelled, coloured badge. */
export function StatusBadge({ kind, status, size = 'sm' }: StatusBadgeProps) {
  const tone = TONES[kind][status] ?? 'neutral'
  const label = LABELS[kind][status] ?? status
  return (
    <Badge tone={tone} size={size} dot>
      {label}
    </Badge>
  )
}
