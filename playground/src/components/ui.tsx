import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  children,
  className,
  title,
  hint,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  hint?: ReactNode
}) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm',
        'shadow-[0_1px_0_0_oklch(1_0_0/0.04)_inset,0_24px_60px_-30px_oklch(0_0_0/0.6)]',
        className,
      )}
    >
      {(title || hint) && (
        <header className="flex items-baseline justify-between gap-4 border-b border-zinc-800/70 px-5 py-3.5">
          {title && (
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
              {title}
            </h2>
          )}
          {hint && (
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {hint}
            </span>
          )}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Label({
  className,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={cx(
        'mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400',
        className,
      )}
    >
      {children}
    </label>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[11px] leading-tight text-zinc-500">{hint}</p>
      )}
    </div>
  )
}

const controlBase =
  'block w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-600 transition-colors hover:border-zinc-700 focus:border-accent-500 ' +
  'focus:bg-zinc-950 disabled:cursor-not-allowed disabled:opacity-50'

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(controlBase, className)} />
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(controlBase, 'font-mono leading-relaxed', className)}
    />
  )
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        controlBase,
        'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27><path fill=%27none%27 stroke=%27%2371717a%27 stroke-width=%271.5%27 d=%27M2.5 4.5 6 8l3.5-3.5%27/></svg>")] bg-no-repeat pr-9',
        className,
      )}
      style={{
        backgroundPosition: 'right 0.75rem center',
      }}
    >
      {children}
    </select>
  )
}

type Variant = 'default' | 'ghost' | 'primary'

export function Button({
  className,
  variant = 'default',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    default:
      'border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/80',
    ghost:
      'border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
    primary:
      'border border-accent-600/60 bg-accent-600/20 text-accent-200 hover:bg-accent-600/30 hover:border-accent-500',
  }
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-8 min-w-[2.25rem] rounded-md px-2.5 text-xs font-medium tabular-nums transition-all',
        active
          ? 'border border-accent-500/70 bg-accent-600/20 text-accent-200 shadow-[0_0_0_1px_oklch(0.65_0.22_290/0.3)]'
          : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
      )}
    >
      {children}
    </button>
  )
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/60 p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cx(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-200',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
      {children}
    </kbd>
  )
}
