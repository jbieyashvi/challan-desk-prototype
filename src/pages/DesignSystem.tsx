import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tabs } from '../components/Tabs'
import { Step } from '../components/Steps'
import { ActivityList, Callout, Card, DemoExamples, DescList, Disclosure, EmptyState, FactStrip, PageHeader, SimulatedNote } from '../components/Layout'
import { AppliedFilters, SearchField, StatusTabs, TableFooter, Toolbar } from '../components/Filters'
import { Badge, StatusBadge, Tag } from '../components/Badge'
import { ActionLink, Button } from '../components/Button'
import { NextActionCell } from '../features/shared'
import { RadioGroup, SelectField, TextArea, TextField } from '../components/Field'
import { DataTable } from '../components/Table'
import { Modal } from '../components/Modal'
import { Toast, useToast } from '../components/Toast'
import { CHECK, DISPUTE, NEXT_ACTION, NEXT_ACTION_SHORT, PAYMENT, RECOVERY, RESPONSIBILITY, SOURCE_STATUS, type Label } from '../domain/labels'
import type { ActivityEntry } from '../domain/types'

const COLORS = [
  ['--color-bg', 'Page background'], ['--color-surface', 'Surface'], ['--color-surface-sunken', 'Sunken surface'], ['--color-border', 'Border'],
  ['--color-border-strong', 'Strong border'], ['--color-text', 'Text'], ['--color-text-muted', 'Muted text'], ['--color-text-subtle', 'Subtle text'],
  ['--color-border-subtle', 'Row separator'], ['--color-accent', 'Accent (the only one)'], ['--color-accent-soft', 'Accent soft'], ['--color-surface-hover', 'Hover surface'],
]
const TONES = ['neutral', 'info', 'success', 'warning', 'danger', 'accent'] as const
const TYPE = [['--text-title', '26 / page title, metric'], ['--text-2xl', '24 / large figure'], ['--text-xl', '20 / dialog title'], ['--text-lg', '16 / card title'], ['--text-md', '14 / body'], ['--text-sm', '13 / secondary cell text, table headers'], ['--text-xs', '12 / counts, tags']]
const SPACE = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12']

const sampleActivity: ActivityEntry[] = [
  { id: 'd1', at: '2026-10-17T10:00:00+05:30', actor: 'System', title: 'Challan found by sync', detail: 'Source status: Unpaid at source.' },
  { id: 'd2', at: '2026-10-17T10:05:00+05:30', actor: 'Operator', title: 'Responsibility confirmed: Driver A', detail: 'Reason: matches Shift F-201.', tone: 'success' },
  { id: 'd3', at: '2026-10-17T10:10:00+05:30', actor: 'Simulated payment service', title: 'Payment outcome unconfirmed', tone: 'warning' },
]

function LabelSet({ title, map }: { title: string; map: Record<string, Label> }) {
  return (
    <div className="stack stack--sm">
      <h3 className="section-title">{title}</h3>
      <div className="row">{Object.entries(map).map(([k, l]) => <StatusBadge key={k} label={l} />)}</div>
    </div>
  )
}

