import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, useWorkspace } from '../data/store'
import { Card, PageHeader } from '../components/Layout'
import { DataTable } from '../components/Table'
import { StatusBadge } from '../components/Badge'
import { ActionLink } from '../components/Button'
import { formatAmount, formatDate, formatDateTime } from '../domain/format'
import { actionTarget, daysUntilDue, hasCheckIssue, isNeedsReview, isOutstanding, isPaymentAttention, isSourceUpdatePending, isUnresolved, needsReconcile, QUEUE_GROUP_LABEL, workQueue, type QueueGroup, type QueueItem } from '../domain/logic'
import { NextActionCell, RegLink } from '../features/shared'
import { useLinkState } from '../features/nav'

const GROUP_TONE: Record<QueueGroup, 'danger' | 'warning' | 'neutral'> = {
  payment_problem: 'danger', dispute: 'danger', responsibility: 'warning', payment: 'neutral', wrap_up: 'neutral',
}
const QUEUE_LIMIT = 8
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function Dashboard() {
  const { state } = useStore()
  const { challans, vehicles } = useWorkspace()
  const navigate = useNavigate()
  const back = useLinkState('Back to overview')

  const pending = challans.filter(isUnresolved)
  const manual = pending.filter((c) => isNeedsReview(state, c)).length
  const outstanding = challans.filter(isOutstanding)
  const outstandingAmount = outstanding.reduce((sum, c) => sum + c.amount, 0)
  const reconcile = outstanding.filter(needsReconcile).length
  const attention = challans.filter(isPaymentAttention)
  const unconfirmed = attention.filter((c) => c.payment.status === 'unconfirmed').length
  const checkIssues = vehicles.filter(hasCheckIssue)
  const checkFailed = checkIssues.filter((v) => v.check.status === 'failed').length
  const lastSync = challans.map((c) => c.lastSyncedAt).sort().at(-1)
  const sourcePending = challans.filter(isSourceUpdatePending).length

  const queue = workQueue(state, challans)
  const shown = queue.slice(0, QUEUE_LIMIT)
  const href = (q: QueueItem) => (actionTarget(q.action) === 'responsibility' ? `/challans/${q.c.id}#responsibility` : `/challans/${q.c.id}/payment`)
  const vehicleOf = (id: string) => state.vehicles.find((v) => v.id === id)!

  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs attention in this workspace."
        meta={lastSync && (
          <span className="subtle">
            Challan source last checked {formatDateTime(lastSync)} · simulated
            {sourcePending > 0 && <> · <Link to="/challans?payment=source_pending" state={back}>{plural(sourcePending, 'paid challan')} awaiting source update</Link></>}
          </span>
        )}
      />

      <div className="metrics metrics--compact">
        <Metric to="/challans?responsibility=unresolved" label="Responsibility pending" value={pending.length}
          foot={`${plural(manual, 'manual review')} · ${plural(pending.length - manual, 'suggestion')}`} link="Decide responsibility" warn={pending.length > 0} />
        <Metric to="/challans?view=outstanding" label="Unpaid amount" value={formatAmount(outstandingAmount)}
          foot={`${plural(outstanding.length, 'unpaid challan')}${reconcile > 0 ? ` · ${reconcile} to reconcile` : ''}`} link="View unpaid" />
        <Metric to="/challans?payment=attention" label="Payments needing attention" value={attention.length}
          foot={`${unconfirmed} unconfirmed · ${attention.length - unconfirmed} failed`} link="Check payments" warn={attention.length > 0} />
        <Metric to="/vehicles?check=attention" label="Vehicle check issues" value={checkIssues.length}
          foot={`${checkFailed} failed · ${checkIssues.length - checkFailed} incomplete · of ${vehicles.length}`} link="View vehicles" warn={checkIssues.length > 0} />
      </div>

      <Card
        title="Work queue"
        subtitle="Payment problems first, then disputes, decisions, payments and wrap-up; earliest due first."
        padded={false}
        actions={<ActionLink to="/challans">All challans</ActionLink>}
      >
        <DataTable<QueueItem>
          caption="Open challans in work-queue order"
          minWidth={720}
          rows={shown}
          rowKey={(r) => r.c.id}
          onRowClick={(r) => navigate(href(r), { state: back })}
          columns={[
            { key: 'ref', header: 'Challan', render: (r) => (
              <div>
                <Link to={`/challans/${r.c.id}`} state={back} className="cell-main nowrap">{r.c.ref}</Link>
                <span className="cell-sub cell-clip" title={r.c.offence}>{r.c.offence}</span>
              </div>
            ) },
            { key: 'veh', header: 'Vehicle', render: (r) => <RegLink id={r.c.vehicleId} registration={vehicleOf(r.c.vehicleId).registration} state={back} />, secondary: true },
            { key: 'why', header: 'Why it is here', render: (r) => (
              <div className="queue-why">
                <StatusBadge label={{ text: QUEUE_GROUP_LABEL[r.group], tone: GROUP_TONE[r.group] }} />
                <span className="queue-why__text">{r.reason}</span>
              </div>
            ) },
            { key: 'due', header: 'Due', render: (r) => <DueCell days={daysUntilDue(r.c)} date={r.c.dueDate} /> },
            { key: 'amt', header: 'Amount', align: 'right', render: (r) => <span className="amount">{formatAmount(r.c.amount)}</span> },
            { key: 'next', header: 'Next action', className: 'col-action', width: '168px', render: (r) => <NextActionCell action={r.action} to={href(r)} state={back} challanRef={r.c.ref} /> },
          ]}
          empty={<p className="muted" style={{ padding: 24 }}>No open challans. Nothing needs action.</p>}
        />
        {queue.length > QUEUE_LIMIT && (
          <div className="card__foot subtle">Showing {QUEUE_LIMIT} of {queue.length} open challans. <Link to="/challans">See all challans</Link></div>
        )}
      </Card>

      <details className="help-details">
        <summary>How statuses work</summary>
        <ul>
          <li><strong>Source status</strong>: what the (simulated) challan source reports.</li>
          <li><strong>Responsibility</strong>: your internal decision about who bears the cost. A suggestion is not a decision.</li>
          <li><strong>Payment</strong>: paid only after a confirmed success or an operator-recorded payment.</li>
          <li><strong>Amount recovery</strong>: getting the amount back from the responsible party, outside this platform.</li>
        </ul>
      </details>
    </>
  )
}

function Metric({ to, label, value, foot, link, warn }: { to: string; label: string; value: ReactNode; foot: string; link: string; warn?: boolean }) {
  return (
    <Link className={`metric${warn ? ' metric--warning' : ''}`} to={to} aria-label={`${label}: ${value}. ${foot}. ${link}`}>
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      <span className="metric__foot">{foot}</span>
      <span className="metric__link" aria-hidden>{link} →</span>
    </Link>
  )
}

/** Due date with the number of days left. Overdue is stated, not just coloured. */
function DueCell({ days, date }: { days?: number; date?: string }) {
  if (days === undefined || !date) return <span className="subtle">Not given</span>
  const text = days < 0 ? `Overdue ${plural(-days, 'day')}` : days === 0 ? 'Due today' : `In ${plural(days, 'day')}`
  return (
    <div className="nowrap">
      {formatDate(date)}
      <span className={`cell-sub${days <= 7 ? ' due-soon' : ''}`}>{text}</span>
    </div>
  )
}
