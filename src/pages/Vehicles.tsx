import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, useWorkspace } from '../data/store'
import { Callout, Card, EmptyState, PageHeader } from '../components/Layout'
import { DataTable } from '../components/Table'
import { AppliedFilters, SearchField, StatusTabs, TableFooter, Toolbar, type AppliedFilter } from '../components/Filters'
import { SelectField } from '../components/Field'
import { StatusBadge, Tag } from '../components/Badge'
import { ActionLink, Button } from '../components/Button'
import { formatDate, formatDateTime, formatRegistration, normaliseRegistration } from '../domain/format'
import { CHECK, SOURCE, terms } from '../domain/labels'
import { challanCountText, challanCountView, currentAssignment, hasCheckIssue, party } from '../domain/logic'
import { AddVehicleDrawer, CsvImportDialog, OwnerFetchDrawer } from '../features/onboarding'
import { RegLink, useVehicleCheck } from '../features/shared'
import { useLinkState } from '../features/nav'
import type { Vehicle } from '../domain/types'

export function Vehicles() {
  const { state } = useStore()
  const { account, vehicles, challans } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<'' | 'manual' | 'csv' | 'owner'>('')
  const [recent, setRecent] = useState<Set<string>>(new Set())
  const t = terms(account.kind)
  const check$ = useVehicleCheck()
  const back = useLinkState('Back to vehicles')

  const q = params.get('q') ?? ''
  const check = params.get('check') ?? ''
  const source = params.get('source') ?? ''
  const hasOpen = params.get('open') ?? ''
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const countOf = (v: Vehicle) => challanCountView(state, v)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const reg = normaliseRegistration(needle)
    return vehicles
      .filter((v) => {
        if (needle && !(v.registration.includes(reg) || v.registeredOwner.toLowerCase().includes(needle))) return false
        if (check === 'attention' && !hasCheckIssue(v)) return false
        if (check && check !== 'attention' && v.check.status !== check) return false
        if (source && v.source !== source) return false
        const cv = countOf(v)
        // "No open challans" only lists vehicles where that is known; unknown counts have their own option.
        if (hasOpen === 'yes' && cv.open === 0) return false
        if (hasOpen === 'no' && (cv.kind === 'not_verified' || cv.open > 0)) return false
        if (hasOpen === 'unknown' && cv.kind !== 'not_verified') return false
        return true
      })
      .sort((a, b) => (recent.has(b.id) ? 1 : 0) - (recent.has(a.id) ? 1 : 0) || a.registration.localeCompare(b.registration))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, challans, q, check, source, hasOpen, recent])

  // The latest add/import/fetch, so the user always has a next step: check these vehicles, then open the results.
  const [batch, setBatch] = useState<{ ids: string[]; how: 'manual' | 'csv' | 'owner' } | null>(null)
  const [results, setResults] = useState<Record<string, Vehicle['check']['status']>>({})
  const added = (ids: string[]) => {
    setRecent(new Set([...recent, ...ids]))
    if (panel) setBatch({ ids, how: panel })
    setResults({})
  }
  const checkBatch = (list: Vehicle[]) => list.forEach((v) => check$.run(v, (r) => setResults((x) => ({ ...x, [v.id]: r }))))

  const reset = () => setParams(new URLSearchParams(), { replace: true })
  const TAB_KEYS = ['check', 'open'] as const
  const tab = (key: string, label: string, count: number, values: Partial<Record<(typeof TAB_KEYS)[number], string>>) => {
    const next = new URLSearchParams(params)
    TAB_KEYS.forEach((k) => (values[k] ? next.set(k, values[k]!) : next.delete(k)))
    const qs = next.toString()
    return { key, label, count, to: `/vehicles${qs ? `?${qs}` : ''}`, active: TAB_KEYS.every((k) => (params.get(k) ?? '') === (values[k] ?? '')) }
  }
  const tabs = [
    tab('all', 'All', vehicles.length, {}),
    tab('issues', 'Check issues', vehicles.filter(hasCheckIssue).length, { check: 'attention' }),
    tab('unknown', 'Not verified', vehicles.filter((v) => countOf(v).kind === 'not_verified').length, { open: 'unknown' }),
    tab('open', 'Has open challans', vehicles.filter((v) => countOf(v).open > 0).length, { open: 'yes' }),
  ]
  const CHECK_OPTIONS: Record<string, string> = { attention: 'Failed or incomplete', ...Object.fromEntries(Object.entries(CHECK).map(([k, l]) => [k, l.text])) }
  const OPEN_OPTIONS: Record<string, string> = { yes: 'Has open challans', no: 'No open challans (verified or known)', unknown: 'Not verified' }
  const SOURCE_OPTIONS: Record<string, string> = { ...SOURCE }
  const applied: AppliedFilter[] = (
    [
      ['q', 'Search', q],
      ['check', 'Challan check', CHECK_OPTIONS[check]],
      ['source', 'Added via', SOURCE_OPTIONS[source]],
      ['open', 'Open challans', OPEN_OPTIONS[hasOpen]],
    ] as const
  )
    .filter(([k]) => params.get(k))
    .map(([k, label, value]) => ({ key: k, label, value: value ?? params.get(k) ?? '', onRemove: () => set(k, '') }))
  const options = (o: Record<string, string>, any = 'Any') => (
    <>
      <option value="">{any}</option>
      {Object.entries(o).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </>
  )

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Vehicles you track for challans. Add them by hand, import an Excel (.xlsx) or CSV file, or look up an owner."
        actions={
          <>
            <Button onClick={() => setPanel('owner')}>Fetch by owner</Button>
            <Button onClick={() => setPanel('csv')}>Import spreadsheet</Button>
            <Button variant="primary" onClick={() => setPanel('manual')}>Add vehicle</Button>
          </>
        }
      />
      {batch && <BatchResult batch={batch} results={results} vehicles={vehicles} busy={check$.isBusy} back={back}
        onCheck={checkBatch} onDismiss={() => setBatch(null)} />}
      <Card padded={false} className="list-surface">
        <StatusTabs label="Vehicle views" items={tabs} />
        <Toolbar
          moreCount={[source, hasOpen].filter(Boolean).length}
          more={
            <>
              <SelectField label="Added via" value={source} onChange={(e) => set('source', e.target.value)}>{options(SOURCE_OPTIONS)}</SelectField>
              <SelectField label="Open challans" value={hasOpen} onChange={(e) => set('open', e.target.value)}>{options(OPEN_OPTIONS)}</SelectField>
            </>
          }
        >
          <SearchField id="veh-q" label="Search vehicles" placeholder="Registration or registered owner" value={q} onChange={(v) => set('q', v)} />
          <SelectField label="Challan check" hideLabel value={check} onChange={(e) => set('check', e.target.value)}>{options(CHECK_OPTIONS, 'Any check status')}</SelectField>
        </Toolbar>
        <AppliedFilters items={applied} onReset={reset} />
        <DataTable<Vehicle>
          caption="Vehicles"
          minWidth={920}
          rows={rows}
          rowKey={(v) => v.id}
          onRowClick={(v) => navigate(`/vehicles/${v.id}`, { state: back })}
          columns={[
            { key: 'reg', header: 'Registration', className: 'col-reg', render: (v) => (
              <div className="cell-stack">
                <span className="row row--tight">
                  <RegLink id={v.id} registration={v.registration} state={back} />
                  {recent.has(v.id) && <Tag>New</Tag>}
                </span>
                <span className="cell-sub">{v.vehicleType}</span>
              </div>
            ) },
            { key: 'owner', header: 'Registered owner', render: (v) => v.registeredOwner },
            { key: 'holder', header: t.current, render: (v) => {
              const a = currentAssignment(state, v.id)
              return a ? party(state, a.partyId)?.name : <span className="subtle">None recorded</span>
            } },
            { key: 'open', header: 'Challans', render: (v) => {
              const cv = countOf(v)
              const { text, note } = challanCountText(cv)
              const reg = formatRegistration(v.registration)
              if (cv.kind === 'not_verified') return <span className="count-unknown" title="No complete challan check yet. The count is unknown, not zero.">{text}</span>
              if (cv.known === 0) return <span className="subtle" title="The latest check completed and found no challans.">{text}</span>
              // A known open count opens this vehicle's open challans, and that list shows the same number.
              const openPart = cv.open > 0
                ? <Link className="count-link" to={`/challans?vehicle=${v.id}&view=open`} state={back} aria-label={`${cv.open} open challan${cv.open === 1 ? '' : 's'} for ${reg}: view them`}>{cv.open} open</Link>
                : <span>0 open</span>
              return (
                <span className="cell-stack" title={note ? 'The latest check did not complete. These are the challans known from earlier checks.' : undefined}>
                  <span className="nowrap num">{openPart}{cv.closed > 0 && <span className="subtle"> · {cv.closed} closed</span>}</span>
                  {note && <span className="cell-sub count-stale">{note}</span>}
                </span>
              )
            } },
            { key: 'check', header: 'Latest check', render: (v) => (
              <span className="cell-stack">
                <StatusBadge dimension="Challan check" label={CHECK[v.check.status]} />
                <span className="cell-sub" title={v.check.at ? formatDateTime(v.check.at) : undefined}>{v.check.at ? formatDate(v.check.at) : 'Never checked'}</span>
              </span>
            ) },
            { key: 'act', header: 'Next action', className: 'col-action', width: '160px', render: (v) => {
              const s = v.check.status
              const reg = formatRegistration(v.registration)
              if (s === 'checked') return <ActionLink to={`/vehicles/${v.id}`} state={back} aria-label={`View vehicle ${reg}`}>View vehicle</ActionLink>
              const label = s === 'not_checked' ? 'Check challans' : 'Retry check'
              return (
                <Button size="sm" loading={check$.isBusy(v.id)} onClick={() => check$.run(v)} aria-label={`${label}: ${reg} (simulated)`}>
                  {check$.isBusy(v.id) ? 'Checking…' : label}
                </Button>
              )
            } },
          ]}
          empty={
            vehicles.length === 0 ? (
              <EmptyState title="No vehicles yet" action={<Button variant="primary" onClick={() => setPanel('manual')}>Add vehicle</Button>}>
                Add vehicles to start checking them for challans.
              </EmptyState>
            ) : (
              <EmptyState title="No vehicles match" action={<Button size="sm" onClick={reset}>Reset filters</Button>}>
                Try another registration or owner name.
              </EmptyState>
            )
          }
        />
        <TableFooter result={rows.length === vehicles.length ? `All ${rows.length} vehicles` : `${rows.length} of ${vehicles.length} vehicles`} />
      </Card>

      <AddVehicleDrawer open={panel === 'manual'} onClose={() => setPanel('')} onAdded={added} />
      <CsvImportDialog open={panel === 'csv'} onClose={() => setPanel('')} onAdded={added} />
      <OwnerFetchDrawer open={panel === 'owner'} onClose={() => setPanel('')} onAdded={added} />
    </>
  )
}

