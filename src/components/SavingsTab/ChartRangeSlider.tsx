import styles from './ChartRangeSlider.module.css'

interface Props {
  min: number
  max: number
  value: [number, number]
  onChange: (next: [number, number]) => void
  labelMin?: string
  labelMax?: string
}

/**
 * Dual-handle range slider implemented as two overlaid native <input
 * type="range"> elements. The track + filled progress are CSS-only siblings;
 * each thumb is the only pointer-active part of its input, so the user
 * always grabs whichever thumb is on top of the cursor.
 */
export default function ChartRangeSlider({
  min,
  max,
  value,
  onChange,
  labelMin,
  labelMax,
}: Props) {
  const [lo, hi] = value
  const total = max - min || 1
  const leftPct = ((lo - min) / total) * 100
  const widthPct = ((hi - lo) / total) * 100

  const handleMinInput = (raw: string) => {
    const v = Number(raw)
    // Match js/chart.js: if min handle crosses max, clamp min to max.
    const clamped = v > hi ? hi : v
    onChange([clamped, hi])
  }
  const handleMaxInput = (raw: string) => {
    const v = Number(raw)
    const clamped = v < lo ? lo : v
    onChange([lo, clamped])
  }

  return (
    <div className={styles.rangeSlider}>
      <div className={styles.rangeSliderTrack} />
      <div
        className={styles.rangeSliderProgress}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={lo}
        aria-label={labelMin ?? 'Range start'}
        onChange={e => handleMinInput(e.target.value)}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={hi}
        aria-label={labelMax ?? 'Range end'}
        onChange={e => handleMaxInput(e.target.value)}
      />
    </div>
  )
}
