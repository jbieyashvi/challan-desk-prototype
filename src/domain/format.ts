const TZ = 'Asia/Kolkata'

export function formatRegistration(reg: string): string {
  const m = reg.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : reg
}

export function normaliseRegistration(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export const REG_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/

export function isValidRegistration(normalised: string): boolean {
  return REG_PATTERN.test(normalised)
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatMinutes(mins: number): string {
  const m = Math.round(Math.abs(mins))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h < 48) return r ? `${h} h ${r} min` : `${h} h`
  return `${Math.round(h / 24)} days`
}

export function nowIso(): string {
  return new Date().toISOString()
}
