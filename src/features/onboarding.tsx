// Three ways to add vehicles: manual entry, CSV import, simulated owner lookup.
import { useRef, useState, type FormEvent } from 'react'
import { readXlsx } from './xlsx'
import { useStore, useWorkspace, type NewVehicle } from '../data/store'
import { Modal } from '../components/Modal'
import { Button } from '../components/Button'
import { SelectField, TextField } from '../components/Field'
import { Badge } from '../components/Badge'
import { Callout, DemoExamples, SimulatedNote } from '../components/Layout'
import { useToast } from '../components/Toast'
import { formatRegistration, isValidRegistration, normaliseRegistration } from '../domain/format'
import { downloadText } from './shared'

const VEHICLE_TYPES = ['Light goods vehicle', 'Medium truck', 'Pickup', 'Panel van', 'Sedan', 'Hatchback', 'SUV', 'MPV', 'Two-wheeler', 'Other']
const REG_HINT = 'Format like XX 00 AA 0001. Spaces and hyphens are ignored.'

// ---------- Manual entry ----------

export function AddVehicleDrawer({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (ids: string[]) => void }) {
  const { addVehicles } = useStore()
  const { vehicles, account } = useWorkspace()
  const toast = useToast()
  const [form, setForm] = useState({ registration: '', vehicleType: '', registeredOwner: account.name })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [another, setAnother] = useState(false)

  const close = () => {
    setForm({ registration: '', vehicleType: '', registeredOwner: account.name })
    setErrors({})
    onClose()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const reg = normaliseRegistration(form.registration)
    const errs: Record<string, string> = {}
    if (!reg) errs.registration = 'Enter a registration number.'
    else if (!isValidRegistration(reg)) errs.registration = 'This does not look like a registration number. Example: XX 00 AA 0001.'
    else if (vehicles.some((v) => v.registration === reg)) errs.registration = `${formatRegistration(reg)} is already in your vehicle list.`
    if (!form.vehicleType) errs.vehicleType = 'Choose a vehicle type.'
    if (!form.registeredOwner.trim()) errs.registeredOwner = 'Enter the registered owner.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ids = addVehicles([{ registration: reg, vehicleType: form.vehicleType, registeredOwner: form.registeredOwner.trim() }], 'manual')
    toast({ tone: 'success', title: `${formatRegistration(reg)} added`, body: 'Not checked for challans yet. Use “Check challans” in the confirmation.' })
    onAdded(ids)
    if (another) setForm({ registration: '', vehicleType: form.vehicleType, registeredOwner: form.registeredOwner })
    else close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      variant="drawer"
      title="Add a vehicle"
      description="Enter one vehicle by hand. For many vehicles, use CSV import."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-vehicle">Add vehicle</Button>
        </>
      }
    >
      <form id="add-vehicle" className="stack stack--lg" onSubmit={submit} noValidate>
        <section className="drawer-section" aria-labelledby="av-vehicle">
        <h3 id="av-vehicle" className="drawer-section__title">Vehicle</h3>
        <TextField
          label="Registration number"
          required
          value={form.registration}
          onChange={(e) => setForm({ ...form, registration: e.target.value })}
          hint={REG_HINT}
          error={errors.registration}
          autoComplete="off"
          data-autofocus
        />
        <SelectField label="Vehicle type" required value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} error={errors.vehicleType}>
          <option value="">Choose…</option>
          {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </SelectField>
        </section>
        <section className="drawer-section" aria-labelledby="av-owner">
        <h3 id="av-owner" className="drawer-section__title">Ownership</h3>
        <TextField
          label="Registered owner"
          required
          value={form.registeredOwner}
          onChange={(e) => setForm({ ...form, registeredOwner: e.target.value })}
          hint="As shown on the registration certificate."
          error={errors.registeredOwner}
        />
        </section>
        <label className="row">
          <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} />
          Add another after this one
        </label>
      </form>
    </Modal>
  )
}

// ---------- CSV import ----------

type RowStatus = 'ready' | 'duplicate_file' | 'exists' | 'error'
interface ParsedRow {
  line: number
  raw: string[]
  vehicle: NewVehicle
  status: RowStatus
  problem?: string
}

const HEADER = ['registration', 'vehicle_type', 'registered_owner']

