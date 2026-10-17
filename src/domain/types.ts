// Core prototype model. See docs/02-journeys-workflows-edge-cases.md §5.
// All statuses are design assumptions, not official classifications.

export type AccountKind = 'fleet' | 'leasing'

export interface Account {
  id: string
  name: string
  kind: AccountKind
}

export type PartyKind = 'driver' | 'lessee' | 'company'

export interface Party {
  id: string
  accountId: string
  name: string
  kind: PartyKind
  /** Fictional reference only, never a real contact detail. */
  reference: string
}

export type VehicleSource = 'seed' | 'manual' | 'import' | 'owner_api'

export type CheckStatus = 'not_checked' | 'checked' | 'incomplete' | 'failed'

export interface ChallanCheck {
  /** Outcome of the latest check. */
  status: CheckStatus
  at?: string
  /** When a check last completed successfully. Kept when a later check fails, so earlier results are not lost. */
  lastCompleteAt?: string
}

export interface Vehicle {
  id: string
  accountId: string
  /** Normalised: uppercase, no spaces or hyphens. */
  registration: string
  vehicleType: string
  registeredOwner: string
  source: VehicleSource
  addedAt: string
  check: ChallanCheck
}

export interface Assignment {
  id: string
  vehicleId: string
  partyId: string
  /** "Assignment" for fleet shifts, "Lease" for leasing. */
  ref: string
  start: string
  end: string | null
  enteredAt: string
  enteredBy: string
  note?: string
  /** A handover time stated in the note, when it differs from the recorded start/end. Shown as a conflict. */
  noteHandoverAt?: string
}

export type SourceStatus = 'unpaid' | 'paid' | 'not_found' | 'unknown'

export type ResponsibilityStatus = 'pending' | 'confirmed' | 'accepted'

export interface Responsibility {
  status: ResponsibilityStatus
  partyId?: string
  /** Set when an operator chose "leave unresolved" or a responsibility dispute returned it to review. */
  reviewNote?: string
}

export type DisputeStatus = 'none' | 'open' | 'upheld' | 'not_upheld' | 'withdrawn'

export interface Dispute {
  status: DisputeStatus
  contestedPartyId?: string
  reason?: string
}

export type PaymentStatus = 'not_started' | 'approved' | 'paid' | 'failed' | 'unconfirmed'

export type Payer = 'company' | 'responsible_party'

export interface Payment {
  status: PaymentStatus
  payer: Payer
  method?: 'simulated' | 'operator_recorded'
  reference?: string
  paidAt?: string
  paidBy?: string
  lastAttemptAt?: string
  failureReason?: string
  attempts: number
}

export type RecoveryRecord = 'none' | 'recovered' | 'written_off'

export interface Closure {
  closed: boolean
  outcome?: string
  at?: string
}

export type Actor = 'System' | 'Operator' | 'Approver' | 'Simulated payment service' | 'Simulated sync'

export interface ActivityEntry {
  id: string
  at: string
  actor: Actor
  title: string
  detail?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

export interface Challan {
  id: string
  ref: string
  vehicleId: string
  violationAt: string
  /** "date" means the source gave a date with no time of day. */
  timePrecision: 'exact' | 'date'
  offence: string
  location: string
  amount: number
  dueDate?: string
  sourceStatus: SourceStatus
  lastSyncedAt: string
  discoveredAt: string
  responsibility: Responsibility
  dispute: Dispute
  payment: Payment
  recovery: { record: RecoveryRecord; reference?: string; at?: string }
  closure: Closure
  activity: ActivityEntry[]
}

export interface SimSettings {
  /** 'found' adds fictional sample challans to the checked vehicle. */
  vehicleCheck: 'found' | 'none_found' | 'failed' | 'incomplete'
}

/** Prototype only: what a simulated "Re-check source" returns. A failed re-check changes nothing. */
export type SourceRecheckResult = 'paid' | 'unpaid' | 'failed'

export interface DemoState {
  version: number
  currentAccountId: string
  accounts: Account[]
  parties: Party[]
  vehicles: Vehicle[]
  assignments: Assignment[]
  challans: Challan[]
  sim: SimSettings
}
