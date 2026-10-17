// Fictional sample data. Every company, person, registration number, reference,
// date and amount below is invented for this prototype.
// "XX" registration prefixes are deliberately not real state codes.
import type { ActivityEntry, Assignment, Challan, DemoState, Party, Payment, Vehicle } from '../domain/types'

export const SEED_VERSION = 4
const SYNC = '2026-10-17T08:30:00+05:30'

let n = 0
const act = (at: string, actor: ActivityEntry['actor'], title: string, detail?: string, tone?: ActivityEntry['tone']): ActivityEntry => ({
  id: `seed-act-${++n}`,
  at,
  actor,
  title,
  detail,
  tone,
})

const parties: Party[] = [
  // Fleet: Example Freight Co.
  { id: 'p-fa', accountId: 'acc-fleet', name: 'Driver A', kind: 'driver', reference: 'Driver ID D-01' },
  { id: 'p-fb', accountId: 'acc-fleet', name: 'Driver B', kind: 'driver', reference: 'Driver ID D-02' },
  { id: 'p-fc', accountId: 'acc-fleet', name: 'Driver C', kind: 'driver', reference: 'Driver ID D-03' },
  { id: 'p-ff', accountId: 'acc-fleet', name: 'Driver F', kind: 'driver', reference: 'Driver ID D-06' },
  { id: 'p-fco', accountId: 'acc-fleet', name: 'Example Freight Co. (company)', kind: 'company', reference: 'Absorbed internally' },
  // Leasing: Example Lease Ltd.
  { id: 'p-lc', accountId: 'acc-lease', name: 'Lessee Org C', kind: 'lessee', reference: 'Customer no. LC-1001 (business)' },
  { id: 'p-ld', accountId: 'acc-lease', name: 'Lessee Org D', kind: 'lessee', reference: 'Customer no. LC-1002 (business)' },
  { id: 'p-lg', accountId: 'acc-lease', name: 'Lessee G', kind: 'lessee', reference: 'Customer no. LC-1003 (individual)' },
  { id: 'p-lco', accountId: 'acc-lease', name: 'Example Lease Ltd. (company)', kind: 'company', reference: 'Absorbed internally' },
]

const v = (id: string, accountId: string, registration: string, vehicleType: string, registeredOwner: string, check: Vehicle['check']): Vehicle => ({
  id,
  accountId,
  registration,
  vehicleType,
  registeredOwner,
  source: 'seed',
  addedAt: '2026-09-01T10:00:00+05:30',
  check,
})

