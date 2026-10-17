import type { AccountKind, CheckStatus, DisputeStatus, PaymentStatus, SourceStatus, VehicleSource } from './types'
import type { NextAction, RecoveryView, ResponsibilityView } from './logic'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

export interface Label {
  text: string
  tone: Tone
}

export const SOURCE_STATUS: Record<SourceStatus, Label> = {
  unpaid: { text: 'Unpaid at source', tone: 'neutral' },
  paid: { text: 'Paid at source', tone: 'success' },
  not_found: { text: 'Not found at source', tone: 'neutral' },
  unknown: { text: 'Unknown (sync failed)', tone: 'warning' },
}

/** Payment confirmed here; the source has not shown it yet. Shown next to the Payment badge. */
export const SOURCE_PENDING: Label = { text: 'Source update pending', tone: 'warning' }

export const RESPONSIBILITY: Record<ResponsibilityView, Label> = {
  suggested: { text: 'Suggested', tone: 'info' },
  needs_review: { text: 'Needs review', tone: 'warning' },
  confirmed: { text: 'Confirmed', tone: 'success' },
  accepted: { text: 'Accepted by party', tone: 'success' },
}

export const DISPUTE: Record<DisputeStatus, Label> = {
  none: { text: 'None', tone: 'neutral' },
  open: { text: 'Dispute open', tone: 'danger' },
  upheld: { text: 'Dispute upheld', tone: 'neutral' },
  not_upheld: { text: 'Dispute not upheld', tone: 'neutral' },
  withdrawn: { text: 'Dispute withdrawn', tone: 'neutral' },
}

export const PAYMENT: Record<PaymentStatus, Label> = {
  not_started: { text: 'Not started', tone: 'neutral' },
  approved: { text: 'Approved', tone: 'info' },
  paid: { text: 'Paid', tone: 'success' },
  failed: { text: 'Failed', tone: 'danger' },
  unconfirmed: { text: 'Unconfirmed', tone: 'warning' },
}

export const RECOVERY: Record<RecoveryView, Label> = {
  not_applicable: { text: 'Not applicable', tone: 'neutral' },
  not_started: { text: 'Not started', tone: 'neutral' },
  awaiting_decision: { text: 'Waiting for responsibility', tone: 'warning' },
  pending: { text: 'Pending', tone: 'warning' },
  paused: { text: 'Paused (dispute open)', tone: 'warning' },
  recovered: { text: 'Recovered', tone: 'success' },
  written_off: { text: 'Written off', tone: 'neutral' },
}

export const NEXT_ACTION: Record<NextAction, Label> = {
  review_contest: { text: 'Review responsibility dispute', tone: 'danger' },
  needs_review: { text: 'Review responsibility', tone: 'warning' },
  confirm_suggestion: { text: 'Review suggestion', tone: 'info' },
  reconcile: { text: 'Reconcile with source', tone: 'warning' },
  check_payment: { text: 'Check payment status', tone: 'warning' },
  payment_failed: { text: 'Payment failed: retry', tone: 'danger' },
  approve_payment: { text: 'Approve payment', tone: 'accent' },
  pay: { text: 'Make payment', tone: 'accent' },
  await_party_payment: { text: 'Record party payment', tone: 'accent' },
  record_recovery: { text: 'Record amount recovery', tone: 'accent' },
  ready_to_close: { text: 'Ready to close', tone: 'success' },
  closed: { text: 'Closed', tone: 'neutral' },
}

/**
 * Short button labels for tables. Each one only opens the page where the step happens, so none of them
 * may read as if clicking it confirms responsibility, approves or pays. The full NEXT_ACTION text stays
 * in the accessible name (see nextActionLabel).
 */
export const NEXT_ACTION_SHORT: Record<NextAction, string> = {
  review_contest: 'Review dispute',
  needs_review: 'Review',
  confirm_suggestion: 'Review suggestion',
  reconcile: 'Reconcile',
  check_payment: 'Check payment',
  payment_failed: 'Retry payment',
  approve_payment: 'Review approval',
  pay: 'Open payment',
  await_party_payment: 'Record payment',
  record_recovery: 'Record recovery',
  ready_to_close: 'Review closure',
  closed: 'Closed',
}

/** Accessible name for a table next-action link: starts with the visible text, then says what the step is. */
export const nextActionLabel = (a: NextAction, ref: string) =>
  NEXT_ACTION_SHORT[a] === NEXT_ACTION[a].text ? `${NEXT_ACTION_SHORT[a]}, challan ${ref}` : `${NEXT_ACTION_SHORT[a]}, challan ${ref}: ${NEXT_ACTION[a].text.toLowerCase()}`

/**
 * Table next actions that touch a payment keep a button. Every other one is routine navigation
 * (open the page to review something) and shows as a quiet text link.
 */
export const PAYMENT_ACTIONS: ReadonlySet<NextAction> = new Set<NextAction>(['payment_failed', 'check_payment', 'pay', 'reconcile', 'await_party_payment'])

/** Shown wherever "Amount recovery" needs explaining. */
export const RECOVERY_HELP = 'Getting the challan amount back from the responsible party after the company pays. It happens outside this platform; you only record the outcome.'
export const DISPUTE_HELP = 'An internal disagreement about who should bear the cost. It is not an official challan dispute, and this platform does not file or resolve disputes with any authority.'

export const CHECK: Record<CheckStatus, Label> = {
  not_checked: { text: 'Not checked yet', tone: 'neutral' },
  checked: { text: 'Checked', tone: 'success' },
  incomplete: { text: 'Check incomplete', tone: 'warning' },
  failed: { text: 'Check failed', tone: 'danger' },
}

export const SOURCE: Record<VehicleSource, string> = {
  seed: 'Sample data',
  manual: 'Manual entry',
  import: 'CSV import',
  owner_api: 'Owner lookup (simulated API)',
}

export function terms(kind: AccountKind) {
  return kind === 'fleet'
    ? { holder: 'Driver', holders: 'Drivers', record: 'Assignment', records: 'Assignments', current: 'Current driver', addRecord: 'Add driver assignment' }
    : { holder: 'Lessee', holders: 'Lessees', record: 'Lease', records: 'Leases', current: 'Current lessee', addRecord: 'Add lease' }
}

/** Supporting copy wherever driver assignments or leases are added. */
export const RECORD_HELP = 'Record who had this vehicle and when. Used to review responsibility for past challans.'
