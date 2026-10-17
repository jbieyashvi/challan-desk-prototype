// Derived logic. Nothing here decides legal liability. It only proposes an
// internal attribution from the company's own assignment records.
import type { Assignment, Challan, DemoState, Party, Vehicle } from './types'

export const NEAR_HANDOVER_MINUTES = 30 // DL-07, proposed and unvalidated

export type MatchKind = 'single' | 'near_handover' | 'none' | 'overlap' | 'date_only' | 'no_records'

export interface MatchResult {
  kind: MatchKind
  /** The record covering the violation time, only when exactly one does. */
  primary?: Assignment
  /** Every record the operator should compare. */
  candidates: Assignment[]
  before?: Assignment
  after?: Assignment
  minutesToBoundary?: number
}

const t = (iso: string) => new Date(iso).getTime()
const MIN = 60_000

export function vehicleAssignments(state: DemoState, vehicleId: string): Assignment[] {
  return state.assignments.filter((a) => a.vehicleId === vehicleId).sort((x, y) => t(x.start) - t(y.start))
}

export function covers(a: Assignment, at: number): boolean {
  return t(a.start) <= at && (a.end === null || at < t(a.end))
}

export function matchChallan(state: DemoState, c: Challan): MatchResult {
  const list = vehicleAssignments(state, c.vehicleId)
  if (list.length === 0) return { kind: 'no_records', candidates: [] }
  const at = t(c.violationAt)

  if (c.timePrecision === 'date') {
    const dayStart = at
    const dayEnd = at + 24 * 60 * MIN
    const sameDay = list.filter((a) => t(a.start) < dayEnd && (a.end === null || t(a.end) > dayStart))
    return { kind: 'date_only', candidates: sameDay }
  }

  const covering = list.filter((a) => covers(a, at))
  const before = [...list].reverse().find((a) => a.end !== null && t(a.end) <= at)
  const after = list.find((a) => t(a.start) > at)

  if (covering.length > 1) return { kind: 'overlap', candidates: covering }
  if (covering.length === 0) return { kind: 'none', candidates: [], before, after }

  const only = covering[0]
  const toStart = (at - t(only.start)) / MIN
  const toEnd = only.end ? (t(only.end) - at) / MIN : Infinity
  if (toEnd <= NEAR_HANDOVER_MINUTES && after && t(after.start) - t(only.end!) <= NEAR_HANDOVER_MINUTES * MIN) {
    return { kind: 'near_handover', candidates: [only, after], minutesToBoundary: toEnd, primary: only }
  }
  if (toStart <= NEAR_HANDOVER_MINUTES && before && t(only.start) - t(before.end!) <= NEAR_HANDOVER_MINUTES * MIN) {
    return { kind: 'near_handover', candidates: [before, only], minutesToBoundary: toStart, primary: only }
  }
  return { kind: 'single', primary: only, candidates: [only], before, after }
}

export function currentAssignment(state: DemoState, vehicleId: string, now = Date.now()): Assignment | undefined {
  return vehicleAssignments(state, vehicleId).find((a) => covers(a, now))
}

export function party(state: DemoState, id?: string): Party | undefined {
  return id ? state.parties.find((p) => p.id === id) : undefined
}

export function vehicle(state: DemoState, id: string): Vehicle | undefined {
  return state.vehicles.find((v) => v.id === id)
}

export const MATCH_COPY: Record<MatchKind, { title: string; body: string }> = {
  single: {
    title: 'One record covers the violation time',
    body: 'Suggested from the record active at the violation timestamp. This is evidence from your own records, not a legal finding. Please review before confirming.',
  },
  near_handover: {
    title: 'Violation is close to a handover',
    body: `The violation is within ${NEAR_HANDOVER_MINUTES} minutes of a recorded handover. No party is preselected. Compare the evidence and choose.`,
  },
  none: {
    title: 'No record covers the violation time',
    body: 'There is a gap in the records at this time. No party is preselected. Check the nearest records, add the missing record, or choose a party with a reason.',
  },
  overlap: {
    title: 'Records overlap at the violation time',
    body: 'More than one record covers this time. No party is preselected. Check where each record came from before choosing.',
  },
  date_only: {
    title: 'Violation time is incomplete',
    body: 'The source gives a date but no time of day. Every record active that day is shown. No party is preselected.',
  },
  no_records: {
    title: 'No assignment or lease records for this vehicle',
    body: 'Add the history for this vehicle, or choose a party with a reason.',
  },
}

