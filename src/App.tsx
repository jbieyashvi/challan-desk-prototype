import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useStore, useWorkspace } from './data/store'
import { isUnresolved } from './domain/logic'
import { Modal } from './components/Modal'
import { Button, ButtonLink } from './components/Button'
import { RadioGroup } from './components/Field'
import { Callout, DemoExamples, EmptyState } from './components/Layout'
import { useToast } from './components/Toast'
import { Dashboard } from './pages/Dashboard'
import { Vehicles } from './pages/Vehicles'
import { VehicleDetail } from './pages/VehicleDetail'
import { Challans } from './pages/Challans'
import { ChallanDetail } from './pages/ChallanDetail'
import { ChallanPayment } from './pages/ChallanPayment'
import { DesignSystem } from './pages/DesignSystem'
import type { SimSettings } from './domain/types'

const Icon = {
  overview: <path d="M3 3h6v6H3zM11 3h6v4h-6zM11 9h6v8h-6zM3 11h6v6H3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  vehicles: <path d="M2 12V8l2-4h9l3 4h2v4M2 12h16M5 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  challans: <path d="M5 2h8l3 3v13H5zM8 8h5M8 11h5M8 14h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  controls: <path d="M4 5h12M4 10h12M4 15h12M7 3v4M13 8v4M9 13v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
  ds: <path d="M3 3h6v6H3zM11 11h6v6h-6zM14 3a3 3 0 110 6 3 3 0 010-6zM3 17l3-6 3 6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
}
const NavIcon = ({ d }: { d: keyof typeof Icon }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
    {Icon[d]}
  </svg>
)

export function App() {
  const { state, switchAccount } = useStore()
  const { account, challans } = useWorkspace()
  const [controls, setControls] = useState(false)
  const { pathname } = useLocation()
  // Same selector as the Overview "Responsibility unresolved" card and the ?responsibility=unresolved filter.
  const unresolved = challans.filter(isUnresolved).length

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M3 4h10M3 8h10M3 12h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          Challan Desk
        </div>

        {/* Workspace switcher: a native select styled as a card, so it stays keyboard and screen-reader friendly. */}
        <label className="workspace">
          <span className="workspace__label">Workspace</span>
          <span className="workspace__name">{account.name}</span>
          <span className="workspace__kind">{account.kind === 'fleet' ? 'Fleet operator · driver shifts' : 'Leasing company · lease contracts'}</span>
          <select value={account.id} onChange={(e) => switchAccount(e.target.value)} aria-label="Switch workspace">
            {state.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <svg className="workspace__chev" width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path d="M5 6l3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>

        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            <NavIcon d="overview" />
            Overview
          </NavLink>
          <NavLink to="/vehicles">
            <NavIcon d="vehicles" />
            Vehicles
          </NavLink>
          <div className="nav__item">
            <NavLink to="/challans">
              <NavIcon d="challans" />
              Challans
            </NavLink>
            {unresolved > 0 && (
              <Link className="nav__count" to="/challans?responsibility=unresolved"
                title="Responsibility not yet confirmed (needs review + suggested). Opens that list."
                aria-label={`${unresolved} challans with responsibility unresolved`}>
                {unresolved}<span className="nav__count-word">&nbsp;unresolved</span>
              </Link>
            )}
          </div>
        </nav>

        <div className="sidebar__foot">
          <nav className="nav nav--quiet" aria-label="Prototype">
            <NavLink to="/design-system">
              <NavIcon d="ds" />
              Design system
            </NavLink>
          </nav>
          <button type="button" className="nav-btn" onClick={() => setControls(true)}>
            <NavIcon d="controls" />
            Prototype controls
          </button>
          <p className="sim-label">Prototype · simulated data</p>
        </div>
      </aside>

      <main id="main" className="main">
        <div className="main__inner">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:id" element={<VehicleDetail />} />
            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/:id" element={<ChallanDetail />} />
            <Route path="/challans/:id/payment" element={<ChallanPayment />} />
            <Route path="/design-system" element={<DesignSystem />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>

      <PrototypeControls open={controls} onClose={() => setControls(false)} />
    </div>
  )
}

function NotFound() {
  return (
    <div className="card">
      <EmptyState title="Page not found" action={<ButtonLink to="/" variant="primary">Go to Overview</ButtonLink>}>
        This address does not match any screen in the prototype.
      </EmptyState>
    </div>
  )
}

function PrototypeControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, reset, setSim } = useStore()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirming(false)
        onClose()
      }}
      variant="drawer"
      title="Prototype controls"
      description="Tools for exploring the prototype. These are not part of the product design."
    >
      <Callout tone="neutral" title="Everything here is simulated">
        No real challan source, owner lookup, payment service or messaging is connected. Changes are saved in this browser only (localStorage).
      </Callout>

      <RadioGroup<SimSettings['vehicleCheck']>
        legend="Outcome of “Check now” on a vehicle"
        name="sim-vehicle-check"
        value={state.sim.vehicleCheck}
        onChange={(v) => setSim({ vehicleCheck: v })}
        options={[
          { value: 'found', label: 'Checked: sample challans found', description: 'The check completed and found fictional challans (2 the first time, then 1 more per check).' },
          { value: 'none_found', label: 'Checked: no challans found', description: 'The check completed and the source returned nothing.' },
          { value: 'failed', label: 'Check failed', description: 'The check could not complete. This is not the same as “no challans”.' },
          { value: 'incomplete', label: 'Check incomplete', description: 'Some sources answered, some did not.' },
        ]}
      />
      <DemoExamples title="Other simulated outcomes">
        <ul>
          <li>Payment: choose success, failure or no confirmation inside the payment dialog.</li>
          <li>Owner lookup: the outcome depends on the sample owner ID (listed under Demo examples in “Fetch by owner”).</li>
          <li>Source re-check: choose the result in the dialog on a challan’s “Source and sync” section.</li>
        </ul>
      </DemoExamples>

      <hr className="divider" />
      <div className="stack stack--sm">
        <h3 className="section-title">Demo data</h3>
        {!confirming ? (
          <div>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Reset demo data…
            </Button>
          </div>
        ) : (
          <Callout
            tone="danger"
            title="Reset all demo data?"
            actions={
              <>
                <Button size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  data-autofocus
                  onClick={() => {
                    reset()
                    setConfirming(false)
                    onClose()
                    toast({ tone: 'success', title: 'Demo data reset', body: 'All sample records are back to their starting state.' })
                  }}
                >
                  Reset
                </Button>
              </>
            }
          >
            Every change you made in this browser (decisions, payments, added vehicles) will be replaced by the original sample data.
          </Callout>
        )}
      </div>
    </Modal>
  )
}
