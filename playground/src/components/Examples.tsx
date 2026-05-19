import { Button } from './ui'

export type Example = {
  label: string
  description: string
  rrule: string
}

export const EXAMPLES: Example[] = [
  {
    label: 'Daily standup',
    description: 'Every weekday at 09:30',
    rrule:
      'DTSTART:20250106T093000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20',
  },
  {
    label: 'Bi-weekly Friday',
    description: 'Every other Friday, 10 times',
    rrule: 'DTSTART:20250103T140000Z\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR;COUNT=10',
  },
  {
    label: 'First Monday',
    description: 'First Monday of every month',
    rrule:
      'DTSTART:20250106T090000Z\nRRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;COUNT=12',
  },
  {
    label: 'Last day of month',
    description: 'Last day of the month, 24 times',
    rrule:
      'DTSTART:20250131T235900Z\nRRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=24',
  },
  {
    label: 'Quarterly',
    description: 'Every 3 months on the 15th',
    rrule:
      'DTSTART:20250115T120000Z\nRRULE:FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15;COUNT=8',
  },
  {
    label: 'US Thanksgiving',
    description: '4th Thursday of November, yearly',
    rrule:
      'DTSTART:20251127T000000Z\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=TH;BYSETPOS=4;COUNT=10',
  },
  {
    label: 'Hourly during workday',
    description: 'Every hour from 9–17 on weekdays',
    rrule:
      'DTSTART:20250106T090000Z\nRRULE:FREQ=HOURLY;BYHOUR=9,10,11,12,13,14,15,16,17;BYDAY=MO,TU,WE,TH,FR;COUNT=45',
  },
]

export function Examples({ onPick }: { onPick: (rrule: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EXAMPLES.map((ex) => (
        <Button
          key={ex.label}
          onClick={() => onPick(ex.rrule)}
          title={ex.description}
        >
          {ex.label}
        </Button>
      ))}
    </div>
  )
}
