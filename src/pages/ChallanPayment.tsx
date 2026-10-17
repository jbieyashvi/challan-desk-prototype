import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { ActivityList, Callout, Card, DescList, Disclosure, EmptyState, PageHeader, SimulatedNote } from '../components/Layout'
import { StatusBadge } from '../components/Badge'
import { Button, ButtonLink } from '../components/Button'
import { Modal } from '../components/Modal'
import { RadioGroup, TextArea, TextField } from '../components/Field'
import { useToast } from '../components/Toast'
import { formatAmount, formatDateTime, formatRegistration } from '../domain/format'
import { PAYMENT, RECOVERY, RESPONSIBILITY } from '../domain/labels'
import { closeChecks, isSourceUpdatePending, needsReconcile, nextAction, party, recoveryView, responsibilityView, suggestedOutcome } from '../domain/logic'
import { CheckIcon, downloadText, useAccountFor } from '../features/shared'
import { SourcePendingCallout } from '../features/source'
import { Step, type StepState } from '../components/Steps'
import { PageNav, useLinkState, useOrigin } from '../features/nav'
import type { Challan, Payer } from '../domain/types'

type Dialog = '' | 'pay' | 'check' | 'external' | 'recovery' | 'close' | 'reopen'

export function ChallanPayment() {
  const { id } = useParams()
  const store = useStore()
  const { state } = store
  const toast = useToast()
  const c = state.challans.find((x) => x.id === id)
  const v = c && state.vehicles.find((x) => x.id === c.vehicleId)
  useAccountFor(v?.accountId)
  const [dialog, setDialog] = useState<Dialog>('')
  const origin = useOrigin()
  const toVehicle = useLinkState('Back to payment & resolution')

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
  // "Back" from payment always goes to the challan. Whatever opened this page (a list, a vehicle)
  // becomes the challan's own origin, so the chain back to the original list is kept.
  const challanPath = `/challans/${c.id}`
  const challanOrigin = origin && origin.to.split('?')[0] === challanPath ? origin.from : origin
  const toChallan = challanOrigin ? { from: challanOrigin } : undefined
  const action = nextAction(state, c)
  const rv = responsibilityView(state, c)
  const responsible = rv === 'confirmed' || rv === 'accepted' ? party(state, c.responsibility.partyId) : undefined
  const recovery = recoveryView(state, c)
  const checks = closeChecks(state, c)
  const canClose = checks.every((x) => x.ok)
  const p = c.payment
  const closed = c.closure.closed
  const payerLocked = p.status !== 'not_started' || closed
  const companyPays = p.payer === 'company'
  const external = p.status === 'paid' && p.method === 'operator_recorded'
  const sourcePaid = needsReconcile(c)
  const sourcePending = isSourceUpdatePending(c)
  const payerName = companyPays ? account.name : responsible?.name ?? 'Responsible party'
  // Approval is read from the audit trail, so an external payment made before approval shows as "not required".
  const approval = c.activity.find((e) => e.actor === 'Approver' && e.title === 'Payment approved')
  const approved = p.status === 'approved' || !!approval
  const disputed = c.dispute.status === 'open' ? party(state, c.dispute.contestedPartyId) : undefined

  // ---- Step states, derived from the record. Nothing here is a free-standing flag. ----
  // The company is the default payer. Until payment starts that is a default, not a decision;
  // approving (or recording a payment) is what fixes it.
  const payerStep: StepState = payerLocked && !(closed && p.status === 'not_started') ? 'done' : 'preset'
  const approveStep: StepState = !companyPays ? 'skipped' : p.status === 'not_started' ? (closed ? 'upcoming' : 'current') : external && !approved ? 'skipped' : 'done'
  const payStep: StepState = p.status === 'paid' || p.status === 'unconfirmed' ? 'done' : p.status === 'failed' ? 'failed' : (companyPays ? p.status === 'approved' : true) && !closed ? 'current' : 'upcoming'
  const verifyStep: StepState = p.status === 'paid' ? 'done' : p.status === 'unconfirmed' ? 'attention' : 'upcoming'
  const showRecovery = recovery !== 'not_applicable'
  const recoveryStep: StepState = recovery === 'recovered' || recovery === 'written_off' ? 'done' : recovery === 'pending' ? 'current' : recovery === 'paused' || recovery === 'awaiting_decision' ? 'blocked' : 'upcoming'
  const closeStep: StepState = closed ? 'done' : canClose ? 'current' : 'upcoming'
  let n = 0

  const externalBtn = (variant: 'primary' | 'secondary' | 'ghost' = 'ghost') =>
    !closed && p.status !== 'paid' && p.status !== 'unconfirmed' && <Button variant={variant} onClick={() => setDialog('external')}>Record external payment</Button>

  return (
    <>
      <PageNav fallback={{ to: challanPath, label: 'Back to challan' }} target={{ to: challanPath, label: 'Back to challan', from: challanOrigin }}>
        <Link to="/challans">Challans</Link>
        <span aria-hidden>/</span>
        <Link to={challanPath} state={toChallan}>{c.ref}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Payment &amp; resolution</span>
      </PageNav>
      <PageHeader
        title="Payment & resolution"
        description={<>{c.ref} · {c.offence} · <Link to={`/vehicles/${v.id}`} state={toVehicle} className="reg">{formatRegistration(v.registration)}</Link></>}
        actions={<ButtonLink to={challanPath} state={toChallan}>Challan details</ButtonLink>}
      />

      <section className="summary" aria-label="Payment summary">
        <dl className="summary__grid summary__grid--5">
          <div className="summary__item summary__item--lead"><dt>Amount</dt><dd className="num">{formatAmount(c.amount)}</dd></div>
          <div className="summary__item"><dt>Payment</dt><dd><StatusBadge dimension="Payment" label={PAYMENT[p.status]} /></dd>{(external || sourcePending) && <dd className={`summary__sub${sourcePending ? ' count-stale' : ''}`}>{[external && 'Operator-recorded', sourcePending && 'Source update pending'].filter(Boolean).join(' · ')}</dd>}</div>
          <div className="summary__item"><dt>Payer</dt><dd>{payerName}</dd><dd className="summary__sub">Who pays the authority</dd></div>
          <div className="summary__item"><dt>Responsibility</dt><dd>{responsible ? responsible.name : <StatusBadge dimension="Responsibility" label={RESPONSIBILITY[rv]} />}</dd><dd className="summary__sub">Who bears the cost</dd></div>
          <div className="summary__item"><dt>Amount recovery</dt><dd><StatusBadge dimension="Amount recovery" label={RECOVERY[recovery]} /></dd><dd className="summary__sub">Tracked outside the platform</dd></div>
        </dl>
      </section>

      <SourcePendingCallout c={c} />
      {sourcePaid && (
        <Callout tone="warning" title="Source shows paid, platform does not">
          Someone may have paid directly at the source. Do not pay again until you have checked; if you have a reference, record it as an external payment.
        </Callout>
      )}

      <div className="grid-main">
        <Card title="Steps" className="card--flush">
          <NowLine c={c} action={action} amount={formatAmount(c.amount)} payerName={payerName} responsibleKnown={!!responsible}
            responsibilityLink={<Link to={`${challanPath}#responsibility`} state={toChallan}>Review responsibility</Link>} />
          <ol className="steps">
            <Step n={++n} title="Payer" state={payerStep}
              summary={`${payerName} ${companyPays ? 'pays the authority' : 'pays the authority directly'} · fixed once payment started`}
              note={payerStep === 'preset' && !closed ? `${account.name} pays by default. Change it here if needed; approving the payment confirms it.` : undefined}>
              {payerStep === 'done' ? null : payerLocked ? (
                <p>{payerName} {companyPays ? 'pays the authority.' : 'pays the authority directly.'} {!closed && <span className="subtle">Fixed once payment has started.</span>}</p>
              ) : (
                <RadioGroup<Payer>
                  legend="Who pays the authority?"
                  name="payer"
                  value={p.payer}
                  onChange={(payer) => payer !== p.payer && store.setPayer(c.id, payer)}
                  options={[
                    { value: 'company', label: `${account.name} pays`, description: responsible ? 'Pay now; recover the amount afterwards if someone else is responsible.' : 'Pay now; any recovery waits for the responsibility decision.' },
                    {
                      value: 'responsible_party',
                      label: 'Responsible party pays directly',
                      description: !responsible ? 'Available once responsibility is confirmed.' : responsible.kind === 'company' ? 'Not applicable: the company is responsible.' : `${responsible.name} pays the authority; you record it.`,
                      disabled: !responsible || responsible.kind === 'company',
                    },
                  ]}
                />
              )}
            </Step>

            <Step n={++n} title="Approve payment" state={approveStep}
              summary={approval ? `Approved ${formatDateTime(approval.at)}` : 'Approved'}
              note={!companyPays ? 'Not required: the responsible party pays directly.' : approveStep === 'skipped' ? 'Not required: paid outside the platform.' : undefined}>
              {approveStep === 'current' && (
                <>
                  <p>{account.name} will pay {formatAmount(c.amount)} to the authority. Nothing is paid yet.</p>
                  <div className="row">{sourcePaid ? <Button onClick={() => setDialog('external')} variant="primary">Record external payment</Button> : <ApproveButton c={c} />}{sourcePaid && <ApproveButton c={c} variant="secondary" />}</div>
                </>
              )}
            </Step>

            <Step n={++n} title={companyPays ? 'Pay or record external payment' : 'Record the party’s payment'} state={payStep}
              summary={p.status === 'unconfirmed'
                ? `Attempted ${p.lastAttemptAt ? formatDateTime(p.lastAttemptAt) : ''}; outcome not known yet`
                : `${external ? `Recorded by an operator: ${p.paidBy}` : `${formatAmount(c.amount)} paid via the simulated payment service`}${p.paidAt ? `, ${formatDateTime(p.paidAt)}` : ''}`}
              note={payStep === 'upcoming' && companyPays && !closed ? 'Waiting for approval. A payment made elsewhere can still be recorded.' : undefined}>
              {p.status === 'failed' && (
                <Callout tone="danger" title="Payment failed: not paid">
                  {p.failureReason} {p.lastAttemptAt && `Last attempt ${formatDateTime(p.lastAttemptAt)}.`} Attempts: {p.attempts}.
                </Callout>
              )}
              {companyPays && (p.status === 'approved' || p.status === 'failed') && !closed && (
                <>
                  <div className="row">
                    <Button variant={sourcePaid ? 'secondary' : 'primary'} onClick={() => setDialog('pay')}>{p.status === 'failed' ? 'Retry payment' : `Pay ${formatAmount(c.amount)}`}</Button>
                    {externalBtn(sourcePaid ? 'primary' : 'ghost')}
                  </div>
                  {sourcePaid && <p className="subtle">The source already shows paid. Check before paying again.</p>}
                  <SimulatedNote>No real payment is made. You choose the outcome in the next step.</SimulatedNote>
                </>
              )}
              {companyPays && p.status === 'not_started' && !closed && <div className="row">{!sourcePaid && externalBtn('ghost')}</div>}
              {!companyPays && p.status === 'not_started' && !closed && (
                <>
                  <p>{responsible?.name} pays the authority directly. Record it when they share proof.</p>
                  <div className="row"><Button variant="primary" onClick={() => setDialog('external')}>Record party payment</Button></div>
                </>
              )}
            </Step>

            <Step n={++n} title="Verify payment" state={verifyStep}
              summary={<>{external ? 'Operator-recorded, not verified by the platform' : 'Confirmed'} · reference <span className="mono">{p.reference}</span></>}
              note={verifyStep === 'upcoming' ? 'A started payment or an uploaded receipt is not settlement. Only a confirmed result counts as paid.' : undefined}>
              {p.status === 'unconfirmed' && (
                <>
                  <Callout tone="warning" title="Outcome unconfirmed: not marked as paid">
                    No confirmation came back. The money may or may not have moved. Check the status first so the challan is not paid twice.
                  </Callout>
                  <div className="row">
                    <Button variant="primary" onClick={() => setDialog('check')}>Check payment status</Button>
                    <Button disabled aria-describedby="retry-why">Retry payment</Button>
                  </div>
                  <p id="retry-why" className="subtle">Retry becomes available if the status check shows the payment did not go through.</p>
                </>
              )}
              {p.status === 'paid' && <Receipt c={c} />}
            </Step>

            {showRecovery && (
              <Step n={++n} title="Recover the amount" state={recoveryStep}
                summary={recovery === 'recovered' ? <>Recovered · reference <span className="mono">{c.recovery.reference}</span>{c.recovery.at && `, ${formatDateTime(c.recovery.at)}`}</> : <>Written off · {c.recovery.reference}{c.recovery.at && `, ${formatDateTime(c.recovery.at)}`}</>}
                note={recoveryStep === 'done' ? undefined : 'Tracked outside the platform. Nothing is deducted or sent from here.'}>
                {recovery === 'not_started' && <p className="subtle">Starts after the company’s payment is confirmed.</p>}
                {recovery === 'awaiting_decision' && <p>Blocked: responsibility is not confirmed. <Link to={`${challanPath}#responsibility`} state={toChallan}>Decide responsibility</Link> before recovering.</p>}
                {recovery === 'paused' && <p>Blocked: {disputed?.name ?? 'the party'} disputes responsibility. <Link to={`${challanPath}#responsibility`} state={toChallan}>Review the dispute</Link>.</p>}
                {recovery === 'pending' && (
                  <>
                    <p>Recover {formatAmount(c.amount)} from <strong>{responsible?.name}</strong>, then record the outcome.</p>
                    {!closed && <div className="row"><Button variant="primary" onClick={() => setDialog('recovery')}>Record amount recovery</Button></div>}
                  </>
                )}
              </Step>
            )}

            <Step n={++n} title="Close case" state={closeStep} keepOpen
              summary={<>Closed: {c.closure.outcome}{c.closure.at && `, ${formatDateTime(c.closure.at)}`}</>}>
              {closed ? (
                <div className="row"><Button onClick={() => setDialog('reopen')}>Reopen case</Button></div>
              ) : (
                <>
                  {/* The checklist stays folded until closing is close: earlier steps are what matter first. */}
                  <details className="close-checks" open={canClose || checks.filter((x) => !x.ok).length <= 1}>
                    <summary>What closing needs ({checks.filter((x) => x.ok).length} of {checks.length} done)</summary>
                    <ul className="checks" aria-label="Before closing">
                      {checks.map((x) => (
                        <li key={x.label} className={x.ok ? 'ok' : 'no'}>
                          <CheckIcon ok={x.ok} />
                          <span>{x.label}<span className="sr-only">{x.ok ? ': done' : ': not done'}</span></span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="row">
                    <Button variant={canClose ? 'primary' : 'secondary'} disabled={!canClose} aria-describedby="close-why" onClick={() => setDialog('close')}>Close case</Button>
                    <span id="close-why" className="subtle">{canClose ? `Outcome: ${suggestedOutcome(state, c)}` : `${checks.filter((x) => x.ok).length} of ${checks.length} done. All must pass before closing.`}</span>
                  </div>
                </>
              )}
            </Step>
          </ol>
        </Card>

        <div className="grid-main__aside">
          <Card title="Responsibility" subtitle="Separate from who pays" actions={<StatusBadge dimension="Responsibility" label={RESPONSIBILITY[rv]} />}>
            <div className="stack stack--sm">
              <div className="big-name">{responsible ? responsible.name : 'Not decided yet'}</div>
              <p className="subtle">
                {disputed ? `${disputed.name} disputes responsibility. Recovery is paused; payment is unaffected.` : responsible ? responsible.reference : 'Payment can go ahead before this is settled. Recovery waits for the decision.'}
              </p>
              <div><Link to={`${challanPath}#responsibility`} state={toChallan}>{responsible ? 'View decision' : 'Review responsibility'}</Link></div>
            </div>
          </Card>
          <Disclosure title="Activity" summary={`${c.activity.length} ${c.activity.length === 1 ? 'entry' : 'entries'} · newest first`}>
            <ActivityList items={c.activity} />
          </Disclosure>
        </div>
      </div>
      <PaymentDialogs c={c} dialog={dialog} onClose={() => setDialog('')} defaultPaidBy={companyPays ? account.name : responsible?.name ?? ''} outcome={suggestedOutcome(state, c)} toast={toast} sourcePending={sourcePending} />
    </>
  )
}

/** The one action that matters now, and what it does. Sits above the steps. */
function NowLine({ c, action, amount, payerName, responsibleKnown, responsibilityLink }: {
  c: Challan
  action: ReturnType<typeof nextAction>
  amount: string
  payerName: string
  responsibleKnown: boolean
  responsibilityLink: ReactNode
}) {
  const unpaid = c.payment.status === 'not_started' || c.payment.status === 'approved'
  const text: Record<typeof action, ReactNode> = {
    review_contest: <>A responsibility dispute is open. {responsibilityLink} first; payment is not affected by the dispute.</>,
    needs_review: <>Responsibility is not decided. {responsibilityLink}, or {unpaid ? 'pay first: the company can pay now and recover the amount after the decision.' : 'continue below.'}</>,
    confirm_suggestion: <>The records suggest who is responsible, but no one has confirmed it. {responsibilityLink}, or {unpaid ? 'pay first: recovery waits for the decision.' : 'continue below.'}</>,
    reconcile: <>Record the external payment instead of paying again.</>,
    check_payment: <>Check the payment status before retrying.</>,
    payment_failed: <>Retry the payment, or record one made elsewhere.</>,
    approve_payment: <>Approve the payment. This fixes {payerName} as the payer; no money moves yet.</>,
    pay: <>Pay {amount}, or record a payment made elsewhere. Only a confirmed result counts as paid.</>,
    await_party_payment: <>Record the responsible party’s payment once they share proof that they paid the authority.</>,
    record_recovery: <>Payment is confirmed. Record whether the amount was recovered{responsibleKnown ? '' : ' once responsibility is decided'}. Recovery happens outside the platform.</>,
    ready_to_close: <>Everything is done. Close the case to record the outcome; it can be reopened.</>,
    closed: <>This case is closed. Reopen it if something changes.</>,
  }
  return (
    <div className="steps-now" role="status" aria-live="polite">
      <span className="steps-now__label">Now</span>
      <p className="steps-now__text">{text[action]}</p>
    </div>
  )
}

function Receipt({ c }: { c: Challan }) {
  const p = c.payment
  const op = p.method === 'operator_recorded'
  return (
    <div className="receipt">
      <div className="receipt__head">
        <CheckIcon ok />
        <span>{op ? 'Recorded by an operator: not verified by the platform' : 'Confirmed by the simulated payment service'}</span>
      </div>
      <div className="receipt__body">
        <dl className="dl dl--rows">{[
          { term: 'Reference', value: <span className="mono">{p.reference}</span> },
          { term: 'Amount', value: formatAmount(c.amount) },
          { term: 'Paid by', value: p.paidBy },
          { term: 'Paid on', value: p.paidAt ? formatDateTime(p.paidAt) : '—' },
        ].map((it) => <div key={it.term} className="dl__row"><dt>{it.term}</dt><dd>{it.value}</dd></div>)}</dl>
        <div style={{ marginTop: 12 }}>
          <Button size="sm" onClick={() => downloadText(`receipt-${c.ref}.txt`, receiptText(c), 'text/plain')}>Download receipt</Button>
        </div>
      </div>
    </div>
  )
}

function ApproveButton({ c, variant = 'primary' }: { c: Challan; variant?: 'primary' | 'secondary' }) {
  const { approvePayment } = useStore()
  const toast = useToast()
  return (
    <Button variant={variant} onClick={() => {
      approvePayment(c.id)
      toast({ tone: 'success', title: 'Payment approved', body: 'Recorded as the approver. You can now pay.' })
    }}>
      Approve payment
    </Button>
  )
}

function receiptText(c: Challan) {
  const p = c.payment
  return [
    'PROTOTYPE RECEIPT. SIMULATED. NOT A REAL PAYMENT.',
    '',
    `Challan: ${c.ref}`,
    `Offence: ${c.offence}`,
    `Amount: ${formatAmount(c.amount)}`,
    `Reference: ${p.reference}`,
    `Paid by: ${p.paidBy}`,
    `Paid on: ${p.paidAt ? formatDateTime(p.paidAt) : ''}`,
    `Method: ${p.method === 'operator_recorded' ? 'Operator-recorded' : 'Simulated payment service'}`,
  ].join('\n')
}

function PaymentDialogs({ c, dialog, onClose, defaultPaidBy, outcome, toast, sourcePending }: {
  c: Challan
  sourcePending: boolean
  dialog: Dialog
  onClose: () => void
  defaultPaidBy: string
  outcome: string
  toast: ReturnType<typeof useToast>
}) {
  const store = useStore()
  const [busy, setBusy] = useState(false)
  const [sim, setSim] = useState<'success' | 'failure' | 'unconfirmed'>('success')
  const [checkSim, setCheckSim] = useState<'paid' | 'not_paid'>('paid')
  const today = new Date().toISOString().slice(0, 10)
  const [ext, setExt] = useState({ reference: '', paidBy: '', date: today, note: '' })
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [recOutcome, setRecOutcome] = useState<'recovered' | 'written_off'>('recovered')

  const close = () => {
    setBusy(false)
    setErrors({})
    setText('')
    setRecOutcome('recovered')
    setExt({ reference: '', paidBy: '', date: today, note: '' })
    onClose()
  }

  if (dialog === 'pay')
    return (
      <Modal open onClose={close} busy={busy} title={`Pay ${formatAmount(c.amount)}`} description={`Challan ${c.ref}. Paid by the company to the issuing authority.`}
        footer={<><Button onClick={close} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => {
          setBusy(true)
          window.setTimeout(() => {
            store.paymentResult(c.id, sim)
            toast(sim === 'success'
              ? { tone: 'success', title: 'Payment confirmed', body: 'Receipt is ready.' }
              : sim === 'failure'
                ? { tone: 'danger', title: 'Payment failed', body: 'Not marked as paid. You can retry.' }
                : { tone: 'warning', title: 'Payment outcome unconfirmed', body: 'Not marked as paid. Check status before retrying.' })
            close()
          }, 1400)
        }}>{busy ? 'Processing…' : `Pay ${formatAmount(c.amount)}`}</Button></>}>
        <DescList columns={2} items={[{ term: 'Amount', value: formatAmount(c.amount) }, { term: 'Attempts so far', value: c.payment.attempts }]} />
        <div className="sim-box">
          <RadioGroup
            legend="Prototype only: what should the simulated payment service return?"
            name="sim-pay"
            value={sim}
            onChange={setSim}
            options={[
              { value: 'success', label: 'Success', description: 'Confirmed. Marked as paid with a reference.' },
              { value: 'failure', label: 'Failure', description: 'Declined. Not paid; retry allowed.' },
              { value: 'unconfirmed', label: 'No confirmation (timeout)', description: 'Unknown outcome. Not paid; status check required first.' },
            ]}
          />
        </div>
      </Modal>
    )

  if (dialog === 'check')
    return (
      <Modal open onClose={close} busy={busy} size="sm" title="Check payment status" description="Ask the payment service whether the earlier attempt went through."
        footer={<><Button onClick={close} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => {
          setBusy(true)
          window.setTimeout(() => {
            store.checkPaymentStatus(c.id, checkSim)
            toast(checkSim === 'paid' ? { tone: 'success', title: 'Payment confirmed by status check' } : { tone: 'danger', title: 'No payment found', body: 'Marked as failed. You can retry safely.' })
            close()
          }, 1100)
        }}>{busy ? 'Checking…' : 'Check status'}</Button></>}>
        <div className="sim-box">
          <RadioGroup
            legend="Prototype only: what should the status check find?"
            name="sim-check"
            value={checkSim}
            onChange={setCheckSim}
            options={[
              { value: 'paid', label: 'The payment went through' },
              { value: 'not_paid', label: 'No payment was made' },
            ]}
          />
        </div>
      </Modal>
    )

  if (dialog === 'external') {
    const paidBy = ext.paidBy || defaultPaidBy
    return (
      <Modal open onClose={close} title="Record external payment" description="For a payment made outside this platform, for example directly on the authority's portal."
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => {
          const errs: Record<string, string> = {}
          if (!ext.reference.trim()) errs.reference = 'Enter the payment reference from the receipt.'
          if (!paidBy.trim()) errs.paidBy = 'Enter who paid.'
          if (!ext.date) errs.date = 'Enter the payment date.'
          else if (ext.date > today) errs.date = 'The date cannot be in the future.'
          setErrors(errs)
          if (Object.keys(errs).length) return
          store.recordExternalPayment(c.id, { reference: ext.reference.trim(), paidBy: paidBy.trim(), date: `${ext.date}T12:00:00+05:30`, note: ext.note.trim() })
          toast({ tone: 'success', title: 'External payment recorded', body: 'Marked as paid (operator-recorded).' })
          close()
        }}>Record payment</Button></>}>
        <Callout tone="warning" title="Operator-recorded">
          The platform cannot verify this payment. It will be shown as “operator-recorded” wherever it appears.
        </Callout>
        <TextField label="Payment reference" required value={ext.reference} onChange={(e) => setExt({ ...ext, reference: e.target.value })} error={errors.reference} data-autofocus />
        <div className="grid-2">
          <TextField label="Paid by" required value={paidBy} onChange={(e) => setExt({ ...ext, paidBy: e.target.value })} error={errors.paidBy} />
          <TextField label="Payment date" type="date" required value={ext.date} max={today} onChange={(e) => setExt({ ...ext, date: e.target.value })} error={errors.date} />
        </div>
        <TextArea label="Note" value={ext.note} onChange={(e) => setExt({ ...ext, note: e.target.value })} hint="Optional. Where the proof is kept." />
      </Modal>
    )
  }

  if (dialog === 'recovery')
    return (
      <Modal open onClose={close} size="sm" title="Record amount recovery" description="Record how the amount was recovered outside this platform (for example, a deduction or a transfer)."
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => {
          if (!text.trim()) {
            setErrors({ text: recOutcome === 'recovered' ? 'Enter a reference.' : 'Enter a reason.' })
            return
          }
          store.recordRecovery(c.id, text.trim(), recOutcome)
          toast({ tone: recOutcome === 'recovered' ? 'success' : 'warning', title: recOutcome === 'recovered' ? 'Amount recovery recorded' : 'Amount recovery written off' })
          close()
        }}>Save</Button></>}>
        <RadioGroup<'recovered' | 'written_off'> legend="Outcome" name="rec-outcome" value={recOutcome} onChange={(v) => { setRecOutcome(v); setErrors({}) }}
          options={[{ value: 'recovered', label: 'Recovered', description: 'The amount was collected from the responsible party.' }, { value: 'written_off', label: 'Written off', description: 'The company decides not to recover it. A reason is required.' }]} />
        {recOutcome === 'recovered'
          ? <TextField label="Recovery reference" required value={text} onChange={(e) => { setText(e.target.value); setErrors({}) }} error={errors.text} hint="For example, a deduction slip number." data-autofocus />
          : <TextArea label="Write-off reason" required value={text} onChange={(e) => { setText(e.target.value); setErrors({}) }} error={errors.text} />}
      </Modal>
    )

  if (dialog === 'close')
    return (
      <Modal open onClose={close} size="sm" title="Close this case?" description={`Outcome: ${outcome}.`}
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => {
          store.closeCase(c.id, outcome)
          toast({ tone: 'success', title: 'Case closed', body: outcome })
          close()
        }}>Close case</Button></>}>
        <p>The case leaves the open lists. You can reopen it later if something changes.</p>
        {sourcePending && <p className="subtle">The source still shows this challan as unpaid. Closing completes it here only; it stays listed under “Source update pending” until the source shows paid.</p>}
      </Modal>
    )

  if (dialog === 'reopen')
    return (
      <Modal open onClose={close} size="sm" title="Reopen this case?"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => {
          if (!text.trim()) {
            setErrors({ text: 'Add a reason.' })
            return
          }
          store.reopenCase(c.id, text.trim())
          toast({ tone: 'warning', title: 'Case reopened' })
          close()
        }}>Reopen</Button></>}>
        <TextArea label="Reason" required value={text} onChange={(e) => { setText(e.target.value); setErrors({}) }} error={errors.text} data-autofocus />
      </Modal>
    )

  return null
}
