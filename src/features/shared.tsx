// Helpers shared by several screens.
import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { StatusBadge } from '../components/Badge'
import { formatRegistration } from '../domain/format'
import { ActionLink, ButtonLink } from '../components/Button'
import { DISPUTE, NEXT_ACTION, NEXT_ACTION_SHORT, nextActionLabel, PAYMENT, PAYMENT_ACTIONS, RESPONSIBILITY, SOURCE_STATUS } from '../domain/labels'
import { actionTarget, matchChallan, nextAction, party, responsibilityView, type NextAction } from '../domain/logic'
import type { Challan, DemoState, Vehicle } from '../domain/types'

/** Detail pages switch the workspace to the record's own account, so deep links always work. */
export function useAccountFor(accountId: string | undefined) {
  const { state, switchAccount } = useStore()
  useEffect(() => {
    if (accountId && accountId !== state.currentAccountId) switchAccount(accountId)
  }, [accountId, state.currentAccountId, switchAccount])
}

export function nextActionHref(state: DemoState, c: Challan) {
  const a = nextAction(state, c)
  if (a === 'closed') return `/challans/${c.id}`
  return actionTarget(a) === 'responsibility' ? `/challans/${c.id}#responsibility` : `/challans/${c.id}/payment`
}

/** Next-action cell for tables: a button for payment steps, a quiet arrow link for everything else. */
export function NextActionCell({ action, to, state, challanRef }: { action: NextAction; to: string; state?: unknown; challanRef: string }) {
  if (action === 'closed') return <span className="muted">Closed</span>
  const props = { to, state, 'aria-label': nextActionLabel(action, challanRef), title: NEXT_ACTION[action].text }
  return PAYMENT_ACTIONS.has(action)
    ? <ButtonLink {...props} size="sm">{NEXT_ACTION_SHORT[action]}</ButtonLink>
    : <ActionLink {...props}>{NEXT_ACTION_SHORT[action]}</ActionLink>
}

export function RegLink({ id, registration, state }: { id: string; registration: string; state?: unknown }) {
  return (
    <Link to={`/vehicles/${id}`} state={state} className="reg" aria-label={`Vehicle ${formatRegistration(registration)}`}>
      {formatRegistration(registration)}
    </Link>
  )
}

/** Holder at the violation time as the records show it. Never a final decision. */
export function holderAtViolation(state: DemoState, c: Challan): { text: string; tone: 'ok' | 'unclear' } {
  const m = matchChallan(state, c)
  if (m.kind === 'single' && m.primary) return { text: party(state, m.primary.partyId)?.name ?? '—', tone: 'ok' }
  const label: Record<string, string> = {
    near_handover: 'Unclear: near a handover',
    overlap: 'Unclear: records overlap',
    none: 'No record at that time',
    date_only: 'Unclear: time missing',
    no_records: 'No records',
  }
  return { text: label[m.kind], tone: 'unclear' }
}

export function StatusSet({ c, state, show = ['source', 'responsibility', 'dispute', 'payment'] }: {
  c: Challan
  state: DemoState
  show?: ('source' | 'responsibility' | 'dispute' | 'payment' | 'next')[]
}) {
  return (
    <>
      {show.includes('source') && <StatusBadge dimension="Source status" label={SOURCE_STATUS[c.sourceStatus]} />}
      {show.includes('responsibility') && <StatusBadge dimension="Responsibility" label={RESPONSIBILITY[responsibilityView(state, c)]} />}
      {show.includes('dispute') && c.dispute.status !== 'none' && <StatusBadge dimension="Responsibility dispute" label={DISPUTE[c.dispute.status]} />}
      {show.includes('payment') && <StatusBadge label={{ ...PAYMENT[c.payment.status], text: `Payment: ${PAYMENT[c.payment.status].text}` }} />}
      {show.includes('next') && <StatusBadge dimension="Next action" label={NEXT_ACTION[nextAction(state, c)]} />}
    </>
  )
}

export function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="check-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
      <path d="M4.5 8.2l2.3 2.3 4.7-4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg className="check-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Runs a simulated challan check for one vehicle. The outcome comes from Prototype controls.
 * Challans found earlier are never removed by a failed or incomplete check.
 */
export function useVehicleCheck() {
  const { state, setVehicleCheck, addFoundChallans } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const run = (v: Vehicle, onDone?: (outcome: Vehicle['check']['status']) => void) => {
    setBusy((b) => new Set(b).add(v.id))
    const linked = state.challans.filter((c) => c.vehicleId === v.id).length
    const reg = formatRegistration(v.registration)
    window.setTimeout(() => {
      const outcome = state.sim.vehicleCheck
      const kept = linked > 0 ? ` The ${linked} challan${linked === 1 ? '' : 's'} found earlier ${linked === 1 ? 'is' : 'are'} kept.` : ''
      onDone?.(outcome === 'none_found' || outcome === 'found' ? 'checked' : outcome)
      if (outcome === 'found') {
        const n = linked === 0 ? 2 : 1
        addFoundChallans(v.id, n)
        setVehicleCheck(v.id, 'checked')
        toast({ tone: 'success', title: `${reg}: ${n} new challan${n === 1 ? '' : 's'} found`, body: 'Sample challans from the simulated source. Open the vehicle to review them.' })
      } else if (outcome === 'none_found') {
        setVehicleCheck(v.id, 'checked')
        if (linked > 0) toast({ tone: 'info', title: `${reg}: check complete`, body: 'No new challans since the last check (simulated).' })
        else toast({ tone: 'success', title: `${reg}: no challans found`, body: 'The source returned no challans for this vehicle (simulated).' })
      } else if (outcome === 'failed') {
        setVehicleCheck(v.id, 'failed')
        toast({ tone: 'danger', title: `${reg}: check failed`, body: `We could not reach the source. This does not mean there are no challans.${kept}` })
      } else {
        setVehicleCheck(v.id, 'incomplete')
        toast({ tone: 'warning', title: `${reg}: check incomplete`, body: `Only some sources answered. Try again later.${kept}` })
      }
      setBusy((b) => {
        const n = new Set(b)
        n.delete(v.id)
        return n
      })
    }, 1000)
  }
  return { run, isBusy: (id: string) => busy.has(id) }
}
