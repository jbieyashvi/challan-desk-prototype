import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { ActivityList, Callout, Card, DescList, Disclosure, EmptyState, PageHeader } from '../components/Layout'
import { StatusBadge } from '../components/Badge'
import { Button, ButtonLink } from '../components/Button'
import { Modal } from '../components/Modal'
import { RadioGroup, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/Toast'
import { formatAmount, formatDate, formatDateTime, formatMinutes, formatRegistration, formatTime } from '../domain/format'
import { DISPUTE, DISPUTE_HELP, NEXT_ACTION, PAYMENT, RECOVERY, RECOVERY_HELP, RESPONSIBILITY, SOURCE_STATUS, terms } from '../domain/labels'
import { actionTarget, currentAssignment, isSourceUpdatePending, needsReconcile, daysUntilDue, MATCH_COPY, matchChallan, nextAction, party, recoveryView, responsibilityView, type MatchResult } from '../domain/logic'
import { useAccountFor } from '../features/shared'
import { SourcePendingCallout, SourceRecheckButton } from '../features/source'
import { PageNav, useLinkState, useOrigin, type Origin } from '../features/nav'
import type { Assignment, Challan, DemoState } from '../domain/types'

/** Shown under every required reason so the requirement does not feel arbitrary. */
const REASON_WHY = 'Required: the reason is saved in the activity history, so anyone reviewing a dispute later can see why this party was chosen.'

type Dialog = '' | 'confirm' | 'choose' | 'unresolved' | 'contest' | 'accept' | 'reopen' | 'withdraw'

export function ChallanDetail() {
  const { id } = useParams()
  const { state } = useStore()
  const { hash } = useLocation()
  const c = state.challans.find((x) => x.id === id)
  const v = c && state.vehicles.find((x) => x.id === c.vehicleId)
  useAccountFor(v?.accountId)
  const [dialog, setDialog] = useState<Dialog>('')
  const origin = useOrigin()
  const back = useLinkState('Back to challan')

  useEffect(() => {
    // The decision panel sits beside the evidence; only scroll when it is out of view (stacked layouts).
    if (hash === '#responsibility') document.getElementById('responsibility')?.scrollIntoView({ block: 'nearest' })
  }, [hash, c?.id])

  if (!c || !v) {
    return (
      <div className="card">
        <EmptyState title="Challan not found" action={<ButtonLink to="/challans" variant="primary">Back to challans</ButtonLink>}>
          It may have been removed when the demo data was reset.
        </EmptyState>
      </div>
    )
  }

  const account = state.accounts.find((a) => a.id === v.accountId)!
  const t = terms(account.kind)
  const match = matchChallan(state, c)
  const action = nextAction(state, c)
  const current = currentAssignment(state, v.id)
  const sourceMismatch = needsReconcile(c)
  const sourcePending = isSourceUpdatePending(c)
  const records = evidenceRecords(match)
  const summary = decisionSummary(state, c, match, account.kind)
  const due = daysUntilDue(c)
  const vehicleLink = (tab?: string) => toVehicle(v.id, origin, back, tab)

  return (
    <>
      <PageNav fallback={{ to: '/challans', label: 'Back to challans' }}>
        <Link to="/challans">Challans</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{c.ref}</span>
      </PageNav>
      <PageHeader
        title={<>{c.ref}<span className="page-header__sub">{c.offence}</span></>}
        actions={<ButtonLink to={`/challans/${c.id}/payment`} state={back} variant={actionTarget(action) === 'payment' && !c.closure.closed ? 'primary' : 'secondary'}>Payment &amp; resolution</ButtonLink>}
      />

      <section className="summary" aria-label="Challan summary">
        <dl className="summary__grid summary__grid--5">
          <div className="summary__item summary__item--lead"><dt>Amount</dt><dd className="num">{formatAmount(c.amount)}</dd></div>
          <div className="summary__item">
            <dt>Violation time</dt>
            <dd>{c.timePrecision === 'date' ? formatDate(c.violationAt) : formatDateTime(c.violationAt)}</dd>
            {c.timePrecision === 'date' && <dd className="summary__sub">Time not given by source</dd>}
          </div>
          <div className="summary__item">
            <dt>Vehicle</dt>
            <dd><Link {...vehicleLink()} className="reg">{formatRegistration(v.registration)}</Link></dd>
            <dd className="summary__sub">{v.vehicleType}</dd>
          </div>
          <div className="summary__item">
            <dt>Due date</dt>
            <dd>{c.dueDate ? formatDate(c.dueDate) : 'Not given'}</dd>
            {due !== undefined && !c.closure.closed && c.payment.status !== 'paid' && (
              <dd className={`summary__sub${due <= 7 ? ' due-soon' : ''}`}>{due < 0 ? `Overdue by ${-due} day${due === -1 ? '' : 's'}` : due === 0 ? 'Due today' : `In ${due} day${due === 1 ? '' : 's'}`}</dd>
            )}
          </div>
          <div className="summary__item">
            <dt>Payment</dt>
            <dd><StatusBadge dimension="Payment" label={PAYMENT[c.payment.status]} /></dd>
            <dd className={`summary__sub${sourcePending ? ' count-stale' : ''}`}>{sourcePending ? 'Source update pending' : `Source: ${SOURCE_STATUS[c.sourceStatus].text.toLowerCase()}`}</dd>
          </div>
        </dl>
      </section>

      <Callout tone={summary.tone} title={summary.title}>
        {summary.body}
      </Callout>
      <SourcePendingCallout c={c} />

      <div className="grid-main">
        {/* Evidence first in reading order; the decision panel follows it when the layout stacks. */}
        <div className="stack stack--lg">
          <Card title="Evidence" subtitle={`Violation and ${t.records.toLowerCase()}, in time order`}>
            <div className="stack">
              <Evidence c={c} state={state} records={records} match={match} />
              {records.length > 0 && (
                <Disclosure title="Record details" summary={`Exact times, who entered each ${t.record.toLowerCase()} and when`}>
                  <ul className="plain-list record-details">
                    {records.map((a) => (
                      <li key={a.id}>
                        <strong>{party(state, a.partyId)?.name}</strong> · {a.ref}
                        <div className="subtle">{formatDateTime(a.start)} → {a.end ? formatDateTime(a.end) : 'ongoing'}</div>
                        <div className="subtle">Entered {formatDateTime(a.enteredAt)} by {a.enteredBy}</div>
                        {a.note && <div className="timeline__note">{a.note}</div>}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
              <p className="context-note">
                <span className="context-note__label">Vehicle today</span>
                {current ? <>{t.current}: <strong>{party(state, current.partyId)?.name}</strong> ({current.ref}, since {formatDate(current.start)}).</> : <>No {t.holder.toLowerCase()} holds this vehicle today.</>}
                {' '}Not used for matching.
              </p>
            </div>
          </Card>

          {sourceMismatch && (
            <Callout tone="warning" title="Source shows paid, platform does not">
              Someone may have paid outside this platform. Do not pay again until you have checked. Record the external payment on the payment screen once you have a reference.
            </Callout>
          )}

          <Disclosure title="Source and sync" summary={`${SOURCE_STATUS[c.sourceStatus].text} · last checked ${formatDateTime(c.lastSyncedAt)}`}>
            <div className="stack">
              <DescList
                columns={2}
                items={[
                  { term: 'Source', value: 'Challan source (simulated)' },
                  { term: 'Reported status', value: SOURCE_STATUS[c.sourceStatus].text },
                  { term: 'Location', value: c.location },
                  { term: 'Last checked', value: formatDateTime(c.lastSyncedAt) },
                  { term: 'First discovered', value: formatDateTime(c.discoveredAt) },
                  { term: 'Registered owner', value: v.registeredOwner },
                ]}
              />
              <p className="subtle">Source status is reported by the source only. Payment here does not change it.</p>
              <div><SourceRecheckButton c={c} /></div>
            </div>
          </Disclosure>

          <Disclosure title="Activity" summary={`${c.activity.length} ${c.activity.length === 1 ? 'entry' : 'entries'} · newest first`}>
            <ActivityList items={c.activity} />
          </Disclosure>
        </div>

        <div className="grid-main__aside">
          <DecisionPanel c={c} state={state} match={match} kind={account.kind} onAction={setDialog} paymentState={back} recordsLink={vehicleLink('history')} />
        </div>
      </div>

      <DecisionDialogs c={c} state={state} match={match} dialog={dialog} onClose={() => setDialog('')} onSwitch={setDialog} holderLabel={t.holder} />
    </>
  )
}

// ---------- Decision summary ----------

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

/**
 * One sentence-level explanation of the case and what resolves it, derived from the records.
 * It compares the violation time with record start/end times only: never the discovery date or today's holder.
 */
function decisionSummary(state: DemoState, c: Challan, match: MatchResult, kind: 'fleet' | 'leasing'): { tone: Tone; title: string; body: ReactNode } {
  const t = terms(kind)
  const rec = kind === 'fleet' ? 'shift' : 'lease'
  const name = (a?: Assignment) => (a ? party(state, a.partyId)?.name ?? 'Unknown' : '')
  const when = c.timePrecision === 'date' ? formatDate(c.violationAt) : formatDateTime(c.violationAt)
  const span = (a: Assignment) => `${formatDateTime(a.start)} to ${a.end ? formatDateTime(a.end) : 'ongoing'}`
  const rv = responsibilityView(state, c)
  const decided = party(state, c.responsibility.partyId)

  if (c.closure.closed) return { tone: 'neutral', title: `Closed: ${c.closure.outcome}`, body: <>Closed {c.closure.at && formatDateTime(c.closure.at)}. Reopen it from Payment &amp; resolution if something changes.</> }
  if (c.dispute.status === 'open') {
    const who = party(state, c.dispute.contestedPartyId)?.name ?? 'The party'
    return { tone: 'danger', title: `${who} disputes responsibility`, body: <>“{c.dispute.reason}” Review the evidence, then choose who is responsible or record that the dispute was withdrawn. Recovery is paused; payment is unaffected.</> }
  }
  if ((rv === 'confirmed' || rv === 'accepted') && decided) {
    return {
      tone: 'success',
      title: `Responsible: ${decided.name}`,
      body: rv === 'accepted' ? 'Accepted by the party (recorded by an operator).' : 'Confirmed by an operator.',
    }
  }

  const note = c.responsibility.reviewNote ? <> Pending note: {c.responsibility.reviewNote}</> : null
  const conflict = evidenceRecords(match).find(noteConflict)

  if (match.kind === 'near_handover' && conflict) {
    const other = match.candidates.find((a) => a.id !== conflict.id)
    return {
      tone: 'warning',
      title: 'Verify the handover before assigning',
      body: <>Violation at {formatTime(c.violationAt)}. {name(conflict)}'s recorded {rec} ends at {conflict.end ? formatTime(conflict.end) : 'no set time'}, but the handover note says {name(other)} received the keys around {formatTime(conflict.noteHandoverAt!)}.{note}</>,
    }
  }
  if (match.kind === 'near_handover') {
    const [a, b] = match.candidates
    return { tone: 'warning', title: 'Violation close to a handover', body: <>Violation at {when}, {formatMinutes(match.minutesToBoundary ?? 0)} from the recorded handover from {name(a)} to {name(b)}. Check who had the vehicle before assigning responsibility.{note}</> }
  }
  if (match.kind === 'overlap') {
    return { tone: 'warning', title: `Two ${t.records.toLowerCase()} overlap`, body: <>Violation at {when}. {match.candidates.map((a) => `${name(a)} (${a.ref})`).join(' and ')} are both recorded for that time. Check where each record came from before assigning responsibility.{note}</> }
  }
  if (match.kind === 'none') {
    const parts = [match.before && `${name(match.before)}’s ${match.before.ref} ended ${formatDateTime(match.before.end!)}`, match.after && `${name(match.after)}’s ${match.after.ref} started ${formatDateTime(match.after.start)}`].filter(Boolean)
    return { tone: 'warning', title: `No ${t.record.toLowerCase()} covers the violation`, body: <>Violation at {when}. {parts.length ? `${parts.join('; ')}.` : ''} Add the missing {t.record.toLowerCase()} or choose a party with a reason.{note}</> }
  }
  if (match.kind === 'date_only') {
    return { tone: 'warning', title: 'Violation time not given', body: <>The source gives only the date ({formatDate(c.violationAt)}). {match.candidates.length ? `${match.candidates.map((a) => `${name(a)} (${a.ref})`).join(' and ')} held the vehicle that day.` : `No ${t.record.toLowerCase()} falls on that day.`} Confirm the time before assigning responsibility.{note}</> }
  }
  if (match.kind === 'no_records') {
    return { tone: 'warning', title: `No ${t.records.toLowerCase()} for this vehicle`, body: <>Nobody can be matched to the violation at {when}. Add a {t.record.toLowerCase()} or choose a party with a reason.{note}</> }
  }
  // single: a suggestion, never a decision.
  const a = match.primary!
  const after = match.after
  const discoveredLate = a.end && new Date(c.discoveredAt) > new Date(a.end)
  return {
    tone: c.responsibility.reviewNote ? 'warning' : 'info',
    title: c.responsibility.reviewNote ? `Left pending · records suggest ${name(a)}` : `Suggested: ${name(a)} · not yet confirmed`,
    body: (
      <>
        Violation at {when}. {a.ref} ({name(a)}) is recorded from {span(a)}, which covers it.
        {after && <> {name(after)}’s {after.ref} started {formatDate(after.start)}, after the violation.</>}
        {discoveredLate && <> Discovered {formatDate(c.discoveredAt)}; matching uses the violation time, not the discovery date or today’s {t.holder.toLowerCase()}.</>}
        {note}
      </>
    ),
  }
}

// ---------- Decision panel ----------

function DecisionPanel({ c, state, match, kind, onAction, paymentState, recordsLink }: {
  c: Challan; state: DemoState; match: MatchResult; kind: 'fleet' | 'leasing'; onAction: (d: Dialog) => void
  paymentState: { from: Origin }; recordsLink: { to: string; state: unknown }
}) {
  const t = terms(kind)
  const rv = responsibilityView(state, c)
  const action = nextAction(state, c)
  const decided = party(state, c.responsibility.partyId)
  const suggested = match.kind === 'single' && match.primary ? party(state, match.primary.partyId) : undefined
  const open = !c.closure.closed
  const decidedView = (rv === 'confirmed' || rv === 'accepted') && decided
  const disputed = c.dispute.status === 'open' ? party(state, c.dispute.contestedPartyId) : undefined

  return (
    <section id="responsibility" className="card" aria-labelledby="resp-title" style={{ scrollMarginTop: 24 }}>
      <div className="card__header">
        <h2 id="resp-title" className="card__title">Responsibility</h2>
        <StatusBadge dimension="Responsibility" label={RESPONSIBILITY[rv]} />
      </div>
      <div className="card__body decide">
        <div className="decide__status">
          <span className="decide__label">{decidedView ? 'Responsible party' : suggested && !c.responsibility.reviewNote && !disputed ? 'Suggested from records' : 'Responsible party'}</span>
          {decidedView ? (
            <span className="decide__value">{decided.name}</span>
          ) : suggested && !c.responsibility.reviewNote && !disputed ? (
            <span className="decide__value">{suggested.name}</span>
          ) : (
            <span className="decide__value decision__unclear">Not decided · nothing preselected</span>
          )}
          {decidedView && (
            <span className="subtle">
              {decided.reference}. {decided.kind === 'company' ? '' : rv === 'confirmed' ? 'Not yet acknowledged by the party.' : 'Party acknowledged responsibility (recorded by an operator).'}
            </span>
          )}
        </div>

        {disputed && (
          <p className="decide__note">
            <StatusBadge dimension="Responsibility dispute" label={DISPUTE.open} /> {disputed.name} disputes it. Internal only, not an official challan dispute.
          </p>
        )}

        {open && (
          <div className="decide__actions">
            {disputed ? (
              <>
                <Button variant="primary" onClick={() => onAction('choose')}>Review dispute</Button>
                <Button onClick={() => onAction('withdraw')}>Record dispute withdrawn</Button>
              </>
            ) : rv === 'suggested' ? (
              <>
                <Button variant="primary" onClick={() => onAction('confirm')}>Review suggestion</Button>
                <Button onClick={() => onAction('choose')}>Choose another party</Button>
                <Button variant="ghost" onClick={() => onAction('unresolved')}>Keep pending</Button>
              </>
            ) : rv === 'needs_review' ? (
              <>
                <Button variant="primary" onClick={() => onAction('choose')}>Review responsibility</Button>
                <Button variant="ghost" onClick={() => onAction('unresolved')}>{c.responsibility.reviewNote ? 'Update pending note' : 'Keep pending'}</Button>
                {(match.kind === 'none' || match.kind === 'no_records') && <ButtonLink {...recordsLink} variant="ghost">{t.addRecord}</ButtonLink>}
              </>
            ) : (
              <>
                {rv === 'confirmed' && decided?.kind !== 'company' && <Button onClick={() => onAction('accept')}>Record party acceptance</Button>}
                {decided?.kind !== 'company' && <Button onClick={() => onAction('contest')}>Record responsibility dispute</Button>}
                <Button variant="ghost" onClick={() => onAction('reopen')}>Reopen decision</Button>
              </>
            )}
          </div>
        )}

        <div className="decide__next">
          <span className="decide__label">Next step</span>
          {action === 'closed' ? (
            <StatusBadge label={NEXT_ACTION.closed} />
          ) : actionTarget(action) === 'payment' ? (
            <ButtonLink to={`/challans/${c.id}/payment`} state={paymentState} variant="primary" className="btn--block">{NEXT_ACTION[action].text}</ButtonLink>
          ) : (
            <strong>{NEXT_ACTION[action].text}</strong>
          )}
          <DescList
            items={[
              { term: 'Payment', value: <StatusBadge label={PAYMENT[c.payment.status]} /> },
              { term: <span title={RECOVERY_HELP}>Amount recovery</span>, value: <StatusBadge label={RECOVERY[recoveryView(state, c)]} /> },
              ...(c.dispute.status !== 'none' ? [{ term: <span title={DISPUTE_HELP}>Responsibility dispute</span>, value: <StatusBadge label={DISPUTE[c.dispute.status]} /> }] : []),
            ]}
          />
        </div>
      </div>
    </section>
  )
}

function evidenceRecords(match: MatchResult) {
  return uniqueSorted([...match.candidates, match.before, match.after, match.primary])
}

function uniqueSorted(list: (Assignment | undefined)[]): Assignment[] {
  const map = new Map<string, Assignment>()
  list.forEach((a) => a && map.set(a.id, a))
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/** A note that states a handover time different from the recorded end (or start) of the record. */
function noteConflict(a: Assignment) {
  if (!a.noteHandoverAt) return false
  const n = new Date(a.noteHandoverAt).getTime()
  return n !== new Date(a.end ?? a.start).getTime()
}

function Evidence({ c, state, records, match }: { c: Challan; state: DemoState; records: Assignment[]; match: MatchResult }) {
  if (records.length === 0) return <p className="muted">No records to compare.</p>
  const at = new Date(c.violationAt).getTime()
  type Row =
    | { kind: 'rec'; a: Assignment; sortAt: number }
    | { kind: 'violation'; sortAt: number }
    | { kind: 'note'; a: Assignment; sortAt: number }
  const rows: Row[] = records.map((a) => ({ kind: 'rec' as const, a, sortAt: new Date(a.start).getTime() }))
  records.filter(noteConflict).forEach((a) => rows.push({ kind: 'note', a, sortAt: new Date(a.noteHandoverAt!).getTime() }))
  // Place the violation after the records that started before it.
  rows.push({ kind: 'violation', sortAt: at + 0.5 })
  rows.sort((x, y) => x.sortAt - y.sortAt)
  const covering = new Set(match.kind === 'date_only' ? match.candidates.map((a) => a.id) : records.filter((a) => new Date(a.start).getTime() <= at && (!a.end || at < new Date(a.end).getTime())).map((a) => a.id))

  const item = (key: string, tone: string, time: string, body: ReactNode) => (
    <li key={key} className={`evidence__item${tone ? ` evidence__item--${tone}` : ''}`}>
      <span className="evidence__time">{time}</span>
      <span className="evidence__marker" aria-hidden />
      <div className="evidence__body">{body}</div>
    </li>
  )

  return (
    <ol className="evidence" aria-label="Evidence in time order">
      {rows.map((r, i) =>
        r.kind === 'violation'
          ? item('v', 'violation', c.timePrecision === 'date' ? `${formatDate(c.violationAt)}\ntime not given` : `${formatDate(c.violationAt)}\n${formatTime(c.violationAt)}`, (
            <>
              <div className="evidence__title">Violation</div>
              <div className="evidence__meta">{c.offence}</div>
            </>
          ))
          : r.kind === 'note'
            ? item(`note-${r.a.id}`, 'conflict', `${formatDate(r.a.noteHandoverAt!)}\n~${formatTime(r.a.noteHandoverAt!)}`, (
              <>
                <div className="evidence__title">Handover stated in a note <span className="evidence__flag">Conflicts with {r.a.ref} end {r.a.end ? formatTime(r.a.end) : '(ongoing)'}</span></div>
                <div className="evidence__meta evidence__quote">{r.a.note}</div>
              </>
            ))
            : item(r.a.id + i, noteConflict(r.a) ? 'conflict' : covering.has(r.a.id) ? 'covering' : '', spanLabel(r.a.start, r.a.end), (
              <>
                <div className="evidence__title">
                  {party(state, r.a.partyId)?.name} <span className="evidence__ref">· {r.a.ref}</span>
                  {covering.has(r.a.id) && <span className="evidence__tag">Covers the violation time</span>}
                </div>
                <div className="evidence__meta">{formatDateTime(r.a.start)} → {r.a.end ? formatDateTime(r.a.end) : 'ongoing'}</div>
                {r.a.note && !noteConflict(r.a) && <div className="evidence__meta evidence__quote">{r.a.note}</div>}
              </>
            )),
      )}
    </ol>
  )
}

/** Short records (a shift) show times; long ones (a lease) show dates. */
function spanLabel(start: string, end?: string | null) {
  if (!end) return `${formatDate(start)} –\nongoing`
  const short = new Date(end).getTime() - new Date(start).getTime() < 24 * 3600 * 1000
  return short ? `${formatTime(start)}–${formatTime(end)}` : `${formatDate(start)} –\n${formatDate(end)}`
}

// ---------- Decision dialogs ----------

function DecisionDialogs({ c, state, match, dialog, onClose, onSwitch, holderLabel }: { c: Challan; state: DemoState; match: MatchResult; dialog: Dialog; onClose: () => void; onSwitch: (d: Dialog) => void; holderLabel: string }) {
  const store = useStore()
  const toast = useToast()
  const [partyId, setPartyId] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [partyError, setPartyError] = useState('')
  const [showOthers, setShowOthers] = useState(false)
  const [query, setQuery] = useState('')
  const accountId = state.vehicles.find((v) => v.id === c.vehicleId)!.accountId
  const parties = state.parties.filter((p) => p.accountId === accountId)
  const leasing = state.accounts.find((a) => a.id === accountId)?.kind === 'leasing'
  const suggested = match.kind === 'single' && match.primary ? party(state, match.primary.partyId) : undefined
  const contested = c.dispute.status === 'open'

  useEffect(() => {
    setPartyId('')
    setError('')
    setPartyError('')
    setShowOthers(false)
    setQuery('')
    setText(dialog === 'confirm' ? `Matches ${match.primary?.ref ?? 'the record'} active at the violation time.` : '')
  }, [dialog, match.primary?.ref])

  const done = (title: string, tone: 'success' | 'warning' | 'info' = 'success', body?: string) => {
    toast({ tone, title, body })
    onClose()
  }
  const need = (msg: string) => {
    if (!text.trim()) {
      setError(msg)
      return false
    }
    return true
  }

  const records = uniqueSorted([...match.candidates, match.before, match.after])
  const descFor = (pid: string) => {
    const p = parties.find((x) => x.id === pid)!
    if (p.kind === 'company') return 'The company absorbs the cost. No amount recovery.'
    const recs = records.filter((a) => a.partyId === pid)
    return recs.length ? `${p.reference} · ${recs.map((a) => `${a.ref}: ${formatDateTime(a.start)} → ${a.end ? formatDateTime(a.end) : 'ongoing'}`).join('; ')}` : `${p.reference} · No record near the violation time.`
  }

  // Parties in the records near the violation, anyone disputing or already decided, and the company come first.
  const relevantIds = new Set<string>([...records.map((a) => a.partyId), c.dispute.contestedPartyId, c.responsibility.partyId].filter(Boolean) as string[])
  const relevant = parties.filter((p) => relevantIds.has(p.id) || p.kind === 'company')
  const others = parties.filter((p) => !relevant.includes(p))
  const q = query.trim().toLowerCase()
  const filteredOthers = others.filter((p) => !q || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q))
  const otherSelected = others.some((p) => p.id === partyId)
  const optionFor = (p: (typeof parties)[number]) => ({
    value: p.id,
    label: <>{p.name}{suggested?.id === p.id && <span className="subtle"> · suggested from records</span>}{c.dispute.contestedPartyId === p.id && <span className="subtle"> · disputes responsibility</span>}</>,
    description: descFor(p.id),
  })

  const conflict = records.find(noteConflict)
  const summary = (
    <>
      <h3>Violation</h3>
      <DescList
        items={[
          { term: 'Time', value: c.timePrecision === 'date' ? `${formatDate(c.violationAt)} (time not given)` : formatDateTime(c.violationAt) },
          { term: 'Amount', value: <span className="num">{formatAmount(c.amount)}</span> },
          { term: 'Offence', value: c.offence },
        ]}
      />
      <h3>Records near that time</h3>
      <p><strong>{MATCH_COPY[match.kind].title}</strong></p>
      {records.length === 0 ? <p className="muted">No records to compare.</p> : (
        <ul className="plain-list">
          {records.map((a) => (
            <li key={a.id}><strong>{party(state, a.partyId)?.name}</strong> · {a.ref}<br /><span className="subtle">{formatDateTime(a.start)} → {a.end ? formatDateTime(a.end) : 'ongoing'}</span></li>
          ))}
        </ul>
      )}
      {conflict && (
        <Callout tone="warning" title="Handover note conflicts with shift records">
          Note says about {formatTime(conflict.noteHandoverAt!)}; {conflict.ref} is recorded until {conflict.end ? formatTime(conflict.end) : 'ongoing'}.
        </Callout>
      )}
    </>
  )

  const footer = (label: string, onSubmit: () => void, variant: 'primary' | 'danger' = 'primary', keepPending = false) => (
    <>
      <Button onClick={onClose}>Cancel</Button>
      {keepPending && <Button variant="ghost" onClick={() => onSwitch('unresolved')}>Keep pending instead</Button>}
      <Button variant={variant} onClick={onSubmit}>{label}</Button>
    </>
  )

  if (dialog === 'confirm' && suggested)
    return (
      <Modal open onClose={onClose} size="lg" title={`Review suggestion: ${suggested.name}`} description="This records an internal decision. It does not notify anyone or make a legal determination."
        aside={summary} asideLabel="Evidence summary"
        footer={footer(`Confirm ${suggested.name}`, () => {
          if (!need('Add a short reason.')) return
          store.decide(c.id, suggested.id, text.trim(), 'confirm')
          done(`Responsibility confirmed: ${suggested.name}`)
        }, 'primary', true)}>
        <div className="choice choice--selected choice--static">
          <span className="choice__body">
            <span className="choice__label">{suggested.name}</span>
            <span className="choice__desc">{descFor(suggested.id)}</span>
          </span>
        </div>
        <TextArea label="Reason" required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error} hint={REASON_WHY} />
      </Modal>
    )

  if (dialog === 'choose')
    return (
      <Modal open onClose={onClose} size="lg" aside={summary} asideLabel="Evidence summary"
        title={contested ? 'Resolve responsibility dispute' : suggested ? 'Choose another party' : 'Choose responsible party'}
        description={contested ? `Choose who is responsible after reviewing the dispute. Choosing ${party(state, c.dispute.contestedPartyId)?.name} again means the dispute is not upheld.` : 'Nothing is preselected. Compare the evidence and give a reason.'}
        footer={footer(contested ? 'Resolve dispute' : 'Save decision', () => {
          setPartyError(partyId ? '' : `Choose a ${holderLabel.toLowerCase()} or the company.`)
          setError(text.trim() ? '' : 'Add a reason for this decision.')
          if (!partyId || !text.trim()) return
          const isConfirm = suggested?.id === partyId && !contested
          store.decide(c.id, partyId, text.trim(), isConfirm ? 'confirm' : 'override')
          done(`Responsibility set: ${party(state, partyId)?.name}`, 'success', contested ? 'Dispute resolved and recorded in activity.' : undefined)
        }, 'primary', !contested)}>
        <RadioGroup
          legend="Parties in the records"
          name="party"
          value={partyId}
          onChange={(v) => { setPartyId(v); setPartyError('') }}
          error={partyError}
          options={relevant.map(optionFor)}
        />
        {others.length > 0 && (
          <div className="others">
            <Button size="sm" variant="ghost" aria-expanded={showOthers || !!otherSelected} onClick={() => setShowOthers((x) => !x)}>
              {showOthers || otherSelected ? 'Hide other parties' : `Choose another party (${others.length})`}
            </Button>
            {(showOthers || otherSelected) && (
              <div className="stack">
                <TextField type="search" label="Search parties" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or reference" data-autofocus />
                {filteredOthers.length ? (
                  <RadioGroup legend="Other parties" name="party" value={partyId} onChange={(v) => { setPartyId(v); setPartyError('') }} options={filteredOthers.map(optionFor)} />
                ) : <p className="muted">No party matches “{query}”.</p>}
              </div>
            )}
          </div>
        )}
        <TextArea label={suggested && partyId && partyId !== suggested.id ? 'Override reason' : 'Reason'} required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error}
          hint={<>{REASON_WHY} {leasing ? 'For example: return inspection report shows the vehicle was back at the branch before the violation.' : 'For example: depot handover note confirms the keys changed hands at 19:45.'}</>} />
      </Modal>
    )

  if (dialog === 'unresolved')
    return (
      <Modal open onClose={onClose} size="sm" title="Keep responsibility pending" description="The challan stays in “Needs review” with your note. Payment can still go ahead if the company decides to pay first."
        footer={footer('Save note', () => {
          if (!need('Say what is missing so the next person knows.')) return
          store.leaveUnresolved(c.id, text.trim())
          done("Kept pending", "warning")
        })}>
        <TextArea label="What is missing?" required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error} hint={leasing ? 'For example: waiting for the signed return inspection report.' : 'For example: waiting for the depot handover log.'} data-autofocus />
      </Modal>
    )

  if (dialog === 'contest')
    return (
      <Modal open onClose={onClose} size="md" title="Record responsibility dispute" description={`Use this when ${party(state, c.responsibility.partyId)?.name} says they are not responsible.`}
        footer={footer('Record dispute and return to review', () => {
          if (!need('Record what the party said.')) return
          store.recordContest(c.id, text.trim())
          done('Dispute recorded: back to review', 'warning', 'Amount recovery is paused. Payment status is unchanged.')
        }, 'danger')}>
        <Callout tone="warning" title="Internal only, not an official challan dispute">
          This platform does not file or resolve disputes with the issuing authority, and nothing changes at the source. Payment status stays as it is.
        </Callout>
        <TextArea label="What did the party say?" required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error} data-autofocus />
      </Modal>
    )

  if (dialog === 'accept')
    return (
      <Modal open onClose={onClose} size="sm" title="Record party acceptance" description={`Record that ${party(state, c.responsibility.partyId)?.name} acknowledged responsibility. The prototype sends no messages; contact happens outside it.`}
        footer={footer('Record acceptance', () => {
          store.recordAcceptance(c.id, text.trim())
          done('Acceptance recorded')
        })}>
        <TextArea label="Note" value={text} onChange={(e) => setText(e.target.value)} hint={leasing ? 'Optional. For example: confirmed by email with the lessee’s fleet contact.' : 'Optional. For example: confirmed by phone with the fleet supervisor.'} data-autofocus />
      </Modal>
    )

  if (dialog === 'reopen')
    return (
      <Modal open onClose={onClose} size="sm" title="Reopen this decision?" description="The current decision is kept in history and the challan returns to review."
        footer={footer('Reopen', () => {
          if (!need('Add a reason.')) return
          store.reopenDecision(c.id, text.trim())
          done('Decision reopened', 'warning')
        })}>
        <TextArea label="Reason" required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error} data-autofocus />
      </Modal>
    )

  if (dialog === 'withdraw')
    return (
      <Modal open onClose={onClose} size="sm" title="Record dispute withdrawn" description={`${party(state, c.dispute.contestedPartyId)?.name} no longer disputes responsibility. The earlier decision is restored.`}
        footer={footer('Record withdrawal', () => {
          if (!need('Add a note.')) return
          store.withdrawContest(c.id, text.trim())
          done('Dispute withdrawn')
        })}>
        <TextArea label="Note" required value={text} onChange={(e) => { setText(e.target.value); setError('') }} error={error} data-autofocus />
      </Modal>
    )

  return null
}

/**
 * Link to this challan's vehicle. When the challan was opened from that vehicle, go back to
 * it as it was (same tab, same origin) instead of stacking another level of history.
 */
function toVehicle(vehicleId: string, origin: Origin | undefined, back: { from: Origin }, tab?: string) {
  const base = `/vehicles/${vehicleId}`
  const cameFromIt = origin && origin.to.split('?')[0] === base
  if (cameFromIt && !tab) return { to: origin.to, state: origin.from ? { from: origin.from } : undefined }
  // Going to a specific tab (e.g. to add a missing record) is a detour: its back link returns here.
  return { to: tab ? `${base}?tab=${tab}` : base, state: back }
}
