interface Props {
  total: number
  learned: number
  mastered: number
  label?: string
}

/** Thanh hai lớp: phần đã học (chàm nhạt) và phần đã thuộc (chàm đậm). */
export function ProgressBar({ total, learned, mastered, label }: Props) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={learned}
      aria-valuetext={`Đã học ${learned}/${total}, đã thuộc ${mastered}`}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className="absolute inset-y-0 left-0 rounded-full bg-cell-line" style={{ width: `${pct(learned)}%` }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-ai" style={{ width: `${pct(mastered)}%` }} />
    </div>
  )
}
