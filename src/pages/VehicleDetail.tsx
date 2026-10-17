import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { Callout, Card, DescList, EmptyState, PageHeader } from '../components/Layout'
import { Tabs } from '../components/Tabs'
import { DataTable } from '../components/Table'
import { StatusBadge } from '../components/Badge'
import { Button, ButtonLink } from '../components/Button'
import { Modal } from '../components/Modal'
import { SelectField, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/Toast'
import { formatAmount, formatDate, formatDateTime, formatRegistration, formatTime } from '../domain/format'
import { CHECK, PAYMENT, RECORD_HELP, RESPONSIBILITY, SOURCE, SOURCE_PENDING, terms } from '../domain/labels'
import { challanCountText, challanCountView, isSourceUpdatePending, currentAssignment, nextAction, party, responsibilityView, vehicleAssignments } from '../domain/logic'
import { holderAtViolation, NextActionCell, nextActionHref, useAccountFor, useVehicleCheck } from '../features/shared'
import { PageNav, useKeepState, useLinkState } from '../features/nav'
import type { Assignment, Challan, Vehicle } from '../domain/types'

export function VehicleDetail() {
  const { id } = useParams()
  const { state, addAssignment } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const v = state.vehicles.find((x) => x.id === id)
  useAccountFor(v?.accountId)
  const check = useVehicleCheck()
  const [adding, setAdding] = useState(false)
  // Result of a check run on this page, shown until the user leaves. The stored status covers older checks.
  const [ran, setRan] = useState<Vehicle['check']['status'] | null>(null)
  const [before, setBefore] = useState(0)
  const back = useLinkState(v ? `Back to vehicle ${formatRegistration(v.registration)}` : 'Back to vehicle')
  const keep = useKeepState()

  if (!v) {
    return (
      <div className="card">
        <EmptyState title="Vehicle not found" action={<ButtonLink to="/vehicles" variant="primary">Back to vehicles</ButtonLink>}>
          It may have been removed when the demo data was reset.
        </EmptyState>
      </div>
    )
  }

  const account = state.accounts.find((a) => a.id === v.accountId)!
  const t = terms(account.kind)
  const history = vehicleAssignments(state, v.id).reverse()
  const current = currentAssignment(state, v.id)
  const currentParty = current && party(state, current.partyId)
  const cv = challanCountView(state, v)
  const countText = challanCountText(cv)
  const linked = state.challans.filter((c) => c.vehicleId === v.id).sort((a, b) => b.violationAt.localeCompare(a.violationAt))
  const unpaidAmount = linked.filter((c) => c.payment.status !== 'paid').reduce((sum, c) => sum + c.amount, 0)
  const checking = check.isBusy(v.id)
  const runCheck = () => {
    setRan(null)
    setBefore(linked.length)
    check.run(v, setRan)
  }
  const tab = params.get('tab') ?? 'challans'
  const setTab = (k: string) => {
    const next = new URLSearchParams(params)
    if (k === 'challans') next.delete('tab')
    else next.set('tab', k)
    setParams(next, { replace: true, state: keep })
  }

  return (
    <>
      <PageNav fallback={{ to: '/vehicles', label: 'Back to vehicles' }}>
        <Link to="/vehicles">Vehicles</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{formatRegistration(v.registration)}</span>
      </PageNav>
      <PageHeader
        title={formatRegistration(v.registration)}
        description={`${v.vehicleType} · added via ${SOURCE[v.source].toLowerCase()}`}
        actions={
          <Button variant="primary" loading={checking} onClick={runCheck}>
            {checking ? 'Checking…' : 'Check challans'}
          </Button>
        }
      />

      <section className="summary" aria-label="Vehicle summary">
        <dl className="summary__grid">
          <div className="summary__item">
            <dt>Registered owner</dt>
            <dd>{v.registeredOwner}</dd>
          </div>
          <div className="summary__item">
            <dt>{t.current} today</dt>
            <dd>{currentParty ? currentParty.name : <span className="muted">None recorded</span>}</dd>
            <dd className="summary__sub">{current ? `${current.ref} · since ${formatDate(current.start)}` : `No ${t.record.toLowerCase()} covers today`}</dd>
          </div>
          <div className="summary__item">
            <dt>Challans</dt>
            <dd>{cv.kind === 'not_verified' ? <span className="count-unknown">{countText.text}</span> : countText.text}</dd>
            <dd className={`summary__sub${cv.kind === 'stale' ? ' count-stale' : ''}`}>{countText.note ?? (unpaidAmount > 0 ? `Unpaid ${formatAmount(unpaidAmount)}` : cv.known > 0 ? 'Nothing unpaid' : 'From the latest complete check')}</dd>
          </div>
          <div className="summary__item">
            <dt>Challan check</dt>
            <dd><StatusBadge dimension="Challan check" label={CHECK[v.check.status]} /></dd>
            <dd className="summary__sub">
              {v.check.at ? `Last attempt ${formatDateTime(v.check.at)}` : 'Never checked'}
              {v.check.lastCompleteAt && v.check.lastCompleteAt !== v.check.at && <><br />Last complete {formatDateTime(v.check.lastCompleteAt)}</>}
            </dd>
          </div>
        </dl>
        <CheckStateNote status={v.check.status} ran={ran} busy={checking} challanCount={linked.length} newCount={linked.length - before} openCount={linked.filter((c) => !c.closure.closed).length}
          onRetry={runCheck} onView={() => { setTab('challans'); document.getElementById('vehicle-sections')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }} />
        <p className="summary__foot subtle">
          The {t.current.toLowerCase()} today is not automatically responsible for older challans. Each challan is matched to the {t.record.toLowerCase()} active at its violation time.
        </p>
      </section>

      <div id="vehicle-sections" />
      <Tabs
        label="Vehicle sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'challans', label: 'Challans', count: linked.length },
          { key: 'history', label: `${t.record} history`, count: history.length },
          { key: 'info', label: 'Vehicle info' },
        ]}
      >
        {tab === 'challans' && (
          <Card padded={false}>
            <DataTable<Challan>
              caption="Challans for this vehicle"
              minWidth={720}
              rows={linked}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/challans/${c.id}`, { state: back })}
              columns={[
                { key: 'ref', header: 'Challan / offence', render: (c) => (
                  <div>
                    <Link to={`/challans/${c.id}`} state={back} className="cell-main nowrap">{c.ref}</Link>
                    <span className="cell-sub cell-clip" title={c.offence}>{c.offence}</span>
                  </div>
                ) },
                { key: 'when', header: 'Violation', render: (c) => (
                  <div className="nowrap">
                    {formatDate(c.violationAt)}
                    <span className="cell-sub">{c.timePrecision === 'date' ? 'Time not given' : formatTime(c.violationAt)}</span>
                    <span className="cell-sub only-narrow">{t.holder}: {holderAtViolation(state, c).text}</span>
                  </div>
                ) },
                { key: 'holder', header: `${t.holder} at violation time`, secondary: true, render: (c) => {
                  const h = holderAtViolation(state, c)
                  return h.tone === 'ok' ? h.text : <span className="count-stale">{h.text}</span>
                } },
                { key: 'resp', header: 'Responsibility', render: (c) => {
                  const rv = responsibilityView(state, c)
                  const p = party(state, c.responsibility.partyId)
                  return (
                    <div className="badges">
                      <StatusBadge dimension="Responsibility" label={RESPONSIBILITY[rv]} />
                      {p && (rv === 'confirmed' || rv === 'accepted') && <span className="cell-sub">{p.name}</span>}
                    </div>
                  )
                } },
                { key: 'amt', header: 'Amount', align: 'right', render: (c) => <span className="amount">{formatAmount(c.amount)}</span> },
                { key: 'pay', header: 'Payment', render: (c) => (
                  <div className="badges">
                    <StatusBadge dimension="Payment" label={PAYMENT[c.payment.status]} />
                    {isSourceUpdatePending(c) && <StatusBadge dimension="Source status" label={SOURCE_PENDING} />}
                  </div>
                ) },
                { key: 'next', header: 'Next action', className: 'col-action', width: '168px', render: (c) => (
                  <NextActionCell action={nextAction(state, c)} to={nextActionHref(state, c)} state={back} challanRef={c.ref} />
                ) },
              ]}
              empty={
                <EmptyState title={v.check.status === 'checked' ? 'No challans found' : 'Challans not verified'}>
                  {v.check.status === 'checked'
                    ? 'The last check completed and found no challans for this vehicle.'
                    : v.check.status === 'not_checked'
                      ? 'This vehicle has not been checked yet. Use “Check challans”.'
                      : 'The last check did not complete, so there may be challans we could not see.'}
                </EmptyState>
              }
            />
          </Card>
        )}

        {tab === 'history' && (
          <Card title={`${t.record} history`} subtitle={`${RECORD_HELP} Newest first.`}
            actions={<Button size="sm" variant="primary" onClick={() => setAdding(true)}>{t.addRecord}</Button>}>
            {history.length === 0 ? (
              <EmptyState title={`No ${t.records.toLowerCase()} recorded`}>
                Without {t.records.toLowerCase()}, challans on this vehicle cannot be matched to anyone and will need review.
              </EmptyState>
            ) : (
              <ol className="timeline">
                {history.map((a) => {
                  const isCurrent = a.id === current?.id
                  const end = (x: typeof a) => (x.end === null ? Infinity : Date.parse(x.end))
                  const overlapping = history.filter((b) => b.id !== a.id && Date.parse(b.start) < end(a) && end(b) > Date.parse(a.start))
                  return (
                    <li key={a.id} className={`timeline__item${isCurrent ? ' timeline__item--current' : ''}`}>
                      <div>
                        <div className="timeline__title">
                          {party(state, a.partyId)?.name} <span className="subtle">· {a.ref}</span>
                        </div>
                        <div className="timeline__meta">
                          {formatDateTime(a.start)} → {a.end ? formatDateTime(a.end) : 'ongoing'}
                        </div>
                        <div className="subtle">Entered {formatDateTime(a.enteredAt)} by {a.enteredBy}</div>
                        {a.note && <p className="timeline__note">{a.note}</p>}
                        {overlapping.length > 0 && <p className="timeline__note timeline__note--warn">Overlaps {overlapping.map((b) => b.ref).join(', ')}: challans in that period need review</p>}
                      </div>
                      <div className="row row--tight">
                        {overlapping.length > 0 && <StatusBadge label={{ text: 'Overlap', tone: 'warning' }} />}
                        {isCurrent && <StatusBadge label={{ text: 'Current', tone: 'accent' }} />}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        )}

        {tab === 'info' && (
          <Card title="Vehicle info">
            <DescList
              columns={2}
              items={[
                { term: 'Registration', value: <span className="mono">{formatRegistration(v.registration)}</span> },
                { term: 'Type', value: v.vehicleType },
                { term: 'Registered owner', value: v.registeredOwner },
                { term: 'Added', value: `${formatDateTime(v.addedAt)} · ${SOURCE[v.source]}` },
                { term: 'Latest challan check', value: v.check.at ? `${CHECK[v.check.status].text}, ${formatDateTime(v.check.at)}` : CHECK[v.check.status].text },
                { term: 'Last complete check', value: v.check.lastCompleteAt ? formatDateTime(v.check.lastCompleteAt) : 'None yet' },
                { term: `${t.current} today`, value: currentParty ? `${currentParty.name} (${currentParty.reference})` : 'None recorded' },
              ]}
            />
          </Card>
        )}
      </Tabs>

      <AddAssignmentDrawer open={adding} onClose={() => setAdding(false)} vehicleId={v.id} accountId={v.accountId} kind={account.kind} onSave={(a) => {
        addAssignment(a)
        toast({ tone: 'success', title: `${t.record} added`, body: 'Challans on this vehicle are re-matched against the new record.' })
        setAdding(false)
        setTab('history')
      }} />
    </>
  )
}

/**
 * Check result for this vehicle. Loading, a completed check with no challans, an incomplete
 * check and a failed check each read differently; none of the last two is shown as "zero".
 */
function CheckStateNote({ status, ran, busy, challanCount, newCount, openCount, onRetry, onView }: {
  status: Vehicle['check']['status']
  /** Outcome of a check run on this page, if any. */
  ran: Vehicle['check']['status'] | null
  busy: boolean
  challanCount: number
  /** Challans added by the check run on this page. */
  newCount: number
  openCount: number
  onRetry: () => void
  onView: () => void
}) {
  if (busy) {
    return <Callout tone="info" title="Checking for challans…">Asking the challan source about this vehicle (simulated). Challans found earlier stay listed below.</Callout>
  }
  const known = challanCount > 0
    ? `Showing the ${challanCount} challan${challanCount === 1 ? '' : 's'} found earlier; there may be newer ones.`
    : 'This does not mean the vehicle has no challans.'
  if (ran === 'checked' && status === 'checked') {
    if (challanCount === 0) {
      return <Callout tone="success" title="Check complete: no challans found">The source returned no challans for this vehicle (simulated).</Callout>
    }
    const title = newCount > 0
      ? `Check complete: ${newCount} new challan${newCount === 1 ? '' : 's'} found`
      : 'Check complete: no new challans'
    return (
      <Callout tone="success" title={title}
        actions={<Button size="sm" variant="primary" onClick={onView}>View challans</Button>}>
        {openCount} open of {challanCount} challan{challanCount === 1 ? '' : 's'} on record for this vehicle. Open one to review responsibility or payment.
      </Callout>
    )
  }
  const msg =
    status === 'failed' ? { tone: 'danger' as const, title: 'Latest check failed', body: `The challan source could not be reached (simulated). ${known}`, label: 'Retry check' }
      : status === 'incomplete' ? { tone: 'warning' as const, title: 'Latest check incomplete', body: `Some sources did not answer (simulated). ${known}`, label: 'Retry check' }
        : status === 'not_checked' ? { tone: 'info' as const, title: 'Not checked yet', body: 'Challans for this vehicle are unknown until a check completes.', label: 'Check now' }
          : null
  if (!msg) return null
  return (
    <Callout tone={msg.tone} title={msg.title} actions={<Button size="sm" onClick={onRetry}>{msg.label}</Button>}>
      {msg.body}
    </Callout>
  )
}

const NEW_PARTY = '__new'

function AddAssignmentDrawer({ open, onClose, vehicleId, accountId, kind, onSave }: {
  open: boolean
  onClose: () => void
  vehicleId: string
  accountId: string
  kind: 'fleet' | 'leasing'
  onSave: (a: { vehicleId: string; partyId: string; ref: string; start: string; end: string | null; note?: string }) => void
}) {
  const { state, addParty } = useStore()
  const t = terms(kind)
  const people = state.parties.filter((p) => p.accountId === accountId && p.kind !== 'company')
  const blank = { partyId: '', newName: '', newRef: '', ref: '', start: '', end: '', note: '' }
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isNew = f.partyId === NEW_PARTY
  // datetime-local values are read as IST, the zone used across the prototype.
  const iso = (s: string) => new Date(`${s}:00+05:30`).toISOString()

  // Overlaps are allowed (handovers are messy) but flagged: challans in the overlap go to manual review.
  const overlaps = useMemo(() => {
    if (!f.start) return [] as Assignment[]
    const s0 = Date.parse(iso(f.start))
    const e0 = f.end ? Date.parse(iso(f.end)) : Infinity
    return state.assignments.filter((a) => a.vehicleId === vehicleId && Date.parse(a.start) < e0 && (a.end === null ? Infinity : Date.parse(a.end)) > s0)
  }, [f.start, f.end, state.assignments, vehicleId])

  const close = () => {
    setF(blank)
    setErrors({})
    onClose()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!f.partyId) errs.partyId = `Choose a ${t.holder.toLowerCase()}, or add a new one.`
    if (isNew && !f.newName.trim()) errs.newName = `Enter the ${t.holder.toLowerCase()}’s name.`
    if (isNew && !f.newRef.trim()) errs.newRef = 'Enter an internal reference.'
    if (!f.ref.trim()) errs.ref = 'Enter a reference.'
    if (!f.start) errs.start = 'Enter a start date and time.'
    if (f.end && f.start && f.end <= f.start) errs.end = 'End must be after start.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const partyId = isNew ? addParty(accountId, f.newName.trim(), f.newRef.trim(), kind === 'fleet' ? 'driver' : 'lessee') : f.partyId
    onSave({ vehicleId, partyId, ref: f.ref.trim(), start: iso(f.start), end: f.end ? iso(f.end) : null, note: f.note.trim() || undefined })
    close()
  }

  return (
    <Modal open={open} onClose={close} variant="drawer" title={t.addRecord}
      description={`${RECORD_HELP} Times are in IST.`}
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" type="submit" form="add-asg">Save {t.record.toLowerCase()}</Button></>}>
      <form id="add-asg" className="stack" onSubmit={submit} noValidate>
        <SelectField label={t.holder} required value={f.partyId} onChange={(e) => { setF({ ...f, partyId: e.target.value }); if (e.target.value) setErrors(({ partyId: _p, ...rest }) => rest) }} error={errors.partyId}
          hint={`${people.length} ${people.length === 1 ? t.holder.toLowerCase() : t.holders.toLowerCase()} on this account. Not listed? Choose “New ${t.holder.toLowerCase()}”.`}>
          <option value="">Choose…</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>)}
          <option value={NEW_PARTY}>+ New {t.holder.toLowerCase()}…</option>
        </SelectField>
        {isNew && (
          <fieldset className="subform">
            <legend>New {t.holder.toLowerCase()}</legend>
            <div className="grid-2">
              <TextField label="Name" required value={f.newName} onChange={(e) => setF({ ...f, newName: e.target.value })} error={errors.newName} />
              <TextField label="Internal reference" required value={f.newRef} onChange={(e) => setF({ ...f, newRef: e.target.value })} error={errors.newRef}
                hint={kind === 'fleet' ? 'For example, an employee code.' : 'For example, a customer code.'} />
            </div>
            <p className="subtle">Prototype: saved in this browser only. Use fictional names; no phone, email or ID numbers are collected.</p>
          </fieldset>
        )}
        <TextField label={`${t.record} reference`} required value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} error={errors.ref} hint={kind === 'fleet' ? 'For example, a shift number.' : 'For example, a lease number.'} />
        <div className="grid-2">
          <TextField label="Start" type="datetime-local" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} error={errors.start} />
          <TextField label="End" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} error={errors.end} hint="Leave empty if ongoing." />
        </div>
        {overlaps.length > 0 && (
          <Callout tone="warning" title={`Overlaps ${overlaps.length} existing ${overlaps.length === 1 ? t.record.toLowerCase() : t.records.toLowerCase()}`}>
            {overlaps.map((a) => `${a.ref} (${party(state, a.partyId)?.name ?? 'unknown'}, ${formatDateTime(a.start)} → ${a.end ? formatDateTime(a.end) : 'ongoing'})`).join('; ')}.
            {' '}You can still save it. Challans in the overlapping period will need a person to review responsibility.
          </Callout>
        )}
        <TextArea label="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} hint="Optional. Where this information came from." />
      </form>
    </Modal>
  )
}
