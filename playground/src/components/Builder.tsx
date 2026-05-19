import { Frequency } from '@spiandorello/rrulejs'
import {
  Button,
  ChipToggle,
  Field,
  Input,
  SegmentedControl,
  Select,
} from './ui'
import {
  type BuilderState,
  type EndKind,
  type WeekdayCode,
  FREQUENCIES,
  MONTHS,
  WEEKDAYS,
} from '../lib/rrule'

type Props = {
  state: BuilderState
  onChange: (next: BuilderState) => void
}

export function Builder({ state, onChange }: Props) {
  const patch = (p: Partial<BuilderState>) => onChange({ ...state, ...p })

  const toggle = <K extends 'byweekday' | 'bymonth' | 'bymonthday'>(
    key: K,
    value: BuilderState[K][number],
  ) => {
    const current = state[key] as readonly (typeof value)[]
    const has = current.includes(value)
    const next = has
      ? current.filter((v) => v !== value)
      : [...current, value].sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b
          return String(a).localeCompare(String(b))
        })
    patch({ [key]: next } as unknown as Partial<BuilderState>)
  }

  const showWeekly = state.freq <= Frequency.WEEKLY
  const showMonthly = state.freq <= Frequency.MONTHLY
  const showYearly = state.freq === Frequency.YEARLY

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="DTSTART">
          <Input
            type="datetime-local"
            value={state.dtstart}
            onChange={(e) => patch({ dtstart: e.target.value })}
          />
        </Field>

        <Field label="Frequency">
          <Select
            value={state.freq}
            onChange={(e) =>
              patch({ freq: Number(e.target.value) as Frequency })
            }
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Interval" hint="Every N units of the chosen frequency">
          <Input
            type="number"
            min={1}
            max={999}
            value={state.interval}
            onChange={(e) =>
              patch({ interval: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </Field>

        <Field label="Ends">
          <SegmentedControl<EndKind>
            value={state.end}
            onChange={(v) => patch({ end: v })}
            options={[
              { value: 'never', label: 'Never' },
              { value: 'count', label: 'After' },
              { value: 'until', label: 'On date' },
            ]}
          />
          <div className="mt-2">
            {state.end === 'count' && (
              <Input
                type="number"
                min={1}
                max={9999}
                value={state.count}
                onChange={(e) =>
                  patch({ count: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            )}
            {state.end === 'until' && (
              <Input
                type="date"
                value={state.until}
                onChange={(e) => patch({ until: e.target.value })}
              />
            )}
          </div>
        </Field>
      </div>

      {showWeekly && (
        <Field
          label="By weekday"
          hint="Pick one or more days of the week (BYDAY)"
        >
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((wd) => (
              <ChipToggle
                key={wd}
                active={state.byweekday.includes(wd)}
                onClick={() => toggle('byweekday', wd as WeekdayCode)}
              >
                {wd}
              </ChipToggle>
            ))}
            {state.byweekday.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => patch({ byweekday: [] })}
                className="ml-1"
              >
                Clear
              </Button>
            )}
          </div>
        </Field>
      )}

      {showMonthly && (
        <Field label="By month day" hint="Specific days within a month (1–31)">
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <ChipToggle
                key={d}
                active={state.bymonthday.includes(d)}
                onClick={() => toggle('bymonthday', d)}
              >
                {d}
              </ChipToggle>
            ))}
          </div>
          {state.bymonthday.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => patch({ bymonthday: [] })}
              className="mt-2"
            >
              Clear month days
            </Button>
          )}
        </Field>
      )}

      {showYearly && (
        <Field label="By month" hint="Restrict to specific months of the year">
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((m, idx) => (
              <ChipToggle
                key={m}
                active={state.bymonth.includes(idx + 1)}
                onClick={() => toggle('bymonth', idx + 1)}
              >
                {m}
              </ChipToggle>
            ))}
            {state.bymonth.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => patch({ bymonth: [] })}
                className="ml-1"
              >
                Clear
              </Button>
            )}
          </div>
        </Field>
      )}
    </div>
  )
}
