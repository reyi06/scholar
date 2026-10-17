import type { ReactNode } from 'react'

/**
 * Small inline icon set.
 *
 * Hand-written rather than adding an icon dependency, in line with the brief's
 * "avoid unnecessary dependencies". Each icon is a stroked 24x24 path so they
 * inherit `currentColor` and stay visually consistent.
 */
export type IconName =
  | 'home'
  | 'search'
  | 'star'
  | 'list'
  | 'file'
  | 'calendar'
  | 'award'
  | 'bell'
  | 'user'
  | 'users'
  | 'settings'
  | 'chart'
  | 'megaphone'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'filter'
  | 'external'
  | 'download'
  | 'menu'
  | 'close'
  | 'logout'
  | 'clock'
  | 'building'
  | 'arrow-right'
  | 'info'
  | 'alert'
  | 'graduation'
  | 'inbox'

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  star: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 16.3 7.2 18.8l.9-5.3L4.2 9.7l5.4-.8z" />,
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 14l-1.5 7L12 19l4.5 2L15 14" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 7" />
      <path d="M17.5 14.5A6 6 0 0 1 21 20" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 16v-5M12 16V8M16 16v-3" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v2l4 1V10z" />
      <path d="M7 10l10-5v14L7 14z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="M14 6l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  filter: <path d="M4 6h16l-6 7v6l-4-2v-4z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  logout: (
    <>
      <path d="M15 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9" />
      <path d="M12 12h9" />
      <path d="M18 9l3 3-3 3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V6l7-3v18" />
      <path d="M11 10h9v11" />
      <path d="M7 9h.01M7 13h.01M7 17h.01M15 14h.01M15 17h.01" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  graduation: (
    <>
      <path d="M3 9l9-4 9 4-9 4z" />
      <path d="M7 11v5c0 1 2 2 5 2s5-1 5-2v-5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M5 5h14l1 8v6H4v-6z" />
    </>
  ),
}

export interface IconProps {
  name: IconName
  className?: string
  /** Provide when the icon is the only content of a control. */
  label?: string
}

export function Icon({ name, className = 'size-5', label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  )
}