/**
 * Confirmation after vehicles are added, with the next step. Before a check: offer to check them.
 * After: one line per vehicle with its result and a direct route to its challans.
 */
function BatchResult({ batch, results, vehicles, busy, back, onCheck, onDismiss }: {
  batch: { ids: string[]; how: 'manual' | 'csv' | 'owner' }
  results: Record<string, Vehicle['check']['status']>
  vehicles: Vehicle[]
  busy: (id: string) => boolean
  back: unknown
  onCheck: (list: Vehicle[]) => void
  onDismiss: () => void
}) {
  const { state } = useStore()
  const list = batch.ids.map((id) => vehicles.find((v) => v.id === id)).filter((v): v is Vehicle => !!v)
  if (list.length === 0) return null
  const one = list.length === 1 ? list[0] : undefined
  const checking = list.filter((v) => busy(v.id))
  const done = list.filter((v) => results[v.id] && !busy(v.id))
  const unchecked = list.filter((v) => !results[v.id] && !busy(v.id))
  const retry = done.filter((v) => results[v.id] !== 'checked')
  const how = { manual: 'added', csv: 'imported', owner: 'added from owner lookup' }[batch.how]
  const title = one ? `${formatRegistration(one.registration)} ${how}` : `${list.length} vehicles ${how}`
  const openOf = (v: Vehicle) => state.challans.filter((c) => c.vehicleId === v.id && !c.closure.closed).length
  const resultText = (v: Vehicle) => {
    if (busy(v.id)) return 'Checking…'
    const r = results[v.id]
    if (!r) return 'Not checked yet'
    if (r === 'failed') return 'Check failed: challans unknown'
    if (r === 'incomplete') return 'Check incomplete: there may be more'
    const n = openOf(v)
    return n === 0 ? 'No challans found' : `${n} open challan${n === 1 ? '' : 's'} found`
  }
  const finished = () => {
    const withChallans = done.filter((v) => results[v.id] === 'checked' && openOf(v) > 0).length
    const parts = [
      withChallans && `${withChallans} with open challans`,
      retry.length && `${retry.length} could not be checked fully`,
    ].filter(Boolean)
    if (withChallans) return `Check finished: ${parts.join(', ')}. Use “View challans” to open them.`
    if (retry.length) return `Check finished: ${parts.join(', ')}. ${one ? 'Its' : 'Their'} challans are unknown until a retry succeeds.`
    return 'Check finished: no challans found.'
  }
  const tone = checking.length ? 'info' : retry.length ? 'warning' : 'success'
  const body = checking.length
    ? `Checking ${checking.length} of ${list.length} for challans (simulated)…`
    : done.length === 0
      ? `${one ? 'It has' : 'They have'} not been checked for challans yet, so ${one ? 'its' : 'their'} challans are unknown.`
      : unchecked.length
        ? `${done.length} of ${list.length} checked.`
        : finished()
  return (
    <Callout tone={tone} title={title}
      actions={
        <>
          {unchecked.length > 0 && (
            <Button size="sm" variant="primary" onClick={() => onCheck(unchecked)}>
              {one ? 'Check challans' : `Check ${unchecked.length === list.length ? 'these' : 'remaining'} ${unchecked.length} vehicle${unchecked.length === 1 ? '' : 's'}`}
            </Button>
          )}
          {retry.length > 0 && !checking.length && <Button size="sm" onClick={() => onCheck(retry)}>Retry {retry.length === 1 && one ? 'check' : `${retry.length} failed`}</Button>}
          {one && <ActionLink to={`/vehicles/${one.id}`} state={back}>View vehicle</ActionLink>}
          <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
        </>
      }>
      <p>{body}</p>
      {(done.length > 0 || checking.length > 0 || !one) && (
        <ul className="batch-list">
          {list.map((v) => (
            <li key={v.id}>
              <span className="mono">{formatRegistration(v.registration)}</span>
              <span className={results[v.id] && results[v.id] !== 'checked' ? 'count-stale' : 'subtle'}>{resultText(v)}</span>
              {results[v.id] && !busy(v.id) && openOf(v) > 0 && <Link to={`/vehicles/${v.id}`} state={back}>View challans</Link>}
            </li>
          ))}
        </ul>
      )}
    </Callout>
  )
}
