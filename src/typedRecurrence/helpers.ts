import { isValidDate } from '../dateutil.js'

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function parseYmdParts(ymd: string): [number, number, number] {
  if (typeof ymd !== 'string') {
    throw new Error(`Invalid YMD value: expected string, got ${typeof ymd}`)
  }

  const match = YMD_RE.exec(ymd)
  if (!match) {
    throw new Error(`Invalid YMD value: expected 'YYYY-MM-DD', got '${ymd}'`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12) {
    throw new Error(`Invalid YMD value: month out of range in '${ymd}'`)
  }

  // Reject impossible calendar dates such as 2026-02-30 via Date round-trip.
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid YMD value: '${ymd}' is not a real calendar date`)
  }

  return [year, month, day]
}

export function parseYmdToUtcEndOfDay(ymd: string): Date {
  const [year, month, day] = parseYmdParts(ymd)
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
}

export function formatUtcDateToYmd(date: Date): string {
  if (!isValidDate(date)) {
    throw new Error('Invalid Date passed to formatUtcDateToYmd')
  }
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )}`
}

// Internal: end-of-day in the runtime's local wall-clock timezone.
// Builds the date via the local Date constructor so the resulting UTC
// timestamp reflects the same offset as a dtstart authored in the same
// runtime — e.g. '2026-12-31' on a TZ=America/Sao_Paulo runtime resolves
// to 2027-01-01T02:59:59Z.
export function ymdEndOfDayLocal(ymd: string): Date {
  const [year, month, day] = parseYmdParts(ymd)
  return new Date(year, month - 1, day, 23, 59, 59)
}

export function ymdToUtcMidnight(ymd: string): Date {
  const [year, month, day] = parseYmdParts(ymd)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}