export function sampleCsv(kind: 'fleet' | 'leasing') {
  const owner = kind === 'fleet' ? 'Example Freight Co.' : 'Example Lease Ltd.'
  const existing = kind === 'fleet' ? 'XX00AA0001' : 'XX00BB0002'
  const p = kind === 'fleet' ? 'CC' : 'DD'
  return [
    HEADER.join(','),
    `XX 00 ${p} 0101,Light goods vehicle,${owner}`,
    `XX-00-${p}-0102,Panel van,${owner}`,
    `XX00${p}0103,Pickup,${owner}`,
    `XX00${p}0101,Light goods vehicle,${owner}`,
    `${existing},Sedan,${owner}`,
    `XX00${p}01,Panel van,${owner}`,
    `XX00${p}0104,Medium truck,`,
  ].join('\n')
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

type Grid = { line: number; cells: string[] }[]

function csvGrid(text: string): Grid {
  return text.replace(/^\ufeff/, '').split(/\r?\n/).map((l, i) => ({ line: i + 1, cells: splitCsvLine(l) }))
}

/** Shared by CSV and .xlsx: the first non-empty row is the header, then one vehicle per row. */
function parseGrid(grid: Grid, existing: Set<string>): { rows: ParsedRow[]; headerError?: string } {
  const lines = grid.filter((r) => r.cells.some((x) => x.trim() !== ''))
  if (lines.length === 0) return { rows: [], headerError: 'The file is empty.' }
  const header = lines[0].cells.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const idx = HEADER.map((h) => header.indexOf(h))
  if (idx.some((i) => i < 0)) {
    const missing = HEADER.filter((_, k) => idx[k] < 0)
    return { rows: [], headerError: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. The first row must be: ${HEADER.join(', ')}.` }
  }
  const seen = new Set<string>()
  const rows = lines.slice(1).map(({ line: i, cells: raw }) => {
    const vehicle = {
      registration: normaliseRegistration(raw[idx[0]] ?? ''),
      vehicleType: raw[idx[1]] ?? '',
      registeredOwner: raw[idx[2]] ?? '',
    }
    const row: ParsedRow = { line: i, raw, vehicle, status: 'ready' }
    const missing = [!vehicle.registration && 'registration', !vehicle.vehicleType && 'vehicle type', !vehicle.registeredOwner && 'registered owner'].filter(Boolean)
    if (missing.length) {
      row.status = 'error'
      row.problem = `Missing ${missing.join(', ')}`
    } else if (!isValidRegistration(vehicle.registration)) {
      row.status = 'error'
      row.problem = 'Registration format not recognised'
    } else if (existing.has(vehicle.registration)) {
      row.status = 'exists'
      row.problem = 'Already in your vehicle list; will be skipped'
    } else if (seen.has(vehicle.registration)) {
      row.status = 'duplicate_file'
      row.problem = 'Repeated in this file; only the first row is imported'
    }
    if (row.status === 'ready') seen.add(vehicle.registration)
    return row
  })
  return { rows }
}

const STATUS_BADGE: Record<RowStatus, { text: string; tone: 'success' | 'neutral' | 'warning' | 'danger' }> = {
  ready: { text: 'Ready', tone: 'success' },
  duplicate_file: { text: 'Duplicate in file', tone: 'warning' },
  exists: { text: 'Already added', tone: 'neutral' },
  error: { text: 'Error', tone: 'danger' },
}

export function CsvImportDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (ids: string[]) => void }) {
  const { addVehicles } = useStore()
  const { vehicles, account } = useWorkspace()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [drag, setDrag] = useState(false)
  const [only, setOnly] = useState<'all' | 'problems'>('all')

  const resetState = () => {
    setFileName('')
    setFileError('')
    setRows(null)
    setOnly('all')
    if (input.current) input.current.value = ''
  }
  const close = () => {
    resetState()
    onClose()
  }

  const load = (name: string, grid: Grid) => {
    setFileName(name)
    const res = parseGrid(grid, new Set(vehicles.map((v) => v.registration)))
    if (res.headerError) {
      setFileError(res.headerError)
      setRows(null)
    } else if (res.rows.length === 0) {
      setFileError('The file has a header row but no vehicles.')
      setRows(null)
    } else {
      setFileError('')
      setRows(res.rows)
    }
  }

  const pick = (file: File | undefined) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    const fail = (msg: string) => {
      setFileName(file.name)
      setRows(null)
      setFileError(msg)
    }
    if (lower.endsWith('.xls')) return fail('Older Excel files (.xls) cannot be read. In Excel, choose File → Save as → Excel Workbook (.xlsx) or CSV, then upload that file.')
    if (lower.endsWith('.xlsx')) {
      readXlsx(file).then((g) => load(file.name, g)).catch(() => fail('This .xlsx file could not be read. Check that it is a normal Excel workbook, or save it as CSV and upload that instead.'))
      return
    }
    if (!lower.endsWith('.csv')) return fail('This file type cannot be imported. Save the vehicle list as an Excel Workbook (.xlsx) or CSV, then upload that file.')
    file.text().then((t) => load(file.name, csvGrid(t)))
  }

  const ready = rows?.filter((r) => r.status === 'ready') ?? []
  const problems = rows?.filter((r) => r.status !== 'ready') ?? []
  const shown = only === 'problems' ? problems : rows ?? []

  const doImport = () => {
    const ids = addVehicles(ready.map((r) => r.vehicle), 'import')
    toast({ tone: 'success', title: `${ids.length} vehicle${ids.length === 1 ? '' : 's'} imported`, body: `${problems.length} row${problems.length === 1 ? '' : 's'} skipped. New vehicles are not checked for challans yet.` })
    onAdded(ids)
    close()
  }

  const downloadProblems = () => {
    const text = [[...HEADER, 'problem'].join(','), ...problems.map((r) => [...HEADER.map((_, k) => r.raw[k] ?? ''), r.problem ?? ''].map((s) => `"${s.replace(/"/g, '""')}"`).join(','))].join('\n')
    downloadText('vehicle-import-problems.csv', text)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import vehicles from a spreadsheet"
      description="Upload an Excel (.xlsx) or CSV file with one vehicle per row. You will see a preview before anything is added."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          {rows && <Button onClick={resetState}>Choose another file</Button>}
          <Button variant="primary" disabled={!rows || ready.length === 0} onClick={doImport}>
            {rows ? `Import ${ready.length} vehicle${ready.length === 1 ? '' : 's'}` : 'Import'}
          </Button>
        </>
      }
    >
      {!rows && (
        <>
          <div
            className={`upload${drag ? ' upload--drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              pick(e.dataTransfer.files[0])
            }}
          >
            <strong>Drop an .xlsx or .csv file here, or</strong>
            <input ref={input} id="csv-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            <Button variant="primary" onClick={() => input.current?.click()} data-autofocus>Choose file</Button>
            <span className="subtle">Columns: {HEADER.join(', ')}. First worksheet only; older .xls files are not supported.</span>
          </div>
          {fileError && (
            <Callout tone="danger" title={`Could not read ${fileName}`}>
              {fileError}
            </Callout>
          )}
          <DemoExamples>
            <p>The sample file includes a few rows with problems so you can see how they are handled.</p>
            <div className="row">
              <Button size="sm" onClick={() => downloadText('sample-vehicles.csv', sampleCsv(account.kind))}>Download sample CSV</Button>
              <Button size="sm" variant="ghost" onClick={() => load('sample-vehicles.csv', csvGrid(sampleCsv(account.kind)))}>Preview the sample</Button>
            </div>
          </DemoExamples>
        </>
      )}

      {rows && (
        <>
          <div className="row row--between">
            <div>
              <strong>{fileName}</strong>
              <span className="subtle"> · {rows.length} row{rows.length === 1 ? '' : 's'}</span>
            </div>
            <div className="stat-row" aria-label="Validation summary">
              <Badge tone="success">{ready.length} ready</Badge>
              {(['duplicate_file', 'exists', 'error'] as const).map((s) => {
                const n = rows.filter((r) => r.status === s).length
                return n ? <Badge key={s} tone={STATUS_BADGE[s].tone}>{n} {STATUS_BADGE[s].text.toLowerCase()}</Badge> : null
              })}
            </div>
          </div>
          {problems.length > 0 && (
            <Callout
              tone="warning"
              title={`${problems.length} row${problems.length === 1 ? '' : 's'} will not be imported`}
              actions={<Button size="sm" onClick={downloadProblems}>Download problem rows</Button>}
            >
              Fix them in your file and import again, or add them by hand. Rows marked “Ready” can be imported now.
            </Callout>
          )}
          <div className="chips" role="group" aria-label="Show rows">
            <button type="button" className="chip" aria-pressed={only === 'all'} onClick={() => setOnly('all')}>All rows ({rows.length})</button>
            <button type="button" className="chip" aria-pressed={only === 'problems'} onClick={() => setOnly('problems')}>Problems only ({problems.length})</button>
          </div>
          <div className="preview-table">
            <table className="table">
              <caption className="sr-only">Import preview</caption>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col">Registration</th>
                  <th scope="col">Type</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.line}>
                    <td className="subtle">{r.line}</td>
                    <td className="mono">{r.vehicle.registration ? formatRegistration(r.vehicle.registration) : <span className="subtle">(empty)</span>}</td>
                    <td>{r.vehicle.vehicleType || <span className="subtle">(empty)</span>}</td>
                    <td>{r.vehicle.registeredOwner || <span className="subtle">(empty)</span>}</td>
                    <td>
                      <Badge tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].text}</Badge>
                      {r.problem && <div className="cell-sub">{r.problem}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}

// ---------- Owner lookup (simulated API) ----------

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'results'; owner: string; list: NewVehicle[]; partial: boolean }
  | { state: 'empty'; owner: string }
  | { state: 'not_found' }
  | { state: 'failed' }

function simulatedOwnerApi(id: string, kind: 'fleet' | 'leasing'): Lookup {
  const owner = kind === 'fleet' ? 'Example Freight Co.' : 'Example Lease Ltd.'
  const p = kind === 'fleet' ? 'EE' : 'FF'
  const existing = kind === 'fleet' ? 'XX00AA0002' : 'XX00BB0005'
  const list: NewVehicle[] = [
    { registration: `XX00${p}0201`, vehicleType: kind === 'fleet' ? 'Medium truck' : 'Sedan', registeredOwner: owner },
    { registration: `XX00${p}0202`, vehicleType: kind === 'fleet' ? 'Panel van' : 'SUV', registeredOwner: owner },
    { registration: existing, vehicleType: kind === 'fleet' ? 'Light goods vehicle' : 'SUV', registeredOwner: owner },
    { registration: `XX00${p}0203`, vehicleType: kind === 'fleet' ? 'Pickup' : 'Hatchback', registeredOwner: owner },
  ]
  switch (id.trim().toUpperCase()) {
    case 'OWN-SAMPLE-01':
      return { state: 'results', owner, list, partial: false }
    case 'OWN-PARTIAL':
      return { state: 'results', owner, list: list.slice(0, 2), partial: true }
    case 'OWN-EMPTY':
      return { state: 'empty', owner }
    case 'OWN-FAIL':
      return { state: 'failed' }
    default:
      return { state: 'not_found' }
  }
}

export function OwnerFetchDrawer({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (ids: string[]) => void }) {
  const { addVehicles } = useStore()
  const { vehicles, account } = useWorkspace()
  const toast = useToast()
  const [ownerId, setOwnerId] = useState('')
  const [error, setError] = useState('')
  const [res, setRes] = useState<Lookup>({ state: 'idle' })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const timer = useRef<number>(0)
  const existing = new Set(vehicles.map((v) => v.registration))

  const close = () => {
    window.clearTimeout(timer.current)
    setOwnerId('')
    setError('')
    setRes({ state: 'idle' })
    setPicked(new Set())
    onClose()
  }

  const fetchNow = (e?: FormEvent) => {
    e?.preventDefault()
    if (!ownerId.trim()) {
      setError('Enter an owner ID.')
      return
    }
    setError('')
    setRes({ state: 'loading' })
    timer.current = window.setTimeout(() => {
      const r = simulatedOwnerApi(ownerId, account.kind)
      setRes(r)
      if (r.state === 'results') setPicked(new Set(r.list.filter((v) => !existing.has(v.registration)).map((v) => v.registration)))
    }, 1100)
  }

  const add = () => {
    if (res.state !== 'results') return
    const list = res.list.filter((v) => picked.has(v.registration))
    const ids = addVehicles(list, 'owner_api')
    toast({ tone: 'success', title: `${ids.length} vehicle${ids.length === 1 ? '' : 's'} added from owner lookup`, body: 'Not checked for challans yet.' })
    onAdded(ids)
    close()
  }

  const selectable = res.state === 'results' ? res.list.filter((v) => !existing.has(v.registration)) : []

  return (
    <Modal
      open={open}
      onClose={close}
      variant="drawer"
      title="Fetch vehicles by owner"
      description="Look up vehicles registered to an owner, then choose which to add."
      busy={res.state === 'loading'}
      footer={
        <>
          <Button onClick={close} disabled={res.state === 'loading'}>Cancel</Button>
          {res.state === 'results' && (
            <Button variant="primary" disabled={picked.size === 0} onClick={add}>
              Add {picked.size} vehicle{picked.size === 1 ? '' : 's'}
            </Button>
          )}
        </>
      }
    >
      <SimulatedNote>No real registry is contacted. Results come from fictional sample data.</SimulatedNote>
      <form className="stack stack--sm" onSubmit={fetchNow} noValidate>
        <TextField
          label="Owner ID"
          required
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          error={error}
          disabled={res.state === 'loading'}
          data-autofocus
        />
        <DemoExamples>
          <p>Owner IDs that return each outcome:</p>
          <ul>
            <li><span className="mono">OWN-SAMPLE-01</span>: vehicles found</li>
            <li><span className="mono">OWN-PARTIAL</span>: some vehicles, lookup incomplete</li>
            <li><span className="mono">OWN-EMPTY</span>: owner with no vehicles</li>
            <li><span className="mono">OWN-FAIL</span>: lookup fails</li>
          </ul>
          <p>Anything else returns “not found”.</p>
        </DemoExamples>
        <div>
          <Button type="submit" variant="secondary" loading={res.state === 'loading'}>
            {res.state === 'loading' ? 'Fetching…' : 'Fetch vehicles'}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {res.state === 'loading' && (
          <div className="row muted">
            <span className="spinner spinner--lg" aria-hidden /> Contacting the owner lookup service (simulated)…
          </div>
        )}
        {res.state === 'not_found' && (
          <Callout tone="neutral" title="No owner found with this ID">
            Check the ID and try again. This is different from an owner with no vehicles.
          </Callout>
        )}
        {res.state === 'empty' && (
          <Callout tone="neutral" title={`Owner found: ${res.owner}`}>
            No vehicles are registered to this owner, so there is nothing to add.
          </Callout>
        )}
        {res.state === 'failed' && (
          <Callout tone="danger" title="The lookup failed" actions={<Button size="sm" onClick={() => fetchNow()}>Try again</Button>}>
            The service did not respond (simulated). We don't know whether this owner has vehicles. Try again, or add vehicles by hand or by CSV.
          </Callout>
        )}
        {res.state === 'results' && (
          <div className="stack stack--sm">
            {res.partial && (
              <Callout tone="warning" title="Partial results">
                The service returned only part of the list (simulated). Some vehicles may be missing. You can add these now and fetch again later.
              </Callout>
            )}
            <p>
              <strong>{res.owner}</strong>: {res.list.length} vehicle{res.list.length === 1 ? '' : 's'} found.
            </p>
            <fieldset className="choice-group">
              <legend className="field__label">Choose vehicles to add</legend>
              {res.list.map((v) => {
                const already = existing.has(v.registration)
                return (
                  <label key={v.registration} className={`choice${already ? ' choice--disabled' : ''}${picked.has(v.registration) ? ' choice--selected' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={already}
                      checked={picked.has(v.registration)}
                      onChange={(e) => {
                        const next = new Set(picked)
                        if (e.target.checked) next.add(v.registration)
                        else next.delete(v.registration)
                        setPicked(next)
                      }}
                    />
                    <span className="choice__body">
                      <span className="choice__label mono">{formatRegistration(v.registration)}</span>
                      <span className="choice__desc">{v.vehicleType}{already && ' · Already in your list'}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            {selectable.length > 1 && (
              <div className="row">
                <button type="button" className="link-btn" onClick={() => setPicked(new Set(selectable.map((v) => v.registration)))}>Select all new</button>
                <button type="button" className="link-btn" onClick={() => setPicked(new Set())}>Clear</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
