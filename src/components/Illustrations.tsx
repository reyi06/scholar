import { useLayoutEffect, useRef } from 'react'

/**
 * Hand-authored line illustrations for the marketing surfaces.
 *
 * Drawn with straight lines, arcs and circles only - geometry that reads as
 * intentional rather than an approximation of something organic. `currentColor`
 * drives the stroke, so colour comes from the caller's classes.
 *
 * The reveal is described in `src/index.css`. Each shape is measured here and
 * given a dash as long as itself, parked at offset 0. That makes the resting
 * state fully drawn, so the artwork is never invisible if JavaScript or
 * animations do not run - and it means `prefers-reduced-motion` needs no special
 * handling, because collapsing the duration simply lands on the drawn state.
 */

interface IllustrationProps {
  className?: string
  /** Leave off to render already drawn, e.g. before it scrolls into view. */
  animated?: boolean
}

const GEOMETRY = 'path, circle, rect, line, polyline'

/** Measures each shape so the draw-on animation has a distance to travel. */
function useDrawn() {
  const ref = useRef<SVGSVGElement | null>(null)

  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg) return

    svg.querySelectorAll<SVGGeometryElement>(GEOMETRY).forEach((shape) => {
      const length = shape.getTotalLength()
      if (!Number.isFinite(length) || length <= 0) return
      shape.style.strokeDasharray = `${length}`
      shape.style.setProperty('--draw-length', `${length}`)
    })
  }, [])

  return ref
}

/** Staggered start, so a composed illustration draws in a deliberate order. */
function stagger(index: number): { animationDelay: string } {
  return { animationDelay: `${(index * 0.07).toFixed(2)}s` }
}

const GOLD = 'text-gold-500'

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function HeroIllustration({ className = '', animated = true }: IllustrationProps) {
  const ref = useDrawn()

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${animated ? 'draw-on' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Mortarboard */}
      <path style={stagger(0)} d="M118 14 172 38 118 62 64 38Z" />
      <path style={stagger(1)} d="M94 46v14q24 13 48 0V46" />
      <path style={stagger(2)} d="M172 38v20" />
      <circle style={stagger(2)} cx="172" cy="63" r="3" />

      {/* Document */}
      <path style={stagger(3)} d="M52 66h84l26 26v84a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8Z" />
      <path style={stagger(4)} d="M136 66v26h26" />
      <path style={stagger(5)} d="M68 108h74" />
      <path style={stagger(6)} d="M68 128h74" />
      <path style={stagger(7)} d="M68 148h46" />

      {/* Seal, ribbon and sparkles */}
      <g className={GOLD}>
        <circle style={stagger(8)} cx="168" cy="156" r="22" />
        <path style={stagger(9)} d="M158 173l-6 17 16-8 16 8-6-17" />
        <path style={stagger(10)} d="M30 44v10M25 49h10" />
        <path style={stagger(11)} d="M208 92v10M203 97h10" />
        <path style={stagger(12)} d="M34 148v10M29 153h10" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Journey steps                                                       */
/* ------------------------------------------------------------------ */

const STEP_SVG = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Find a listing: a shortlist with a magnifier over it. */
export function FindIllustration({ className = '', animated = true }: IllustrationProps) {
  const ref = useDrawn()

  return (
    <svg ref={ref} {...STEP_SVG} className={`${animated ? 'draw-on' : ''} ${className}`}>
      <path style={stagger(0)} d="M12 12h30a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" />
      <path style={stagger(1)} d="M14 24h22" />
      <path style={stagger(2)} d="M14 32h26" />
      <path style={stagger(3)} d="M14 40h16" />
      <g className={GOLD}>
        <circle style={stagger(4)} cx="42" cy="42" r="11" />
        <path style={stagger(5)} d="M50 50l7 7" />
      </g>
    </svg>
  )
}

/** Apply: a form with a completed check. */
export function ApplyIllustration({ className = '', animated = true }: IllustrationProps) {
  const ref = useDrawn()

  return (
    <svg ref={ref} {...STEP_SVG} className={`${animated ? 'draw-on' : ''} ${className}`}>
      <path style={stagger(0)} d="M14 8h24l12 12v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
      <path style={stagger(1)} d="M38 8v12h12" />
      <path style={stagger(2)} d="M18 30h20" />
      <path style={stagger(3)} d="M18 38h12" />
      <g className={GOLD}>
        <path style={stagger(4)} d="M19 48l6 6 13-14" />
      </g>
    </svg>
  )
}

/** Track: a certificate with a seal. */
export function TrackIllustration({ className = '', animated = true }: IllustrationProps) {
  const ref = useDrawn()

  return (
    <svg ref={ref} {...STEP_SVG} className={`${animated ? 'draw-on' : ''} ${className}`}>
      <path style={stagger(0)} d="M8 12h48a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" />
      <path style={stagger(1)} d="M14 22h28" />
      <path style={stagger(2)} d="M14 30h18" />
      <g className={GOLD}>
        <circle style={stagger(3)} cx="44" cy="44" r="10" />
        <path style={stagger(4)} d="M38 51l-3 10 9-4 9 4-3-10" />
      </g>
    </svg>
  )
}