// ---------- Status dimensions ----------

export type ResponsibilityView = 'suggested' | 'needs_review' | 'confirmed' | 'accepted'

export function responsibilityView(state: DemoState, c: Challan): ResponsibilityView {
  if (c.responsibility.status === 'confirmed') return 'confirmed'
  if (c.responsibility.status === 'accepted') return 'accepted'
  if (c.dispute.status === 'open' || c.responsibility.reviewNote) return 'needs_review'
  return matchChallan(state, c).kind === 'single' ? 'suggested' : 'needs_review'
}

export type RecoveryView = 'not_applicable' | 'not_started' | 'awaiting_decision' | 'pending' | 'paused' | 'recovered' | 'written_off'

export function recoveryView(state: DemoState, c: Challan): RecoveryView {
  if (c.recovery.record === 'recovered') return 'recovered'
  if (c.recovery.record === 'written_off') return 'written_off'
  if (c.payment.payer === 'responsible_party') return 'not_applicable'
  const p = party(state, c.responsibility.partyId)
  const decided = c.responsibility.status !== 'pending'
  if (decided && p?.kind === 'company') return 'not_applicable'
  if (c.payment.status !== 'paid') return 'not_started'
  if (c.dispute.status === 'open') return 'paused'
  if (!decided) return 'awaiting_decision'
  return 'pending'
}

export function needsReconcile(c: Challan): boolean {
  return c.sourceStatus === 'paid' && c.payment.status !== 'paid'
}

/**
 * Payment is confirmed here, but the latest source record does not show it yet.
 * Provisional rule (docs/03 §13): the case may still close; this stays visible and filterable after closure.
 */
export function isSourceUpdatePending(c: Challan): boolean {
  return c.payment.status === 'paid' && (c.sourceStatus === 'unpaid' || c.sourceStatus === 'unknown')
}

export type NextAction =
  | 'closed'
  | 'review_contest'
  | 'needs_review'
  | 'confirm_suggestion'
  | 'reconcile'
  | 'check_payment'
  | 'payment_failed'
  | 'approve_payment'
  | 'pay'
  | 'await_party_payment'
  | 'record_recovery'
  | 'ready_to_close'

export function nextAction(state: DemoState, c: Challan): NextAction {
  if (c.closure.closed) return 'closed'
  if (c.dispute.status === 'open') return 'review_contest'
  const r = responsibilityView(state, c)
  if (r === 'needs_review') return 'needs_review'
  if (r === 'suggested') return 'confirm_suggestion'
  if (needsReconcile(c)) return 'reconcile'
  if (c.payment.status === 'unconfirmed') return 'check_payment'
  if (c.payment.status === 'failed') return 'payment_failed'
  if (c.payment.status === 'not_started') return c.payment.payer === 'company' ? 'approve_payment' : 'await_party_payment'
  if (c.payment.status === 'approved') return 'pay'
  if (recoveryView(state, c) === 'pending') return 'record_recovery'
  return 'ready_to_close'
}

/** Where the next action is performed: responsibility (screen 5) or payment (screen 6). */
export function actionTarget(a: NextAction): 'responsibility' | 'payment' {
  return a === 'review_contest' || a === 'needs_review' || a === 'confirm_suggestion' ? 'responsibility' : 'payment'
}

export interface CloseCheck {
  label: string
  ok: boolean
}

export function closeChecks(state: DemoState, c: Challan): CloseCheck[] {
  const rv = recoveryView(state, c)
  return [
    { label: 'Responsibility confirmed by an operator', ok: c.responsibility.status !== 'pending' },
    { label: 'No open responsibility dispute', ok: c.dispute.status !== 'open' },
    { label: 'Payment confirmed (simulated or operator-recorded)', ok: c.payment.status === 'paid' },
    { label: 'Amount recovery recorded or not applicable', ok: rv === 'recovered' || rv === 'written_off' || rv === 'not_applicable' },
  ]
}

