import { Options, Frequency } from './types'
import { Weekday } from './weekday'
import { untilStringToDate } from './dateutil'
import { Days } from './rrule'

export function parseString(rfcString: string): Partial<Options> {
  const options = rfcString
    .split('\n')
    .map(parseLine)
    .filter((x) => x !== null)
  return { ...options[0], ...options[1] }
}

export function parseDtstart(line: string) {
  const options: Partial<Options> = {}

  const dtstartWithZone = /DTSTART(?:;TZID=([^:=]+?))?(?::|=)([^;\s]+)/i.exec(
    line
  )

  if (!dtstartWithZone) {
    return options
  }

  const [, tzid, dtstart] = dtstartWithZone

  if (tzid) {
    options.tzid = tzid
  }
  options.dtstart = untilStringToDate(dtstart)
  return options
}

function parseLine(rfcString: string) {
  rfcString = rfcString.replace(/^\s+|\s+$/, '')
  if (!rfcString.length) return null

  const header = /^([A-Z]+?)[:;]/.exec(rfcString.toUpperCase())
  if (!header) {
    return parseRrule(rfcString)
  }

  const [, key] = header
  switch (key.toUpperCase()) {
    case 'RRULE':
    case 'EXRULE':
      return parseRrule(rfcString)
    case 'DTSTART':
      return parseDtstart(rfcString)
    default:
      throw new Error(`Unsupported RFC prop ${key} in ${rfcString}`)
  }
}

function parseRrule(line: string) {
  const strippedLine = line.replace(/^RRULE:/i, '')
  const options = parseDtstart(strippedLine)

  const attrs = line.replace(/^(?:RRULE|EXRULE):/i, '').split(';')

  attrs.forEach((attr) => {
    const [key, value] = attr.split('=')
    switch (key.toUpperCase()) {
      case 'FREQ':
        options.freq = Frequency[value.toUpperCase() as keyof typeof Frequency]
        break
      case 'WKST':
        options.wkst = Days[value.toUpperCase() as keyof typeof Days]
        break
      case 'COUNT':
        options.count = parseScalarNumber(key, value)
        break
      case 'INTERVAL':
        options.interval = parseScalarNumber(key, value)
        break
      case 'BYSETPOS':
        options.bysetpos = parseNumberList(key, value)
        break
      case 'BYMONTH':
        options.bymonth = parseNumberList(key, value)
        break
      case 'BYMONTHDAY':
        options.bymonthday = parseNumberList(key, value)
        break
      case 'BYYEARDAY':
        options.byyearday = parseNumberList(key, value)
        break
      case 'BYWEEKNO':
        options.byweekno = parseNumberList(key, value)
        break
      case 'BYHOUR':
        options.byhour = parseNumberList(key, value)
        break
      case 'BYMINUTE':
        options.byminute = parseNumberList(key, value)
        break
      case 'BYSECOND':
        options.bysecond = parseNumberList(key, value)
        break
      case 'BYWEEKDAY':
      case 'BYDAY':
        options.byweekday = parseWeekday(value)
        break
      case 'DTSTART':
      case 'TZID':
        // for backwards compatibility
        const dtstart = parseDtstart(line)
        options.tzid = dtstart.tzid
        options.dtstart = dtstart.dtstart
        break
      case 'UNTIL':
        options.until = untilStringToDate(value)
        break
      case 'BYEASTER':
        options.byeaster = parseScalarNumber(key, value)
        break
      default:
        throw new Error("Unknown RRULE property '" + key + "'")
    }
  })

  return options
}

function parseScalarNumber(key: string, value: string): number {
  if (value.indexOf(',') !== -1) {
    throw new Error(`Invalid ${key} value: expected a single integer, got '${value}'`)
  }
  return parseIndividualNumber(key, value)
}

function parseNumberList(key: string, value: string): number | number[] {
  if (value.indexOf(',') !== -1) {
    return value.split(',').map((v) => parseIndividualNumber(key, v))
  }
  return parseIndividualNumber(key, value)
}

function parseIndividualNumber(key: string, value: string): number {
  if (!/^[+-]?\d+$/.test(value)) {
    throw new Error(`Invalid ${key} value: expected an integer, got '${value}'`)
  }
  return Number(value)
}

function parseWeekday(value: string) {
  const days = value.split(',')

  return days.map((day) => {
    if (day.length === 2) {
      // MO, TU, ...
      return Days[day as keyof typeof Days] // wday instanceof Weekday
    }

    // -1MO, +3FR, 1SO, 13TU ...
    const parts = day.match(/^([+-]?\d{1,2})([A-Z]{2})$/)
    if (!parts || parts.length < 3) {
      throw new SyntaxError(`Invalid weekday string: ${day}`)
    }
    const n = Number(parts[1])
    const wdaypart = parts[2] as keyof typeof Days
    const wday = Days[wdaypart].weekday
    return new Weekday(wday, n)
  })
}