const vehicles: Vehicle[] = [
  v('v-f1', 'acc-fleet', 'XX00AA0001', 'Light goods vehicle', 'Example Freight Co.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-f2', 'acc-fleet', 'XX00AA0002', 'Light goods vehicle', 'Example Freight Co.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  // Latest check failed, but a challan found by an earlier complete check is kept (count shown as possibly out of date).
  v('v-f3', 'acc-fleet', 'XX00AA0003', 'Pickup', 'Example Freight Co.', { status: 'failed', at: SYNC, lastCompleteAt: '2026-10-14T09:00:00+05:30' }),
  v('v-f4', 'acc-fleet', 'XX00AA0004', 'Light goods vehicle', 'Example Freight Co.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-f5', 'acc-fleet', 'XX00AA0005', 'Panel van', 'Example Freight Co.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-f6', 'acc-fleet', 'XX00AA0006', 'Medium truck', 'Example Owner-Operator 1', { status: 'failed', at: SYNC }),
  v('v-f7', 'acc-fleet', 'XX00AA0007', 'Panel van', 'Example Freight Co.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-l1', 'acc-lease', 'XX00BB0002', 'Sedan', 'Example Lease Ltd.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-l2', 'acc-lease', 'XX00BB0005', 'SUV', 'Example Lease Ltd.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-l3', 'acc-lease', 'XX00BB0007', 'Hatchback', 'Example Lease Ltd.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
  v('v-l4', 'acc-lease', 'XX00BB0009', 'Sedan', 'Example Lease Ltd.', { status: 'incomplete', at: SYNC }),
  v('v-l5', 'acc-lease', 'XX00BB0011', 'MPV', 'Example Lease Ltd.', { status: 'checked', at: SYNC, lastCompleteAt: SYNC }),
]

const a = (id: string, vehicleId: string, partyId: string, ref: string, start: string, end: string | null, enteredAt: string, enteredBy = 'Operator', note?: string, noteHandoverAt?: string): Assignment => ({
  id,
  vehicleId,
  partyId,
  ref,
  start,
  end,
  enteredAt,
  enteredBy,
  note,
  noteHandoverAt,
})

const assignments: Assignment[] = [
  // v-f1: Scenario A (handover)
  a('a-f190', 'v-f1', 'p-fa', 'Shift F-190', '2026-10-01T08:00:00+05:30', '2026-10-01T20:00:00+05:30', '2026-10-01T08:05:00+05:30'),
  a('a-f201', 'v-f1', 'p-fa', 'Shift F-201', '2026-10-02T08:00:00+05:30', '2026-10-02T20:00:00+05:30', '2026-10-02T21:15:00+05:30', 'Operator',
    'Handover note from depot: "Keys handed to B around 19:45." Shift times entered by hand after the handover.', '2026-10-02T19:45:00+05:30'),
  a('a-f202', 'v-f1', 'p-fb', 'Shift F-202', '2026-10-02T20:00:00+05:30', '2026-10-03T08:00:00+05:30', '2026-10-02T21:15:00+05:30', 'Operator'),
  a('a-f310', 'v-f1', 'p-fc', 'Assignment F-310', '2026-10-15T08:00:00+05:30', null, '2026-10-15T07:50:00+05:30'),
  // v-f2
  a('a-f150', 'v-f2', 'p-fc', 'Assignment F-150', '2026-09-20T08:00:00+05:30', '2026-10-14T20:00:00+05:30', '2026-09-20T07:55:00+05:30'),
  a('a-f311', 'v-f2', 'p-ff', 'Assignment F-311', '2026-10-15T08:00:00+05:30', null, '2026-10-15T07:52:00+05:30'),
  // v-f3: gap between 6 Oct 18:00 and 8 Oct 08:00
  a('a-f160', 'v-f3', 'p-ff', 'Assignment F-160', '2026-10-01T08:00:00+05:30', '2026-10-06T18:00:00+05:30', '2026-10-01T07:40:00+05:30'),
  a('a-f175', 'v-f3', 'p-fa', 'Assignment F-175', '2026-10-08T08:00:00+05:30', null, '2026-10-08T07:45:00+05:30'),
  // v-f4: overlap on 10 Oct; two shifts on 25 Sep (date-only challan)
  a('a-f120', 'v-f4', 'p-fb', 'Shift F-120', '2026-09-25T08:00:00+05:30', '2026-09-25T20:00:00+05:30', '2026-09-25T07:58:00+05:30'),
  a('a-f121', 'v-f4', 'p-ff', 'Shift F-121', '2026-09-25T20:00:00+05:30', '2026-09-26T08:00:00+05:30', '2026-09-25T19:50:00+05:30'),
  a('a-f180', 'v-f4', 'p-fb', 'Shift F-180', '2026-10-10T08:00:00+05:30', '2026-10-10T18:00:00+05:30', '2026-10-10T07:55:00+05:30'),
  a('a-f181', 'v-f4', 'p-ff', 'Shift F-181', '2026-10-10T12:00:00+05:30', '2026-10-10T20:00:00+05:30', '2026-10-11T09:00:00+05:30', 'Import (shift roster file)'),
  a('a-f312', 'v-f4', 'p-fb', 'Assignment F-312', '2026-10-11T08:00:00+05:30', null, '2026-10-11T07:50:00+05:30'),
  // v-f5: in depot now
  a('a-f140', 'v-f5', 'p-ff', 'Assignment F-140', '2026-09-15T08:00:00+05:30', '2026-09-30T20:00:00+05:30', '2026-09-15T07:45:00+05:30'),
  a('a-f165', 'v-f5', 'p-fb', 'Assignment F-165', '2026-10-01T08:00:00+05:30', '2026-10-09T20:00:00+05:30', '2026-10-01T07:40:00+05:30'),
  // v-f6
  a('a-f100', 'v-f6', 'p-ff', 'Assignment F-100', '2026-08-01T08:00:00+05:30', '2026-09-14T20:00:00+05:30', '2026-08-01T07:30:00+05:30'),
  // v-l1: Scenario B (lease ended)
  a('a-l101', 'v-l1', 'p-lc', 'Lease L-101', '2026-01-01T09:00:00+05:30', '2026-06-15T10:00:00+05:30', '2026-06-15T10:20:00+05:30', 'Operator',
    'Returned early. Planned end was 30 Jun 2026. Return inspection recorded at branch on 15 Jun 2026, 10:00.'),
  a('a-l102', 'v-l1', 'p-ld', 'Lease L-102', '2026-06-20T11:00:00+05:30', null, '2026-06-20T10:45:00+05:30'),
  // v-l2
  a('a-l140', 'v-l2', 'p-lg', 'Lease L-140', '2026-03-01T10:00:00+05:30', null, '2026-03-01T09:40:00+05:30'),
  // v-l3: returned to stock 31 May, no lease since
  a('a-l150', 'v-l3', 'p-ld', 'Lease L-150', '2026-02-01T10:00:00+05:30', '2026-05-31T18:00:00+05:30', '2026-02-01T09:30:00+05:30', 'Operator', 'Vehicle returned to company stock.'),
  // v-l4
  a('a-l155', 'v-l4', 'p-ld', 'Lease L-155', '2026-07-01T10:00:00+05:30', null, '2026-07-01T09:20:00+05:30'),
  // v-l5
  a('a-l170', 'v-l5', 'p-lg', 'Lease L-170', '2026-01-10T10:00:00+05:30', '2026-04-10T18:00:00+05:30', '2026-01-10T09:30:00+05:30'),
]

const pay = (p: Partial<Payment> = {}): Payment => ({ status: 'not_started', payer: 'company', attempts: 0, ...p })

const base = {
  dispute: { status: 'none' as const },
  recovery: { record: 'none' as const },
  closure: { closed: false },
  lastSyncedAt: SYNC,
}

const discovered = (at: string) => act(at, 'Simulated sync', 'Challan discovered', 'Found during a simulated challan check for this vehicle.', 'info')

const challans: Challan[] = [
  // ---------- Scenario A ----------
  {
    ...base,
    id: 'c-f0142', ref: 'SAMPLE-F-0142', vehicleId: 'v-f1',
    violationAt: '2026-10-02T19:55:00+05:30', timePrecision: 'exact',
    offence: 'Speed limit exceeded', location: 'Ring Road, Sample City', amount: 2000, dueDate: '2026-11-08',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-09T10:30:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-09T10:30:00+05:30')],
  },
  {
    ...base,
    id: 'c-f0118', ref: 'SAMPLE-F-0118', vehicleId: 'v-f2',
    violationAt: '2026-09-28T11:20:00+05:30', timePrecision: 'exact',
    offence: 'Parking in a no-parking zone', location: 'Market Road, Sample City', amount: 500, dueDate: '2026-10-30',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-06T09:10:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-06T09:10:00+05:30')],
  },
  {
    ...base,
    id: 'c-f0121', ref: 'SAMPLE-F-0121', vehicleId: 'v-f2',
    violationAt: '2026-10-05T09:40:00+05:30', timePrecision: 'exact',
    offence: 'Signal violation', location: 'Station Junction, Sample City', amount: 1000, dueDate: '2026-11-04',
    sourceStatus: 'paid', discoveredAt: '2026-10-10T09:00:00+05:30',
    responsibility: { status: 'confirmed', partyId: 'p-fc' },
    payment: pay({ status: 'paid', method: 'simulated', reference: 'SIM-PAY-0084', paidAt: '2026-10-12T15:10:00+05:30', paidBy: 'Example Freight Co.', attempts: 1, lastAttemptAt: '2026-10-12T15:10:00+05:30' }),
    activity: [
      discovered('2026-10-10T09:00:00+05:30'),
      act('2026-10-10T11:20:00+05:30', 'Operator', 'Responsibility confirmed: Driver C', 'Reason: Assignment F-150 active at violation time.', 'success'),
      act('2026-10-12T15:02:00+05:30', 'Approver', 'Payment approved', 'Payer: company. Amount ₹1,000.'),
      act('2026-10-12T15:10:00+05:30', 'Simulated payment service', 'Payment confirmed', 'Reference SIM-PAY-0084.', 'success'),
      act('2026-10-13T08:30:00+05:30', 'Simulated sync', 'Source status changed to Paid at source'),
    ],
  },
  {
    ...base,
    id: 'c-f0098', ref: 'SAMPLE-F-0098', vehicleId: 'v-f2',
    violationAt: '2026-09-22T17:05:00+05:30', timePrecision: 'exact',
    offence: 'Parking in a no-parking zone', location: 'Depot Lane, Sample City', amount: 500,
    sourceStatus: 'paid', discoveredAt: '2026-09-26T09:00:00+05:30',
    responsibility: { status: 'accepted', partyId: 'p-fc' },
    payment: pay({ status: 'paid', method: 'simulated', reference: 'SIM-PAY-0071', paidAt: '2026-09-28T12:00:00+05:30', paidBy: 'Example Freight Co.', attempts: 1, lastAttemptAt: '2026-09-28T12:00:00+05:30' }),
    recovery: { record: 'recovered', reference: 'Payroll adj. REC-0012', at: '2026-10-05T10:00:00+05:30' },
    closure: { closed: true, outcome: 'Settled and recovered', at: '2026-10-05T10:05:00+05:30' },
    activity: [
      discovered('2026-09-26T09:00:00+05:30'),
      act('2026-09-26T10:00:00+05:30', 'Operator', 'Responsibility confirmed: Driver C', 'Reason: Assignment F-150 active at violation time.', 'success'),
      act('2026-09-27T09:30:00+05:30', 'Operator', 'Party acceptance recorded', 'Driver C accepted in person at the depot (recorded by operator).'),
      act('2026-09-28T12:00:00+05:30', 'Simulated payment service', 'Payment confirmed', 'Reference SIM-PAY-0071.', 'success'),
      act('2026-10-05T10:00:00+05:30', 'Operator', 'Amount recovery recorded', 'Payroll adj. REC-0012.', 'success'),
      act('2026-10-05T10:05:00+05:30', 'Operator', 'Case closed', 'Outcome: Settled and recovered.'),
    ],
  },
  {
    ...base,
    id: 'c-f0130', ref: 'SAMPLE-F-0130', vehicleId: 'v-f3',
    violationAt: '2026-10-07T14:05:00+05:30', timePrecision: 'exact',
    offence: 'Lane discipline violation', location: 'Bypass Road, Sample City', amount: 1500, dueDate: '2026-11-10',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-14T09:00:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-14T09:00:00+05:30')],
  },
  {
    ...base,
    id: 'c-f0135', ref: 'SAMPLE-F-0135', vehicleId: 'v-f4',
    violationAt: '2026-10-10T13:30:00+05:30', timePrecision: 'exact',
    offence: 'Speed limit exceeded', location: 'Ring Road, Sample City', amount: 2000, dueDate: '2026-11-12',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-15T09:00:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-15T09:00:00+05:30')],
  },
  {
    ...base,
    id: 'c-f0109', ref: 'SAMPLE-F-0109', vehicleId: 'v-f4',
    violationAt: '2026-09-25T00:00:00+05:30', timePrecision: 'date',
    offence: 'Pollution certificate not produced', location: 'Checkpoint 4, Sample City', amount: 500, dueDate: '2026-10-28',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-02T09:00:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-02T09:00:00+05:30')],
  },
  {
    ...base,
    id: 'c-f0127', ref: 'SAMPLE-F-0127', vehicleId: 'v-f5',
    violationAt: '2026-10-03T10:15:00+05:30', timePrecision: 'exact',
    offence: 'Signal violation', location: 'Station Junction, Sample City', amount: 1000, dueDate: '2026-11-02',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-11T09:00:00+05:30',
    responsibility: { status: 'confirmed', partyId: 'p-fb' },
    payment: pay({ status: 'unconfirmed', attempts: 1, lastAttemptAt: '2026-10-16T18:20:00+05:30' }),
    activity: [
      discovered('2026-10-11T09:00:00+05:30'),
      act('2026-10-11T12:00:00+05:30', 'Operator', 'Responsibility confirmed: Driver B', 'Reason: Assignment F-165 active at violation time.', 'success'),
      act('2026-10-16T18:10:00+05:30', 'Approver', 'Payment approved', 'Payer: company. Amount ₹1,000.'),
      act('2026-10-16T18:20:00+05:30', 'Simulated payment service', 'Payment outcome unconfirmed', 'No confirmation received (simulated timeout). Not marked as paid.', 'warning'),
    ],
  },
  {
    ...base,
    id: 'c-f0124', ref: 'SAMPLE-F-0124', vehicleId: 'v-f5',
    violationAt: '2026-09-27T13:00:00+05:30', timePrecision: 'exact',
    offence: 'Parking in a no-parking zone', location: 'Market Road, Sample City', amount: 500, dueDate: '2026-10-27',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-04T09:00:00+05:30',
    responsibility: { status: 'confirmed', partyId: 'p-ff' },
    payment: pay({ status: 'failed', attempts: 1, lastAttemptAt: '2026-10-15T11:00:00+05:30', failureReason: 'Simulated: payment declined by the payment service.' }),
    activity: [
      discovered('2026-10-04T09:00:00+05:30'),
      act('2026-10-04T11:00:00+05:30', 'Operator', 'Responsibility confirmed: Driver F', 'Reason: Assignment F-140 active at violation time.', 'success'),
      act('2026-10-15T10:50:00+05:30', 'Approver', 'Payment approved', 'Payer: company. Amount ₹500.'),
      act('2026-10-15T11:00:00+05:30', 'Simulated payment service', 'Payment failed', 'Simulated: payment declined by the payment service. Not marked as paid.', 'danger'),
    ],
  },
  {
    ...base,
    id: 'c-f0115', ref: 'SAMPLE-F-0115', vehicleId: 'v-f5',
    violationAt: '2026-09-18T09:30:00+05:30', timePrecision: 'exact',
    offence: 'Seatbelt not worn', location: 'Bypass Road, Sample City', amount: 1000,
    sourceStatus: 'paid', discoveredAt: '2026-09-24T09:00:00+05:30',
    responsibility: { status: 'confirmed', partyId: 'p-ff' }, payment: pay(),
    activity: [
      discovered('2026-09-24T09:00:00+05:30'),
      act('2026-09-24T12:00:00+05:30', 'Operator', 'Responsibility confirmed: Driver F', 'Reason: Assignment F-140 active at violation time.', 'success'),
      act('2026-10-16T08:30:00+05:30', 'Simulated sync', 'Source now reports Paid at source', 'No payment is recorded in this platform. Needs reconciling.', 'warning'),
    ],
  },
  // ---------- Scenario B ----------
  {
    ...base,
    id: 'c-l0377', ref: 'SAMPLE-L-0377', vehicleId: 'v-l1',
    violationAt: '2026-06-14T18:10:00+05:30', timePrecision: 'exact',
    offence: 'Red-light violation', location: 'Harbour Road Junction, Sample City', amount: 1000, dueDate: '2026-11-15',
    sourceStatus: 'unpaid', discoveredAt: '2026-08-10T09:00:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-08-10T09:00:00+05:30')],
  },
  {
    ...base,
    id: 'c-l0391', ref: 'SAMPLE-L-0391', vehicleId: 'v-l2',
    violationAt: '2026-09-03T21:40:00+05:30', timePrecision: 'exact',
    offence: 'Speed limit exceeded', location: 'Expressway km 12, Sample City', amount: 2000, dueDate: '2026-11-01',
    sourceStatus: 'unpaid', discoveredAt: '2026-09-12T09:00:00+05:30',
    responsibility: { status: 'confirmed', partyId: 'p-lg' },
    payment: pay({ payer: 'responsible_party' }),
    activity: [
      discovered('2026-09-12T09:00:00+05:30'),
      act('2026-09-12T11:00:00+05:30', 'Operator', 'Responsibility confirmed: Lessee G', 'Reason: Lease L-140 active at violation time.', 'success'),
      act('2026-09-12T11:05:00+05:30', 'Operator', 'Payer set: responsible party pays directly', 'Lessee G to pay the authority directly. Operator will record the reference.'),
    ],
  },
  {
    ...base,
    id: 'c-l0402', ref: 'SAMPLE-L-0402', vehicleId: 'v-l2',
    violationAt: '2026-08-19T12:30:00+05:30', timePrecision: 'exact',
    offence: 'Parking in a no-parking zone', location: 'Mall Road, Sample City', amount: 500,
    sourceStatus: 'paid', discoveredAt: '2026-08-25T09:00:00+05:30',
    responsibility: { status: 'accepted', partyId: 'p-lg' },
    payment: pay({ payer: 'responsible_party', status: 'paid', method: 'operator_recorded', reference: 'EXT-SAMPLE-7781', paidAt: '2026-09-01T00:00:00+05:30', paidBy: 'Lessee G' }),
    activity: [
      discovered('2026-08-25T09:00:00+05:30'),
      act('2026-08-25T11:00:00+05:30', 'Operator', 'Responsibility confirmed: Lessee G', 'Reason: Lease L-140 active at violation time.', 'success'),
      act('2026-08-27T10:00:00+05:30', 'Operator', 'Party acceptance recorded', 'Lessee G accepted by email (recorded by operator).'),
      act('2026-09-02T09:30:00+05:30', 'Operator', 'External payment recorded (operator-recorded)', 'Paid by Lessee G. Reference EXT-SAMPLE-7781.', 'success'),
    ],
  },
  {
    ...base,
    id: 'c-l0350', ref: 'SAMPLE-L-0350', vehicleId: 'v-l3',
    violationAt: '2026-06-04T16:00:00+05:30', timePrecision: 'exact',
    offence: 'Signal violation', location: 'Station Junction, Sample City', amount: 1000, dueDate: '2026-11-20',
    sourceStatus: 'unpaid', discoveredAt: '2026-10-13T09:00:00+05:30',
    responsibility: { status: 'pending' }, payment: pay(),
    activity: [discovered('2026-10-13T09:00:00+05:30')],
  },
]

export function createSeed(): DemoState {
  return structuredClone({
    version: SEED_VERSION,
    currentAccountId: 'acc-fleet',
    accounts: [
      { id: 'acc-fleet', name: 'Example Freight Co.', kind: 'fleet' as const },
      { id: 'acc-lease', name: 'Example Lease Ltd.', kind: 'leasing' as const },
    ],
    parties,
    vehicles,
    assignments,
    challans,
    sim: { vehicleCheck: 'none_found' as const },
  })
}
