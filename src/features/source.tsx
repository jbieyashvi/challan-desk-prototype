import { useState } from 'react'
import { useStore } from '../data/store'
import { Callout } from '../components/Layout'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { RadioGroup } from '../components/Field'
import { useToast } from '../components/Toast'
import { formatDateTime } from '../domain/format'
import { SOURCE_STATUS } from '../domain/labels'
import { isSourceUpdatePending } from '../domain/logic'
import type { Challan, SourceRecheckResult } from '../domain/types'

/** "Re-check source" with a prototype-only choice of what the simulated source returns. Never touches payment. */
export function SourceRecheckButton({ c, variant = 'secondary' }: { c: Challan; variant?: 'primary' | 'secondary' }) {
  const { syncSource } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SourceRecheckResult>('paid')
  const close = () => {
    setBusy(false)
    setOpen(false)
  }
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => { setResult('paid'); setOpen(true) }}>Re-check source</Button>
      {open && (
        <Modal open onClose={close} busy={busy} size="sm" title="Re-check source" description={`Ask the challan source for the latest status of ${c.ref}. Payment records here are not changed.`}
          footer={<><Button onClick={close} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => {
            setBusy(true)
            window.setTimeout(() => {
              syncSource(c.id, result)
              toast(result === 'failed'
                ? { tone: 'warning', title: 'Source re-check failed', body: 'Nothing changed. Try again later.' }
                : { tone: result === 'paid' ? 'success' : 'info', title: `Source re-checked: ${SOURCE_STATUS[result].text.toLowerCase()}`, body: 'Simulated.' })
              close()
            }, 900)
          }}>{busy ? 'Checking…' : 'Re-check'}</Button></>}>
          <div className="sim-box">
            <RadioGroup<SourceRecheckResult>
              legend="Prototype only: what should the simulated source return?"
              name="sim-source"
              value={result}
              onChange={setResult}
              options={[
                { value: 'paid', label: 'Paid at source', description: 'The authority’s record now shows the payment.' },
                { value: 'unpaid', label: 'Still unpaid at source', description: 'The authority’s record has not updated yet.' },
                { value: 'failed', label: 'No response', description: 'The re-check fails. Nothing changes.' },
              ]}
            />
          </div>
        </Modal>
      )}
    </>
  )
}

/** Shown on challan details and payment when a confirmed payment is not yet reflected at the source. */
export function SourcePendingCallout({ c }: { c: Challan }) {
  if (!isSourceUpdatePending(c)) return null
  const p = c.payment
  return (
    <Callout tone="warning" title="Payment confirmed · source update pending" actions={<SourceRecheckButton c={c} />}>
      Reference <span className="mono">{p.reference}</span>{p.paidAt && `, confirmed ${formatDateTime(p.paidAt)}`}. Source last checked {formatDateTime(c.lastSyncedAt)}: {SOURCE_STATUS[c.sourceStatus].text.toLowerCase()}.
      {' '}Do not pay again.{c.closure.closed && ' Closed here; the authority’s record may not be updated yet.'}
    </Callout>
  )
}