export function suggestedOutcome(state: DemoState, c: Challan): string {
  const p = party(state, c.responsibility.partyId)
  if (c.payment.payer === 'responsible_party') return 'Paid directly by responsible party'
  if (p?.kind === 'company') return 'Absorbed by company'
  if (c.recovery.record === 'recovered') return 'Settled and recovered'
  if (c.recovery.record === 'written_off') return 'Settled by company, recovery written off'
  return 'Settled by company'
}

export function isOutstanding(c: Challan): boolean {
  return !c.closure.closed && c.payment.status !== 'paid'
}

// ---------- Shared selectors ----------
// Every count on the dashboard, in the sidebar and behind a list filter uses one
// of these, so a number and the list it opens can never disagree.

/** Open, and records conflict, are missing, or a dispute is open. Includes nothing suggested. */
export function isNeedsReview(state: DemoState, c: Challan): boolean {
  return !c.closure.closed && responsibilityView(state, c) === 'needs_review'
}

/** Open, and no operator has confirmed responsibility yet (needs review + suggested). */
export function isUnresolved(c: Challan): boolean {
  return !c.closure.closed && c.responsibility.status === 'pending'
}

/** Open, and the last payment attempt is unconfirmed or failed. Never counted as paid. */
export function isPaymentAttention(c: Challan): boolean {
  return !c.closure.closed && (c.payment.status === 'unconfirmed' || c.payment.status === 'failed')
}

/** Vehicles whose latest challan check failed or was incomplete. */
export function hasCheckIssue(v: Vehicle): boolean {
  return v.check.status === 'failed' || v.check.status === 'incomplete'
}

// ---------- What we know about a vehicle's challans ----------

export type ChallanCountKind = 'verified' | 'not_verified' | 'stale'

export interface ChallanCountView {
  kind: ChallanCountKind
  /** Open challans known to this platform. Only meaningful when kind is not 'not_verified'. */
  open: number
  /** Closed challans known to this platform. */
  closed: number
  /** Total known challans (open + closed). */
  known: number
  /** Status of the latest check, for the stale note. */
  checkStatus: Vehicle['check']['status']
}

/**
 * verified: the latest check completed, so the count is reliable (it can be 0).
 * stale: the latest check failed or was incomplete, but challans found earlier are still shown.
 * not_verified: no complete check and no known challans, so the count is unknown, not zero.
 */
export function challanCountView(state: DemoState, v: Vehicle): ChallanCountView {
  const linked = state.challans.filter((c) => c.vehicleId === v.id)
  const open = linked.filter((c) => !c.closure.closed).length
  const closed = linked.length - open
  const checkStatus = v.check.status
  if (checkStatus === 'checked') return { kind: 'verified', open, closed, known: linked.length, checkStatus }
  if (linked.length > 0) return { kind: 'stale', open, closed, known: linked.length, checkStatus }
  return { kind: 'not_verified', open: 0, closed: 0, known: 0, checkStatus }
}

/**
 * The one wording for a vehicle's challan counts, used on Vehicles and vehicle details.
 * "No challans found" only after a complete check; "Not verified" is unknown, never zero.
 */
export function challanCountText(cv: ChallanCountView): { text: string; note?: string } {
  if (cv.kind === 'not_verified') return { text: 'Not verified', note: 'Unknown, not zero' }
  if (cv.kind === 'verified' && cv.known === 0) return { text: 'No challans found' }
  const text = cv.closed > 0 ? `${cv.open} open · ${cv.closed} closed` : `${cv.open} open`
  if (cv.kind !== 'stale') return { text }
  const why = cv.checkStatus === 'failed' ? 'Latest check failed' : cv.checkStatus === 'incomplete' ? 'Latest check incomplete' : 'Not checked yet'
  return { text, note: `${why} · may be out of date` }
}

// ---------- Work queue ----------

