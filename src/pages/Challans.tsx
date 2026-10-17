import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, useWorkspace } from '../data/store'
import { Card, EmptyState, PageHeader } from '../components/Layout'
import { DataTable } from '../components/Table'
import { AppliedFilters, SearchField, StatusTabs, TableFooter, Toolbar, type AppliedFilter } from '../components/Filters'
import { SelectField } from '../components/Field'
import { StatusBadge } from '../components/Badge'
import { Button, ButtonLink } from '../components/Button'
import { formatAmount, formatDate, formatRegistration, formatTime, normaliseRegistration } from '../domain/format'
import { DISPUTE, DISPUTE_HELP, PAYMENT, RESPONSIBILITY, SOURCE_PENDING, SOURCE_STATUS } from '../domain/labels'
import { isNeedsReview, isOutstanding, isPaymentAttention, isSourceUpdatePending, isUnresolved, needsReconcile, nextAction, responsibilityView } from '../domain/logic'
import { NextActionCell, nextActionHref, RegLink } from '../features/shared'
import { BackLink, useLinkState, useOrigin } from '../features/nav'
import type { Challan } from '../domain/types'

const FILTERS = ['q', 'view', 'responsibility', 'payment', 'source', 'contest', 'vehicle'] as const

export function Challans() {
  const { state } = useStore()
  const { challans, vehicles } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const back = useLinkState('Back to challans')
  // Opened from another page (e.g. a vehicle's open-challan count): offer the way back to it.
  const origin = useOrigin()
  const get = (k: (typeof FILTERS)[number]) => params.get(k) ?? ''
  const set = (k: (typeof FILTERS)[number], v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const vehicleOf = (id: string) => vehicles.find((v) => v.id === id)

  const rows = useMemo(() => {
    const q = get('q').trim().toLowerCase()
    const qReg = normaliseRegistration(q)
    return challans
      .filter((c) => {
        const v = vehicleOf(c.vehicleId)
        if (q && !(c.ref.toLowerCase().includes(q) || (qReg && v?.registration.includes(qReg.toUpperCase())) || c.offence.toLowerCase().includes(q))) return false
        const view = get('view')
        if (view === 'open' && c.closure.closed) return false
        if (view === 'closed' && !c.closure.closed) return false
        if (view === 'outstanding' && !isOutstanding(c)) return false
        const r = get('responsibility')
        const rv = responsibilityView(state, c)
        if (r === 'unresolved' && !isUnresolved(c)) return false
        if (r === 'needs_review' && !isNeedsReview(state, c)) return false
        if (r && r !== 'unresolved' && r !== 'needs_review' && rv !== r) return false
        const p = get('payment')
        if (p === 'attention' && !isPaymentAttention(c)) return false
        if (p === 'source_pending' && !isSourceUpdatePending(c)) return false
        if (p && p !== 'attention' && p !== 'source_pending' && c.payment.status !== p) return false
        if (get('source') && c.sourceStatus !== get('source')) return false
        if (get('contest') && c.dispute.status !== get('contest')) return false
        if (get('vehicle') && c.vehicleId !== get('vehicle')) return false
        return true
      })
      .sort((a, b) => b.violationAt.localeCompare(a.violationAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challans, params, state])

  const total = rows.reduce((s, c) => s + c.amount, 0)
  const unpaid = rows.filter((c) => c.payment.status !== 'paid').reduce((s, c) => s + c.amount, 0)
  const awaitingSource = rows.filter(isSourceUpdatePending).reduce((s, c) => s + c.amount, 0)
  const vehicleFilter = get('vehicle') && vehicleOf(get('vehicle'))
  const reset = () => setParams(new URLSearchParams(), { replace: true })

  // Status tabs reuse the Overview selectors, so each tab count equals the matching Overview number.
  const TAB_KEYS = ['view', 'responsibility', 'payment'] as const
  const tab = (key: string, label: string, count: number, values: Partial<Record<(typeof TAB_KEYS)[number], string>>) => {
    const next = new URLSearchParams(params)
    TAB_KEYS.forEach((k) => (values[k] ? next.set(k, values[k]!) : next.delete(k)))
    const qs = next.toString()
    return { key, label, count, to: `/challans${qs ? `?${qs}` : ''}`, active: TAB_KEYS.every((k) => get(k) === (values[k] ?? '')) }
  }
  const tabs = [
    tab('all', 'All', challans.length, {}),
    tab('pending', 'Responsibility pending', challans.filter(isUnresolved).length, { responsibility: 'unresolved' }),
    tab('payment', 'Payment attention', challans.filter(isPaymentAttention).length, { payment: 'attention' }),
    tab('closed', 'Closed', challans.filter((c) => c.closure.closed).length, { view: 'closed' }),
  ]

  const RESP_OPTIONS: Record<string, string> = {
    unresolved: 'Pending (manual review + suggested)',
    needs_review: `${RESPONSIBILITY.needs_review.text} (manual review)`,
    suggested: RESPONSIBILITY.suggested.text,
    confirmed: RESPONSIBILITY.confirmed.text,
    accepted: RESPONSIBILITY.accepted.text,
  }
  const PAY_OPTIONS: Record<string, string> = { attention: 'Unconfirmed or failed', ...Object.fromEntries(Object.entries(PAYMENT).map(([k, l]) => [k, l.text])), source_pending: 'Source update pending' }
  const VIEW_OPTIONS: Record<string, string> = { open: 'Open', outstanding: 'Outstanding (open and unpaid)', closed: 'Closed' }
  const SOURCE_OPTIONS = Object.fromEntries(Object.entries(SOURCE_STATUS).map(([k, l]) => [k, l.text]))
  const DISPUTE_OPTIONS = Object.fromEntries(Object.entries(DISPUTE).map(([k, l]) => [k, k === 'none' ? 'No dispute' : l.text]))
  const moreCount = (['view', 'source', 'contest'] as const).filter((k) => get(k)).length

  const applied: AppliedFilter[] = (
    [
      ['q', 'Search', get('q')],
      ['view', 'Case', VIEW_OPTIONS[get('view')]],
      ['responsibility', 'Responsibility', RESP_OPTIONS[get('responsibility')]],
      ['payment', 'Payment', PAY_OPTIONS[get('payment')]],
      ['source', 'Source status', SOURCE_OPTIONS[get('source')]],
      ['contest', 'Dispute', DISPUTE_OPTIONS[get('contest')]],
      ['vehicle', 'Vehicle', vehicleFilter ? formatRegistration(vehicleFilter.registration) : get('vehicle')],
    ] as const
  )
    .filter(([k]) => get(k))
    .map(([k, label, value]) => ({ key: k, label, value: value ?? get(k), onRemove: () => set(k, '') }))

  const options = (o: Record<string, string>, any = 'Any') => (
    <>
      <option value="">{any}</option>
      {Object.entries(o).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </>
  )

  return (
    <>
      <PageHeader
        eyebrow={origin && <BackLink fallback={origin} />}
        title="Challans"
        description="Every challan found for your vehicles. New ones appear after a vehicle check."
        actions={<ButtonLink to="/vehicles">Go to vehicles</ButtonLink>}
      />
      <Card padded={false} className="list-surface">
        <StatusTabs label="Challan views" items={tabs} />
        <Toolbar
          moreCount={moreCount}
          more={
            <>
              <SelectField label="Case" value={get('view')} onChange={(e) => set('view', e.target.value)}>{options(VIEW_OPTIONS, 'All')}</SelectField>
              <SelectField label="Source status" value={get('source')} onChange={(e) => set('source', e.target.value)}>{options(SOURCE_OPTIONS)}</SelectField>
              <SelectField label="Responsibility dispute" value={get('contest')} onChange={(e) => set('contest', e.target.value)} title={DISPUTE_HELP}>{options(DISPUTE_OPTIONS)}</SelectField>
            </>
          }
        >
          <SearchField id="challan-q" label="Search challans" placeholder="Registration, challan, offence" value={get('q')} onChange={(v) => set('q', v)} />
          <SelectField label="Responsibility" hideLabel value={get('responsibility')} onChange={(e) => set('responsibility', e.target.value)}>{options(RESP_OPTIONS, 'Any responsibility')}</SelectField>
          <SelectField label="Payment" hideLabel value={get('payment')} onChange={(e) => set('payment', e.target.value)}>{options(PAY_OPTIONS, 'Any payment')}</SelectField>
        </Toolbar>
        <AppliedFilters items={applied} onReset={reset} />
        <DataTable<Challan>
          caption="Challans"
          minWidth={1080}
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/challans/${c.id}`, { state: back })}
          columns={[
            { key: 'ref', header: 'Challan', render: (c) => (
              <div className="cell-id">
                <Link to={`/challans/${c.id}`} state={back} className="cell-main nowrap">{c.ref}</Link>
                <span className="cell-sub cell-clip" title={c.offence}>{c.offence}</span>
              </div>
            ) },
            { key: 'veh', header: 'Vehicle', width: '148px', render: (c) => <RegLink id={c.vehicleId} registration={vehicleOf(c.vehicleId)?.registration ?? ''} state={back} /> },
            { key: 'date', header: 'Violation', width: '124px', render: (c) => (
              <div className="nowrap">
                {formatDate(c.violationAt)}
                <span className="cell-sub">{c.timePrecision === 'date' ? 'Time not given' : formatTime(c.violationAt)}</span>
              </div>
            ) },
            { key: 'amt', header: 'Amount', align: 'right', width: '96px', render: (c) => <span className="amount">{formatAmount(c.amount)}</span> },
            { key: 'resp', header: 'Responsibility', width: '156px', render: (c) => (
              <div className="badges">
                <StatusBadge dimension="Responsibility" label={RESPONSIBILITY[responsibilityView(state, c)]} />
                {c.dispute.status === 'open' && <StatusBadge dimension="Responsibility dispute" label={DISPUTE.open} />}
              </div>
            ) },
            { key: 'pay', header: 'Payment', width: '176px', render: (c) => (
              <div className="badges">
                <StatusBadge dimension="Payment" label={PAYMENT[c.payment.status]} />
                {needsReconcile(c) && <StatusBadge dimension="Source status" label={{ text: 'Source: paid', tone: 'warning' }} />}
                {isSourceUpdatePending(c) && <StatusBadge dimension="Source status" label={SOURCE_PENDING} />}
              </div>
            ) },
            { key: 'next', header: 'Next action', className: 'col-action', width: '168px', render: (c) => (
              <NextActionCell action={nextAction(state, c)} to={nextActionHref(state, c)} state={back} challanRef={c.ref} />
            ) },
          ]}
          empty={
            challans.length === 0 ? (
              <EmptyState title="No challans yet">
                Challans appear here after vehicle checks find them. A vehicle that was checked and returned nothing is shown as “Checked” on the Vehicles screen.
              </EmptyState>
            ) : (
              <EmptyState title="No challans match these filters" action={<Button size="sm" onClick={reset}>Reset filters</Button>}>
                Try a different search or remove a filter.
              </EmptyState>
            )
          }
        />
        <TableFooter result={`${rows.length === challans.length ? `All ${rows.length}` : `${rows.length} of ${challans.length}`} challan${challans.length === 1 ? '' : 's'}`}>
          {rows.length > 0 && <span>On record <strong className="num">{formatAmount(total)}</strong> · Unpaid <strong className="num">{formatAmount(unpaid)}</strong>{awaitingSource > 0 && <> · Paid, awaiting source <strong className="num">{formatAmount(awaitingSource)}</strong></>}</span>}
        </TableFooter>
      </Card>
    </>
  )
}
