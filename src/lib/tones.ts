import type { BadgeTone } from '../components/ui/Badge.tsx'
import type { AnnouncementCategory, DocumentStatus } from '../types/index.ts'

/**
 * Status → colour, in one place.
 *
 * These were previously copied into four pages, which meant an announcement
 * could read as "advisory" in amber on one screen and as something else on the
 * next. Colour is a semantic decision, so it belongs beside the vocabulary
 * (`constants.ts`), not beside the markup that happens to render it.
 */

export const ANNOUNCEMENT_CATEGORY_TONES: Record<AnnouncementCategory, BadgeTone> = {
  advisory: 'warning',
  deadline: 'brand',
  result: 'success',
  general: 'neutral',
}

export const DOCUMENT_STATUS_TONES: Record<DocumentStatus, BadgeTone> = {
  submitted: 'info',
  verified: 'success',
  rejected: 'danger',
}