export function DesignSystem() {
  const [dialog, setDialog] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [split, setSplit] = useState(false)
  const [radio, setRadio] = useState<'a' | 'b' | ''>('')
  const [tab, setTab] = useState('challans')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  return (
    <>
      <PageHeader
        title="Design system (coded)"
        description="The tokens and components this prototype is built from. Every screen uses only these."
      />

      <Callout tone="warning" title="This is a coded design system, not the Figma deliverable">
        <p>These are React components and CSS variables. They are <strong>not</strong> Figma components, Auto Layout frames or Figma variables. The Figma design system the brief asks for has not been made yet. These tokens and components can be its starting point.</p>
        <p><strong>Remaining Figma deliverables:</strong> native Figma components with variants for each state shown here (button, field, choice, badge, tab, metric, step, callout, table row); Auto Layout on every component and screen; colour, type and spacing variables matching these tokens; the key screens at 1440, 1280 and 1024 wide; and a walkthrough video. None of these exist yet.</p>
      </Callout>

      <Card title="Colour tokens">
        <div className="ds-grid">
          {COLORS.map(([v, name]) => (
            <figure key={v}>
              <div className="swatch" style={{ background: `var(${v})` }} />
              <figcaption><strong>{name}</strong><div className="code">{v}</div></figcaption>
            </figure>
          ))}
        </div>
        <h3 className="section-title" style={{ margin: '20px 0 8px' }}>Status tones (always paired with a text label)</h3>
        <div className="ds-grid">
          {TONES.map((t) => (
            <figure key={t}>
              <div className="swatch" style={{ background: `var(--tone-${t}-bg)`, display: 'grid', placeItems: 'center', color: `var(--tone-${t}-fg)`, fontWeight: 600 }}>{t}</div>
              <figcaption className="code">--tone-{t}-bg / -fg / -dot</figcaption>
            </figure>
          ))}
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Type scale" subtitle="Inter. Weights 400, 500, 600 (page and card titles), 700 (metric values only). Amounts and counts use tabular numerals. Registrations in headings use interface text; monospace is kept for plate chips and references.">
          <div className="stack stack--sm">
            {TYPE.map(([v, name]) => (
              <div key={v} className="row row--between">
                <span style={{ fontSize: `var(${v})`, fontWeight: 600 }}>Challan SAMPLE-F-0142</span>
                <span className="code">{v} · {name}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Spacing, radii, shadows" subtitle="4px grid. 24px page padding, 16px between page sections. Controls 36px (32px small); table headers 40px; rows 56px for two-line cells and they grow with content. Shadows only on overlays.">
          <div className="stack stack--sm">
            {SPACE.map((v) => (
              <div key={v} className="row">
                <span className="code" style={{ width: 90 }}>{v}</span>
                <span style={{ width: `var(${v})`, height: 10, background: 'var(--color-accent)', borderRadius: 2 }} />
              </div>
            ))}
            <div className="row" style={{ marginTop: 12, gap: 16 }}>
              {['--radius-sm', '--radius-md', '--radius-lg'].map((r) => (
                <div key={r} style={{ width: 64, height: 40, border: '1px solid var(--color-border-strong)', borderRadius: `var(${r})` }} title={r} className="code" />
              ))}
              {['--shadow-sm', '--shadow-md', '--shadow-lg'].map((s) => (
                <div key={s} style={{ width: 64, height: 40, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: `var(${s})` }} title={s} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Buttons and links" subtitle="One primary action per area. Danger is outlined so it never competes with primary. Routine navigation (View, Review) is a quiet text link with an arrow; buttons stay for payment steps, retries and checks.">
        <div className="stack">
          <div className="row">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" loading>Loading</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="row">
            <Button variant="primary" size="sm">Small primary</Button>
            <Button size="sm">Small secondary</Button>
            <Button variant="ghost" size="sm">Small ghost</Button>
          </div>
          <div className="row">
            <ActionLink to="/design-system">View vehicle</ActionLink>
            <ActionLink to="/design-system">Review suggestion</ActionLink>
            <span className="code">ActionLink · .link-arrow</span>
          </div>
        </div>
      </Card>

      <Card title="States" subtitle="Forced here for review. In the product they come from real hover, keyboard focus and data.">
        <div className="stack">
          <div className="ds-states">
            <figure><Button variant="primary">Default</Button><figcaption>Default</figcaption></figure>
            <figure><Button variant="primary" className="is-hover">Hover</Button><figcaption>Hover</figcaption></figure>
            <figure><Button variant="primary" className="is-focus">Focus</Button><figcaption>Keyboard focus</figcaption></figure>
            <figure><Button variant="primary" disabled>Disabled</Button><figcaption>Disabled</figcaption></figure>
            <figure><Button className="is-hover">Hover</Button><figcaption>Secondary hover</figcaption></figure>
            <figure><Button className="is-focus">Focus</Button><figcaption>Secondary focus</figcaption></figure>
          </div>
          <div className="ds-states">
            <figure style={{ width: 200 }}><input className="input" aria-label="Default field" placeholder="Default" /><figcaption>Field default</figcaption></figure>
            <figure style={{ width: 200 }}><input className="input is-hover" aria-label="Hover field" placeholder="Hover" /><figcaption>Field hover</figcaption></figure>
            <figure style={{ width: 200 }}><input className="input is-focus" aria-label="Focused field" defaultValue="Focus" /><figcaption>Field focus</figcaption></figure>
            <figure style={{ width: 200 }}><input className="input" aria-label="Error field" aria-invalid="true" defaultValue="XX00" /><figcaption>Field error</figcaption></figure>
            <figure style={{ width: 200 }}><input className="input" aria-label="Disabled field" disabled defaultValue="Disabled" /><figcaption>Field disabled</figcaption></figure>
          </div>
          <div className="ds-states">
            <figure style={{ width: 260 }}>
              <div className="choice choice--selected choice--static"><span className="choice__body"><span className="choice__label">Driver A</span><span className="choice__desc">Selected option</span></span></div>
              <figcaption>Choice selected</figcaption>
            </figure>
            <figure style={{ width: 260 }}>
              <div className="choice choice--disabled choice--static"><span className="choice__body"><span className="choice__label">Already in your list</span><span className="choice__desc">Disabled option</span></span></div>
              <figcaption>Choice disabled</figcaption>
            </figure>
          </div>
        </div>
      </Card>

      <Card title="List surface" subtitle="Vehicles and Challans use one bordered surface: status tabs (each maps to an existing filter and matches the Overview count), one toolbar row (search, frequent filters, More filters), applied-filter chips only when a filter is on, the table, and a footer with the filtered count. Columns have set widths (the next-action column is fixed so actions are never clipped). Column headers stick while the table fits its surface; narrower, the whole row scrolls sideways and nothing is pinned over other columns.">
        <div className="card list-surface">
          <div>
            <StatusTabs label="Example tabs" items={[
              { key: 'a', label: 'All', count: 2, to: '/design-system', active: true },
              { key: 'b', label: 'Responsibility pending', count: 1, to: '/design-system', active: false },
              { key: 'c', label: 'Payment attention', count: 1, to: '/design-system', active: false },
            ]} />
            <Toolbar moreCount={1} more={<SelectField label="Source status" defaultValue="paid"><option value="">Any</option><option value="paid">Paid at source</option></SelectField>}>
              <SearchField id="ds-q" label="Search (example)" placeholder="Registration or challan number" value="" onChange={() => {}} />
              <SelectField label="Payment" hideLabel><option>Any payment status</option></SelectField>
            </Toolbar>
            <AppliedFilters onReset={() => toast({ tone: 'info', title: 'Example: filters reset' })}
              items={[{ key: 's', label: 'Source status', value: 'Paid at source', onRemove: () => toast({ tone: 'info', title: 'Example: filter removed' }) }]} />
            <DataTable
              caption="Sample table"
              rows={[
                { id: '1', ref: 'CH-EXAMPLE-01', off: 'Signal jump', reg: 'XX 00 AA 0001', date: '2 Oct 2026', time: '19:55', amt: '₹2,000', r: RESPONSIBILITY.needs_review, s: PAYMENT.unconfirmed, a: 'needs_review' as const },
                { id: '2', ref: 'CH-EXAMPLE-02', off: 'Speed limit exceeded', reg: 'XX 00 AA 0003', date: '30 Sep 2026', time: '08:10', amt: '₹2,000', r: RESPONSIBILITY.confirmed, s: PAYMENT.failed, a: 'payment_failed' as const },
                { id: '3', ref: 'CH-EXAMPLE-03', off: 'No parking', reg: 'XX 00 AA 0002', date: '28 Sep 2026', time: 'Time not given', amt: '₹500', r: RESPONSIBILITY.confirmed, s: PAYMENT.paid, a: 'closed' as const },
              ]}
              rowKey={(r) => r.id}
              minWidth={1000}
              columns={[
                { key: 'c', header: 'Challan', render: (r) => <div><span className="cell-main">{r.ref}</span><span className="cell-sub">{r.off}</span></div> },
                { key: 'v', header: 'Vehicle', width: '148px', render: (r) => <span className="reg">{r.reg}</span> },
                { key: 'd', header: 'Violation', width: '124px', render: (r) => <div className="nowrap">{r.date}<span className="cell-sub">{r.time}</span></div> },
                { key: 'a', header: 'Amount', align: 'right', width: '96px', render: (r) => <span className="amount">{r.amt}</span> },
                { key: 'r', header: 'Responsibility', width: '156px', render: (r) => <StatusBadge label={r.r} /> },
                { key: 's', header: 'Payment', width: '176px', render: (r) => <StatusBadge label={r.s} /> },
                { key: 'n', header: 'Next action', className: 'col-action', width: '168px', render: (r) => <NextActionCell action={r.a} to="/design-system" challanRef={r.ref} /> },
              ]}
            />
            <TableFooter result="All 3 challans"><span>Total <strong className="num">₹4,500</strong></span></TableFooter>
          </div>
        </div>
      </Card>

      <Card title="Metrics" subtitle="Four in one row from 860px up. Each opens its filtered list; the foot line is a breakdown from the same data.">
        <div className="metrics metrics--compact">
          <Link className="metric" to="/design-system"><span className="metric__label">Responsibility pending</span><span className="metric__value">5</span><span className="metric__foot">4 manual reviews · 1 suggestion</span><span className="metric__link" aria-hidden>Decide responsibility →</span></Link>
          <Link className="metric" to="/design-system"><span className="metric__label">Outstanding amount</span><span className="metric__value">₹7,000</span><span className="metric__foot">7 unpaid challans</span><span className="metric__link" aria-hidden>View unpaid →</span></Link>
          <Link className="metric metric--warning" to="/design-system"><span className="metric__label">Payments needing attention</span><span className="metric__value">2</span><span className="metric__foot">1 unconfirmed · 1 failed</span><span className="metric__link" aria-hidden>Check payments →</span></Link>
          <Link className="metric" to="/design-system"><span className="metric__label">Vehicle check issues</span><span className="metric__value">0</span><span className="metric__foot">Every vehicle checked</span><span className="metric__link" aria-hidden>View vehicles →</span></Link>
        </div>
      </Card>

      <Card title="Page tabs and summary" subtitle="ARIA tabs with arrow-key navigation. The summary block replaces several cards with one row of facts.">
        <div className="stack">
          <section className="summary" aria-label="Example summary">
            <dl className="summary__grid">
              <div className="summary__item summary__item--lead"><dt>Amount</dt><dd className="num">₹2,000</dd></div>
              <div className="summary__item"><dt>Violation time</dt><dd>2 Oct 2026, 19:55</dd></div>
              <div className="summary__item"><dt>Due date</dt><dd>8 Nov 2026</dd><dd className="summary__sub due-soon">In 5 days</dd></div>
              <div className="summary__item"><dt>Payment</dt><dd><StatusBadge label={PAYMENT.not_started} /></dd></div>
            </dl>
          </section>
          <Tabs label="Example tabs" value={tab} onChange={setTab} tabs={[{ key: 'challans', label: 'Challans', count: 3 }, { key: 'history', label: 'Assignment history' }, { key: 'info', label: 'Vehicle info' }]}>
            <p className="muted" style={{ padding: 'var(--space-4) 0 0' }}>Panel for “{tab}”.</p>
          </Tabs>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Ordered steps" subtitle="Payment and resolution. States come from data. The step that needs action is expanded and carries the primary action; done steps collapse to a one-line summary with details folded underneath.">
          <ol className="steps">
            <Step n={1} title="Payer" state="done" summary="Example Freight Co. pays the authority · fixed once payment started" />
            <Step n={2} title="Approve payment" state="skipped" note="Not required: paid outside the platform." />
            <Step n={3} title="Pay" state="failed"><p className="subtle">Declined by the payment service.</p><div className="row"><Button variant="primary">Retry payment</Button></div></Step>
            <Step n={4} title="Verify payment" state="attention" note="An initiated payment or a receipt is not settlement." />
            <Step n={5} title="Recover the amount" state="blocked" note="Blocked: responsibility is not confirmed." />
            <Step n={6} title="Close case" state="upcoming" />
          </ol>
        </Card>
        <Card title="Loading, empty, error, success" subtitle="Async actions show a spinner and lock the control; outcomes are stated in text.">
          <div className="stack">
            <div className="row">
              <Button variant="primary" loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 1500) }}>{loading ? 'Checking…' : 'Check challans'}</Button>
              <Button loading>Loading</Button>
            </div>
            <EmptyState title="No challans found">The last complete check found none. This is different from “Not verified”.</EmptyState>
            <Callout tone="danger" title="Check failed">We could not reach the source. This does not mean there are no challans.</Callout>
            <Callout tone="success" title="Payment confirmed">Reference SIM-PAY-0001 (simulated).</Callout>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Fact strip" subtitle="Key facts under a detail-page header">
          <FactStrip items={[{ term: 'Amount', value: '₹2,000', emphasis: true }, { term: 'Violation time', value: '14 Oct 2026, 19:52' }, { term: 'Vehicle', value: <span className="reg">XX 00 AA 0001</span> }]} />
        </Card>
        <Card title="Disclosure" subtitle="Secondary information one click away">
          <Disclosure title="Source and sync" summary="Unpaid at source · last synced 17 Oct 2026">
            <p className="muted">Source metadata and the Re-check source action live here.</p>
          </Disclosure>
        </Card>
      </div>

      <Card title="Evidence timeline" subtitle="Violation and records in time order on one vertical line. Conflicting records are amber and say why in text; the record that covers the violation has an accent marker.">
        <ol className="evidence" aria-label="Example evidence">
          <li className="evidence__item evidence__item--conflict"><span className="evidence__time">08:00–20:00</span><span className="evidence__marker" aria-hidden /><div className="evidence__body"><div className="evidence__title">Driver A <span className="evidence__ref">· Shift F-201</span><span className="evidence__tag">Covers the violation time</span></div><div className="evidence__meta">14 Oct 2026, 08:00 → 14 Oct 2026, 20:00</div></div></li>
          <li className="evidence__item evidence__item--conflict"><span className="evidence__time">{'14 Oct\n~19:30'}</span><span className="evidence__marker" aria-hidden /><div className="evidence__body"><div className="evidence__title">Handover stated in a note <span className="evidence__flag">Conflicts with F-201 end 20:00</span></div><div className="evidence__meta evidence__quote">Keys handed to Driver B around 19:30.</div></div></li>
          <li className="evidence__item evidence__item--violation"><span className="evidence__time">{'14 Oct\n19:52'}</span><span className="evidence__marker" aria-hidden /><div className="evidence__body"><div className="evidence__title">Violation</div><div className="evidence__meta">Red light</div></div></li>
          <li className="evidence__item"><span className="evidence__time">20:00–08:00</span><span className="evidence__marker" aria-hidden /><div className="evidence__body"><div className="evidence__title">Driver B <span className="evidence__ref">· Shift F-202</span></div><div className="evidence__meta">14 Oct 2026, 20:00 → 15 Oct 2026, 08:00</div></div></li>
        </ol>
      </Card>

      <Card title="Demo examples and simulation labels" subtitle="Sample IDs and test instructions fold into “Demo examples”. Simulation labels stay visible next to the action they qualify.">
        <div className="stack">
          <SimulatedNote>No real payment is made. You choose the outcome in the next step.</SimulatedNote>
          <DemoExamples>
            <p>Owner IDs that return each outcome:</p>
            <ul>
              <li><span className="mono">OWN-SAMPLE-01</span>: vehicles found</li>
              <li><span className="mono">OWN-FAIL</span>: lookup fails</li>
            </ul>
          </DemoExamples>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Fields" subtitle="Visible labels, hints, inline errors, required marked in text">
          <div className="stack">
            <TextField label="Registration number" required hint="Format like XX 00 AA 0001." placeholder="XX 00 AA 0001" />
            <TextField label="With an error" required defaultValue="XX00" error="This does not look like a registration number." />
            <SelectField label="Select"><option>Option one</option><option>Option two</option></SelectField>
            <TextArea label="Reason" hint="Kept in the activity history." />
          </div>
        </Card>
        <Card title="Choice">
          <RadioGroup legend="Responsible party (no preselection)" name="ds-radio" value={radio} onChange={setRadio}
            options={[{ value: 'a', label: 'Driver A', description: 'Shift F-201: 08:00 → 20:00' }, { value: 'b', label: 'Driver B', description: 'Shift F-202: 20:00 → 08:00' }]} />
        </Card>
      </div>

      <Card title="Status labels" subtitle="Each dimension has its own vocabulary, so “Paid at source” and “Payment: Paid” are never confused">
        <div className="stack">
          <LabelSet title="Source status" map={SOURCE_STATUS} />
          <LabelSet title="Responsibility" map={RESPONSIBILITY} />
          <LabelSet title="Responsibility dispute (internal)" map={DISPUTE} />
          <LabelSet title="Payment" map={PAYMENT} />
          <LabelSet title="Amount recovery" map={RECOVERY} />
          <LabelSet title="Next action" map={NEXT_ACTION} />
          <div className="stack stack--sm"><h3 className="section-title">Next action: short table labels</h3><p className="subtle">Each one only opens the page where the step happens; none of them confirms responsibility, approves or pays. The accessible name starts with this text and adds the challan number and full step.</p><div className="row">{Object.values(NEXT_ACTION_SHORT).map((t) => <Button key={t} size="sm">{t}</Button>)}</div></div>
          <LabelSet title="Vehicle challan check" map={CHECK} />
          <div className="row"><Badge>Plain badge</Badge><Tag>Tag</Tag></div>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Callouts">
          <div className="stack stack--sm">
            <Callout tone="info" title="Info">A suggestion based on records.</Callout>
            <Callout tone="success" title="Success">Payment confirmed.</Callout>
            <Callout tone="warning" title="Warning">Outcome unconfirmed. Check before retrying.</Callout>
            <Callout tone="danger" title="Danger">The check failed.</Callout>
            <SimulatedNote>Marks anything that is not connected to a real service.</SimulatedNote>
          </div>
        </Card>
        <Card title="Dialogs, drawers, notifications">
          <div className="stack">
            <div className="row">
              <Button onClick={() => setDialog(true)}>Open dialog</Button>
              <Button onClick={() => setSplit(true)}>Open split dialog</Button>
              <Button onClick={() => setDrawer(true)}>Open drawer</Button>
              <Button onClick={() => toast({ tone: 'success', title: 'Notification', body: 'Announced to screen readers via aria-live.' })}>Show notification</Button>
            </div>
            <p className="subtle">The split dialog puts an evidence summary beside the form (stacked first on narrow screens). Footers stay visible while the body scrolls. Dialogs trap focus, close with <span className="kbd">Esc</span>, and return focus to the button that opened them.</p>
            <Toast tone="warning" title="Static notification example" body="Notifications disappear after 6 seconds." />
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Activity history">
          <ActivityList items={sampleActivity} />
        </Card>
        <div className="stack">
          <Card title="Description list">
            <DescList columns={2} items={[{ term: 'Challan', value: 'SAMPLE-F-0142' }, { term: 'Amount', value: '₹2,000' }]} />
          </Card>
          <Card title="Empty state" padded={false}>
            <EmptyState title="No challans match these filters">Try a different search.</EmptyState>
          </Card>
        </div>
      </div>

      <Modal open={dialog} onClose={() => setDialog(false)} title="Example dialog" description="Used for decisions that need a reason."
        footer={<><Button onClick={() => setDialog(false)}>Cancel</Button><Button variant="primary" onClick={() => setDialog(false)}>Confirm</Button></>}>
        <TextArea label="Reason" required />
      </Modal>
      <Modal open={split} onClose={() => setSplit(false)} size="lg" title="Example split dialog" description="Evidence summary beside the decision form."
        aside={<><h3>Violation</h3><DescList items={[{ term: 'Time', value: '14 Oct 2026, 19:52' }, { term: 'Amount', value: '₹2,000' }]} /></>} asideLabel="Evidence summary"
        footer={<><Button onClick={() => setSplit(false)}>Cancel</Button><Button variant="primary" onClick={() => setSplit(false)}>Save decision</Button></>}>
        <RadioGroup legend="Responsible party (no preselection)" name="ds-split" value={radio} onChange={setRadio}
          options={[{ value: 'a', label: 'Driver A', description: 'DRV-01 · Shift F-201' }, { value: 'b', label: 'Driver B', description: 'DRV-02 · Shift F-202' }]} />
        <TextArea label="Reason" required hint="Required: saved in the activity history." />
      </Modal>
      <Modal open={drawer} onClose={() => setDrawer(false)} variant="drawer" title="Example drawer" description="Used for short tasks that keep the list visible behind."
        footer={<><Button onClick={() => setDrawer(false)}>Cancel</Button><Button variant="primary" onClick={() => setDrawer(false)}>Add vehicle</Button></>}>
        <section className="drawer-section"><h3 className="drawer-section__title">Vehicle</h3><TextField label="Registration number" /></section>
        <section className="drawer-section"><h3 className="drawer-section__title">Ownership</h3><TextField label="Registered owner" /></section>
      </Modal>
    </>
  )
}
