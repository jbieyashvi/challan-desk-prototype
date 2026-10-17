import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSeed, SEED_VERSION } from './seed'
import type { ActivityEntry, Assignment, Challan, DemoState, PartyKind, Payer, SimSettings, SourceRecheckResult, Vehicle } from '../domain/types'
import { party } from '../domain/logic'
import { formatAmount, nowIso } from '../domain/format'

const KEY = 'challan-desk-demo'

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === SEED_VERSION) return parsed
    }
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return createSeed()
}

let idCounter = 0
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`

const entry = (actor: ActivityEntry['actor'], title: string, detail?: string, tone?: ActivityEntry['tone']): ActivityEntry => ({
  id: uid('act'),
  at: nowIso(),
  actor,
  title,
  detail,
  tone,
})

export type NewVehicle = Pick<Vehicle, 'registration' | 'vehicleType' | 'registeredOwner'>

function useDemoStore() {
  const [state, setState] = useState<DemoState>(load)
  const adopted = useRef<DemoState | null>(null)

  useEffect(() => {
    if (state === adopted.current) return // came from another tab: already saved there
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  // Another tab saved newer demo data: adopt it, so this tab's next save does not overwrite it with stale state.
  // Each tab keeps its own workspace, so two tabs on different companies do not switch each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as DemoState
        if (parsed.version !== SEED_VERSION) return
        setState((prev) => (adopted.current = { ...parsed, currentAccountId: prev.currentAccountId }))
      } catch {
        /* ignore malformed data */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updateChallan = useCallback((id: string, fn: (c: Challan, s: DemoState) => Challan) => {
    setState((s) => ({ ...s, challans: s.challans.map((c) => (c.id === id ? fn(structuredClone(c), s) : c)) }))
  }, [])

  const log = (c: Challan, e: ActivityEntry): Challan => ({ ...c, activity: [...c.activity, e] })

  const actions = useMemo(
    () => ({
      switchAccount(id: string) {
        setState((s) => (s.currentAccountId === id ? s : { ...s, currentAccountId: id }))
      },
      reset() {
        try {
          localStorage.removeItem(KEY)
        } catch {
          /* ignore */
        }
        setState(createSeed())
      },
      setSim(patch: Partial<SimSettings>) {
        setState((s) => ({ ...s, sim: { ...s.sim, ...patch } }))
      },
      addVehicles(list: NewVehicle[], source: Vehicle['source']): string[] {
        const ids = list.map(() => uid('veh'))
        setState((s) => ({
          ...s,
          vehicles: [
            ...s.vehicles,
            ...list.map((v, i) => ({
              ...v,
              id: ids[i],
              accountId: s.currentAccountId,
              source,
              addedAt: nowIso(),
              check: { status: 'not_checked' as const },
            })),
          ],
        }))
        return ids
      },
      setVehicleCheck(vehicleId: string, status: Vehicle['check']['status']) {
        setState((s) => ({
          ...s,
          // A failed or incomplete check never clears what an earlier complete check found.
          vehicles: s.vehicles.map((v) => {
            if (v.id !== vehicleId) return v
            const at = nowIso()
            return { ...v, check: { status, at, lastCompleteAt: status === 'checked' ? at : v.check.lastCompleteAt } }
          }),
        }))
      },
      /** Simulated check result: adds fictional sample challans to a vehicle. Returns their ids. */
      addFoundChallans(vehicleId: string, count: number): string[] {
        const ids = Array.from({ length: count }, () => uid('c'))
        const SAMPLES = [
          { offence: 'Signal violation', location: 'Station Junction, Sample City', amount: 1000, hour: '18:40' },
          { offence: 'Parking in a no-parking zone', location: 'Market Road, Sample City', amount: 500, hour: '10:15' },
          { offence: 'Speed limit exceeded', location: 'Ring Road, Sample City', amount: 2000, hour: '07:50' },
        ]
        setState((s) => {
          const existing = s.challans.filter((c) => c.vehicleId === vehicleId).length
          const day = 86_400_000
          const istDate = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10)
          const found: Challan[] = ids.map((id, i) => {
            const sample = SAMPLES[(existing + i) % SAMPLES.length]
            const at = nowIso()
            return {
              id,
              ref: `SAMPLE-N-${String(Math.floor(1000 + Math.random() * 9000))}`,
              vehicleId,
              violationAt: `${istDate(Date.now() - (4 + i * 6) * day)}T${sample.hour}:00+05:30`,
              timePrecision: 'exact',
              offence: sample.offence,
              location: sample.location,
              amount: sample.amount,
              dueDate: istDate(Date.now() + (25 - i * 10) * day),
              sourceStatus: 'unpaid',
              lastSyncedAt: at,
              discoveredAt: at,
              responsibility: { status: 'pending' },
              dispute: { status: 'none' },
              payment: { status: 'not_started', payer: 'company', attempts: 0 },
              recovery: { record: 'none' },
              closure: { closed: false },
              activity: [entry('Simulated sync', 'Challan discovered', 'Found during a simulated challan check for this vehicle. Sample data, not a real challan.', 'info')],
            }
          })
          return { ...s, challans: [...s.challans, ...found] }
        })
        return ids
      },
      /** Adds a driver or lessee for this demo account. Name and reference are fictional placeholders. */
      addParty(accountId: string, name: string, reference: string, kind: Exclude<PartyKind, 'company'>): string {
        const id = uid('pty')
        setState((s) => ({ ...s, parties: [...s.parties, { id, accountId, name, reference, kind }] }))
        return id
      },
      addAssignment(a: Omit<Assignment, 'id' | 'enteredAt' | 'enteredBy'>) {
        setState((s) => ({ ...s, assignments: [...s.assignments, { ...a, id: uid('asg'), enteredAt: nowIso(), enteredBy: 'Operator' }] }))
      },
      decide(challanId: string, partyId: string, reason: string, kind: 'confirm' | 'override') {
        updateChallan(challanId, (c, s) => {
          const name = party(s, partyId)?.name ?? 'Unknown party'
          const prev = c.responsibility.partyId
          let next = log(c, entry('Operator', `Responsibility ${kind === 'override' ? 'set' : 'confirmed'}: ${name}`, `Reason: ${reason}`, 'success'))
          if (c.dispute.status === 'open') {
            const upheld = c.dispute.contestedPartyId !== partyId
            next = log(next, entry('Operator', upheld ? 'Responsibility dispute resolved: upheld' : 'Responsibility dispute resolved: not upheld',
              upheld ? `Responsibility moved from ${party(s, c.dispute.contestedPartyId)?.name ?? 'previous party'} to ${name}.` : `${name} remains responsible after review.`))
            next.dispute = { ...c.dispute, status: upheld ? 'upheld' : 'not_upheld' }
          } else if (prev && prev !== partyId) {
            next = log(next, entry('System', 'Previous decision kept in history', `Was: ${party(s, prev)?.name}.`))
          }
          next.responsibility = { status: 'confirmed', partyId }
          return next
        })
      },
      leaveUnresolved(challanId: string, note: string) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Operator', 'Left unresolved', `Reason: ${note}`, 'warning'))
          next.responsibility = { ...c.responsibility, status: 'pending', reviewNote: note }
          return next
        })
      },
      recordAcceptance(challanId: string, note: string) {
        updateChallan(challanId, (c, s) => {
          const next = log(c, entry('Operator', `Party acceptance recorded: ${party(s, c.responsibility.partyId)?.name}`, note || 'Recorded by operator after contact outside the platform.'))
          next.responsibility = { ...c.responsibility, status: 'accepted' }
          return next
        })
      },
      recordContest(challanId: string, reason: string) {
        updateChallan(challanId, (c, s) => {
          const contested = c.responsibility.partyId
          let next = log(c, entry('Operator', `Responsibility dispute recorded by ${party(s, contested)?.name}`,
            `${reason}\nThis is an internal responsibility dispute. It is not an official challan dispute and was not filed with, or accepted by, any authority.`, 'danger'))
          next = log(next, entry('System', 'Returned to review', 'Previous decision kept in history. Amount recovery from this party is paused.'))
          next.dispute = { status: 'open', contestedPartyId: contested, reason }
          next.responsibility = { status: 'pending', partyId: undefined, reviewNote: 'Returned to review after a responsibility dispute.' }
          return next
        })
      },
      withdrawContest(challanId: string, note: string) {
        updateChallan(challanId, (c, s) => {
          const next = log(c, entry('Operator', 'Responsibility dispute withdrawn', note))
          next.dispute = { ...c.dispute, status: 'withdrawn' }
          next.responsibility = { status: 'confirmed', partyId: c.dispute.contestedPartyId }
          if (!party(s, c.dispute.contestedPartyId)) next.responsibility = { status: 'pending' }
          return next
        })
      },
      reopenDecision(challanId: string, reason: string) {
        updateChallan(challanId, (c, s) => {
          const next = log(c, entry('Operator', 'Decision reopened', `Was: ${party(s, c.responsibility.partyId)?.name}. Reason: ${reason}`, 'warning'))
          next.responsibility = { status: 'pending', reviewNote: reason }
          return next
        })
      },
      setPayer(challanId: string, payer: Payer) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Operator', payer === 'company' ? 'Payer set: company pays the authority' : 'Payer set: responsible party pays directly'))
          next.payment = { ...c.payment, payer }
          return next
        })
      },
      approvePayment(challanId: string) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Approver', 'Payment approved', `Payer: company. Amount ${formatAmount(c.amount)}.`))
          next.payment = { ...c.payment, status: 'approved' }
          return next
        })
      },
      paymentResult(challanId: string, outcome: 'success' | 'failure' | 'unconfirmed') {
        updateChallan(challanId, (c, s) => {
          const at = nowIso()
          const attempts = c.payment.attempts + 1
          const company = s.accounts.find((a) => a.id === s.currentAccountId)?.name
          if (outcome === 'success') {
            const reference = `SIM-PAY-${String(1000 + Math.floor(Math.random() * 9000))}`
            const next = log(c, entry('Simulated payment service', 'Payment confirmed', `Reference ${reference}. Amount ${formatAmount(c.amount)}.`, 'success'))
            next.payment = { ...c.payment, status: 'paid', method: 'simulated', reference, paidAt: at, paidBy: company, attempts, lastAttemptAt: at, failureReason: undefined }
            return next
          }
          if (outcome === 'failure') {
            const next = log(c, entry('Simulated payment service', 'Payment failed', 'Simulated: payment declined by the payment service. Not marked as paid.', 'danger'))
            next.payment = { ...c.payment, status: 'failed', attempts, lastAttemptAt: at, failureReason: 'Simulated: payment declined by the payment service.' }
            return next
          }
          const next = log(c, entry('Simulated payment service', 'Payment outcome unconfirmed', 'No confirmation received (simulated timeout). Not marked as paid. Check status before retrying.', 'warning'))
          next.payment = { ...c.payment, status: 'unconfirmed', attempts, lastAttemptAt: at }
          return next
        })
      },
      checkPaymentStatus(challanId: string, result: 'paid' | 'not_paid') {
        updateChallan(challanId, (c, s) => {
          const company = s.accounts.find((a) => a.id === s.currentAccountId)?.name
          if (result === 'paid') {
            const reference = `SIM-PAY-${String(1000 + Math.floor(Math.random() * 9000))}`
            const next = log(c, entry('Simulated payment service', 'Status check: payment confirmed', `The earlier attempt went through. Reference ${reference}.`, 'success'))
            next.payment = { ...c.payment, status: 'paid', method: 'simulated', reference, paidAt: c.payment.lastAttemptAt ?? nowIso(), paidBy: company }
            return next
          }
          const next = log(c, entry('Simulated payment service', 'Status check: no payment found', 'The earlier attempt did not go through. Safe to retry.', 'danger'))
          next.payment = { ...c.payment, status: 'failed', failureReason: 'Status check found no completed payment.' }
          return next
        })
      },
      recordExternalPayment(challanId: string, data: { reference: string; paidBy: string; date: string; note: string }) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Operator', 'External payment recorded (operator-recorded)',
            `Paid by ${data.paidBy}. Reference ${data.reference}.${data.note ? ` Note: ${data.note}` : ''}`, 'success'))
          next.payment = { ...c.payment, status: 'paid', method: 'operator_recorded', reference: data.reference, paidBy: data.paidBy, paidAt: new Date(data.date).toISOString() }
          return next
        })
      },
      recordRecovery(challanId: string, reference: string, outcome: 'recovered' | 'written_off' = 'recovered') {
        updateChallan(challanId, (c, s) => {
          const name = party(s, c.responsibility.partyId)?.name
          const next = outcome === 'recovered'
            ? log(c, entry('Operator', `Amount recovered from ${name}`, `Reference ${reference}. Recovered outside this platform.`, 'success'))
            : log(c, entry('Operator', `Amount recovery written off (${name})`, `Reason: ${reference}. The company bears the cost.`, 'warning'))
          next.recovery = { record: outcome, reference, at: nowIso() }
          return next
        })
      },
      closeCase(challanId: string, outcome: string) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Operator', 'Case closed', `Outcome: ${outcome}.`))
          next.closure = { closed: true, outcome, at: nowIso() }
          return next
        })
      },
      reopenCase(challanId: string, reason: string) {
        updateChallan(challanId, (c) => {
          const next = log(c, entry('Operator', 'Case reopened', `Reason: ${reason}`, 'warning'))
          next.closure = { closed: false }
          return next
        })
      },
      /**
       * Simulated source re-check. Only a successful source response changes the source status;
       * a failed re-check changes nothing. Payment records are never touched here.
       */
      syncSource(challanId: string, result: SourceRecheckResult) {
        updateChallan(challanId, (c) => {
          if (result === 'failed') {
            return log(c, entry('Simulated sync', 'Source re-check failed', 'No response from the source. Source status and last check unchanged.', 'warning'))
          }
          const changed = c.sourceStatus !== result
          const title = changed
            ? `Source status changed to ${result === 'paid' ? 'Paid' : 'Unpaid'} at source`
            : `Source re-checked: still ${result === 'paid' ? 'paid' : 'unpaid'} at source`
          const next = log(c, entry('Simulated sync', title, undefined, changed && result === 'paid' ? 'success' : undefined))
          next.lastSyncedAt = nowIso()
          next.sourceStatus = result
          return next
        })
      },
    }),
    [updateChallan],
  )

  return { state, ...actions }
}

type Store = ReturnType<typeof useDemoStore>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useDemoStore()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

/** Data scoped to the active workspace. */
export function useWorkspace() {
  const store = useStore()
  const { state } = store
  return useMemo(() => {
    const account = state.accounts.find((a) => a.id === state.currentAccountId)!
    const vehicles = state.vehicles.filter((v) => v.accountId === account.id)
    const vIds = new Set(vehicles.map((v) => v.id))
    const challans = state.challans.filter((c) => vIds.has(c.vehicleId))
    const parties = state.parties.filter((p) => p.accountId === account.id)
    return { account, vehicles, challans, parties }
  }, [state])
}