/**
 * Work-queue groups, in the order they are listed. The rule is stated on the Overview:
 * payment problems first (a retry without a status check could pay twice), then disputes,
 * then responsibility decisions, then routine payment steps, then wrap-up. Within a group,
 * the earliest due date comes first.
 */
export type QueueGroup = 'payment_problem' | 'dispute' | 'responsibility' | 'payment' | 'wrap_up'
export const QUEUE_GROUP_ORDER: QueueGroup[] = ['payment_problem', 'dispute', 'responsibility', 'payment', 'wrap_up']
export const QUEUE_GROUP_LABEL: Record<QueueGroup, string> = {
  payment_problem: 'Payment problem',
  dispute: 'Dispute',
  responsibility: 'Responsibility',
  payment: 'Payment',
  wrap_up: 'Wrap-up',
}

export interface QueueItem {
  c: Challan
  group: QueueGroup
  /** The action shown for this row. Payment problems override a pending responsibility step. */
  action: NextAction
  /** Short, factual reason the row is in the queue. */
  reason: string
}

const DAY = 24 * 60 * MIN

/** Whole days from today to the due date (negative when overdue). */
export function daysUntilDue(c: Challan, now = Date.now()): number | undefined {
  if (!c.dueDate) return undefined
  // Calendar days in IST, the zone used across the prototype.
  const today = new Date(now + 330 * MIN).toISOString().slice(0, 10)
  return Math.round((Date.parse(c.dueDate) - Date.parse(today)) / DAY)
}

export function queueItem(state: DemoState, c: Challan): QueueItem {
  const p = c.payment
  if (p.status === 'unconfirmed') return { c, group: 'payment_problem', action: 'check_payment', reason: 'Payment outcome unknown. Check status before any retry.' }
  if (p.status === 'failed') return { c, group: 'payment_problem', action: 'payment_failed', reason: 'Payment failed. Not paid.' }
  if (needsReconcile(c)) return { c, group: 'payment_problem', action: 'reconcile', reason: 'Source shows paid; no payment recorded here.' }
  const action = nextAction(state, c)
  if (action === 'review_contest') return { c, group: 'dispute', action, reason: `${party(state, c.dispute.contestedPartyId)?.name ?? 'The party'} disputes responsibility.` }
  if (action === 'needs_review' || action === 'confirm_suggestion') {
    const m = matchChallan(state, c)
    const reason = c.responsibility.reviewNote
      ? `Left pending: ${c.responsibility.reviewNote}`
      : action === 'confirm_suggestion'
        ? 'One record covers the violation. Suggestion to confirm.'
        : m.kind === 'near_handover'
          ? `Violation ${Math.round(m.minutesToBoundary ?? 0)} min from a handover.`
          : m.kind === 'overlap'
            ? 'Two records cover the violation time.'
            : m.kind === 'none'
              ? 'No record covers the violation time.'
              : m.kind === 'date_only'
                ? 'Source gives the date only, not the time.'
                : 'No records for this vehicle.'
    return { c, group: 'responsibility', action, reason }
  }
  if (action === 'approve_payment') return { c, group: 'payment', action, reason: 'Responsibility settled. Payment not approved yet.' }
  if (action === 'pay') return { c, group: 'payment', action, reason: 'Approved. Not paid yet.' }
  if (action === 'await_party_payment') return { c, group: 'payment', action, reason: 'Responsible party pays directly. No proof recorded yet.' }
  if (action === 'record_recovery') return { c, group: 'wrap_up', action, reason: 'Company paid. Recovery not recorded.' }
  return { c, group: 'wrap_up', action, reason: 'All requirements met.' }
}

export function workQueue(state: DemoState, challans: Challan[]): QueueItem[] {
  const due = (c: Challan) => c.dueDate ?? '9999-12-31'
  return challans
    .filter((c) => !c.closure.closed)
    .map((c) => queueItem(state, c))
    .sort((x, y) =>
      QUEUE_GROUP_ORDER.indexOf(x.group) - QUEUE_GROUP_ORDER.indexOf(y.group) ||
      due(x.c).localeCompare(due(y.c)) ||
      x.c.violationAt.localeCompare(y.c.violationAt))
}
