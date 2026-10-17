# Step 1 — Problem framing and users

**Status:** Working draft · AI-assisted · **pending designer review**
**Source:** [`00-brief-original.md`](00-brief-original.md)
**Deadline:** 19 Oct 2026, 6 PM. This is confirmed in the recruiter's email. It is not stated in the brief text.

Labels used throughout:
- **[Brief]**: stated in the brief.
- **[Suggestion]**: my proposal. It is not a requirement.
- **[Hypothesis]**: an unvalidated belief about users. No research has been done.
- **[Assumption]**: a provisional design decision for you to accept or change.

---

## 1. Brief requirements

### 1.1 Explicit requirements [Brief]

| ID | Requirement | Source section |
|---|---|---|
| R1 | Add vehicles **manually** | Requirements |
| R2 | Add vehicles through **Excel/import** | Requirements |
| R3 | **Search** vehicles by registration / owner details | Requirements |
| R4 | **Fetch vehicles registered to an owner through an API** | Requirements |
| R5 | View all challans associated with vehicles | Requirements |
| R6 | Identify the **type/status** of each challan | Requirements |
| R7 | Determine **who is responsible for payment** | Requirements |
| R8 | Track whether a challan is **paid, assigned, disputed, or pending** | Requirements |
| R9 | Handle multiple vehicles, drivers and responsibility scenarios | Requirements |
| R10 | *Eventually* support payment and workflow management | Requirements |
| R11 | Serve **both** fleet and leasing companies | Product Context |
| R12 | Don't start with screens. First work out users, problems, the end-to-end journey, major workflows, edge cases, the information needed for decisions, and the places the workflow can break | The Design Problem |
| R13 | Six mandatory screens: Dashboard, Vehicle listing, Vehicle details, Challan listing, Challan details + responsibility assignment, Payment or resolution state | Part 4 |
| R14 | Screens need not be pixel-perfect, but the experience must "hold together" | Part 4 |
| R15 | A basic reusable design system that the screens are built on. If in Figma: components, variants, auto layout, variables/tokens, reusable styles | Part 5 |
| R16 | A walkthrough (recording or short deck) covering problem, user, journey, solution, UI, edge cases and decisions, with a demo of the prototype | Part 6 |
| R17 | AI is allowed. The designer's own UX thinking, judgement, interaction design and visual design must be visible | AI usage policy |

### 1.2 Missing or ambiguous items

| # | Issue | Why it matters | Proposed handling |
|---|---|---|---|
| A1 | **Parts 1–3 are absent from the supplied text.** The brief goes from "The Design Problem" straight to **Part 4**. | We don't know what Parts 1–3 asked for, so we won't guess or map them onto any section. | Answer every discovery question the brief *does* list explicitly: users, problems, journey, workflows, edge cases, information needed for decisions, and where the workflow can break. Mention the absence in the walkthrough. Ask the recruiter if possible. |
| A2 | **"The platform should help customers:"** is followed by blank text. | A list of goals may be missing. | [Assumption] The Requirements list is the full goal set. Worth asking the recruiter if possible. |
| A3 | **Payment depth.** R10 says "*eventually*", but screen 6 asks for a "payment **or** resolution state". | It's unclear whether a real payment flow is expected. | [Assumption] Design the *state* and the decision leading to it, plus a simulated payment step. No real checkout. |
| A4 | **R8 mixes different dimensions.** "Paid" and "pending" describe payment. "Assigned" describes responsibility. "Disputed" describes a dispute. | One status field can't represent a challan that is both *assigned* and *unpaid*. | Model them as separate dimensions (see §5). |
| A5 | **"Type/status of each challan" (R6)** is undefined. Type could mean offence category, issuing source, or online vs. court-referred. | It affects filters and labels. | [Assumption] Show *offence type* and *source status* as reported by the data source. Don't invent official categories. |
| A6 | **The API in R4** is unnamed. Its inputs (owner name? ID?), consent model, accuracy and latency are unknown. | The onboarding flow depends on what the API returns. | Simulate it, and design for partial, empty, slow and conflicting results. |
| A7 | **Where challan data comes from** is never stated. | Freshness and "last synced" matter for trust. | [Assumption] Challans are synced from an external source. Show the last-synced time. |
| A8 | **Who is legally liable** is not defined, and the brief lists five possible parties. | We must not make legal claims. | The platform records the **company's internal responsibility decision** and its evidence. It is not a legal finding. |
| A9 | **Platform** (web/mobile) and **design tool** are not specified. Figma is mentioned only conditionally. | It sets the scope of the prototype. | [Suggestion] Desktop web. Tool choice is open decision D5. |
| A10 | **Deadline** is not in the brief text. | Deliverable sizing | Resolved: the recruiter's email confirms 19 Oct 2026, 6 PM. That leaves about 2.5 days from 17 Oct. |

---

## 2. Product understanding

### 2.1 What the platform helps a company do
A company with many vehicles receives traffic challans (fines) against those vehicles. The platform lets it:
1. Put all its vehicles in one place.
2. See every challan against them.
3. Work out who was using the vehicle when the violation happened.
4. Decide who should pay.
5. Track each challan until it is paid, passed on, disputed or otherwise closed.

Without this, the work is likely spread across spreadsheets, portals and phone calls **[Hypothesis]**.

### 2.2 How fleet and leasing differ

| | Fleet company | Leasing company |
|---|---|---|
| Who uses the vehicle | The company's **own drivers**, often rotating | A **lessee** (a business or an individual) for a contract period |
| Time unit of responsibility | Shift / trip / daily assignment (short, frequent changes) | Lease contract (long, with start and end dates, extensions, early returns) |
| Typical resolution [Hypothesis] | The company pays, then may recover the amount from the driver internally | The amount is passed on to the lessee, sometimes with an admin fee, or the lessee pays directly |
| Relationship to the responsible party | Internal (employee/contractor) | External (customer), so contracts and customer relations matter |
| Main risk [Hypothesis] | Records too poor to tell which driver had the vehicle | The challan arrives after the lease ended, or the vehicle is back with the company |

### 2.3 Why finding the responsible person is hard [Hypothesis]
- **Discovery may be delayed.** [Scenario assumption] A challan may be discovered some time after the violation, and the vehicle may have changed hands in between. How common or how long such delays are is not known.
- **In our prototype model, challans are linked to a vehicle** (by registration number), not directly to a driver. This is a modelling choice, not a claim about how all challans are issued. Also, the registered owner may not be the person who was driving.
- **Assignment records are incomplete.** Handovers may be informal, unlogged, or kept in a separate system.
- **Violations near a handover are ambiguous.** A violation close to a shift change or lease end is hard to place.
- **Several parties are involved.** Owner, operator, lessee and driver may all be different (§2.2).
- **The same vehicle can be re-registered or transferred.** Its history can get split across records.

### 2.4 Fictional examples
All names, numbers and amounts below are made up.

**Fleet: "Example Freight Co." (fictional)**
Vehicle `XX 00 AA 0001` is driven by Driver A on the day shift and Driver B on the night shift. A speeding challan shows a violation at 19:55 on 2 Oct 2026. In this scenario it is discovered on 9 Oct 2026. The shift record shows the handover at 20:00, but it was entered by hand afterwards, and a depot note suggests B may have taken the vehicle earlier. The operator needs to see the violation time next to the assignment timeline and the evidence before deciding. If the evidence isn't conclusive, they leave it unresolved rather than guess. *Full scenario: Step 2, §2.1.*

**Leasing: "Example Lease Ltd." (fictional)**
Vehicle `XX 00 BB 0002` was leased to Lessee Org C from 1 Jan 2026, planned to end 30 Jun. It was returned early on 15 Jun and leased to Lessee Org D from 20 Jun. A red-light challan for a violation on 14 Jun 2026 is discovered in this scenario on 10 Aug 2026. The current lessee is D, but the violation timestamp falls inside C's lease. Recorded return dates can be wrong, and C is a customer who has already left. *Full scenario: Step 2, §2.2.*

---

## 3. User hypotheses
All of the following are **[Hypothesis]**: no research has been done. Roles are *responsibilities*, not people. One person may hold several in a small company.

### Group A: Primary platform operators (log in daily)

**A1. Challan operations operator**
- **Main task:** Keep the challan queue moving. Review new challans, establish who had the vehicle, assign responsibility and chase resolution.
- **Likely problem [Hypothesis]:** Building the timeline (violation time vs. who had the vehicle) by hand across sources is slow and error-prone.
- **Information needed:** Violation date, time and place. Offence type and amount. Source status and due date if available. Vehicle's assignment/lease history around the violation. Any prior disputes. Evidence (photo/notice) if available.
- **Actions:** Filter and prioritise the queue. Assign or reassign responsibility. Mark as needing confirmation. Raise or record a dispute. Request payment approval. Record what the responsible party said, after contacting them outside the platform. Add notes. Bulk-handle similar challans. *Notifying the party from the platform is an optional future feature, not part of the core flow.*
- **Uncertain permissions:** Can they assign without review? Can they close or write off a challan? Can they edit assignment history after the fact?

**A2. Fleet / asset administrator** (may be the same person as A1)
- **Main task:** Get vehicles, drivers/lessees and assignments into the system and keep them correct.
- **Likely problem [Hypothesis]:** Onboarding hundreds of vehicles is tedious, and imports fail on messy data (duplicates, bad registration numbers).
- **Information needed:** Which vehicles are already tracked. Import errors and duplicates. Ownership details from search/API. Gaps in assignment coverage.
- **Actions:** Add a vehicle manually. Import a file and fix errors. Search by registration/owner. Fetch owner vehicles via the API and choose which to add. Record assignments/leases. Deactivate vehicles.
- **Uncertain permissions:** Who can delete vehicles or edit past assignments? Is API fetching restricted (consent, cost per call)?

### Group B: People who approve or carry out payment

**B1. Payment approver** (e.g. finance or a manager)
- **Main task:** Approve or reject paying a challan, or a batch of challans.
- **Likely problem [Hypothesis]:** They approve without context and can't tell what is recoverable from whom.
- **Information needed:** Amount and due date. The responsibility decision and its basis. Whether a recovery is expected. Batch totals.
- **Actions:** Approve, reject or return with a question. Approve in bulk.
- **Uncertain permissions:** Approval thresholds? Is approval needed at all for small amounts? Does approval need a login, or can it happen by email or link?

**B2. Payment executor**
- **Main task:** Make the payment and record proof.
- **Likely problem [Hypothesis]:** Payments made outside the platform aren't reflected in it, so challans look unpaid when they're not.
- **Information needed:** What is approved. Payment reference. Whether the source has already marked it paid.
- **Actions:** Pay (simulated). Record an external payment with a reference. Mark a recovery as received.
- **Uncertain permissions:** This could be A1, B1, the responsible party, or an external payment channel. Unknown.

### Group C: People involved in responsibility decisions (login not assumed)

**C1. Driver (fleet)**
- **Main task:** Be informed of a challan attributed to them. Possibly confirm or contest it.
- **Likely problem [Hypothesis]:** They learn about it late, sometimes as a pay deduction, with no chance to respond.
- **Information needed:** Violation details and the reason it was attributed to them.
- **Actions:** Acknowledge or contest. Provide context.
- **Uncertain permissions:** [Assumption] **No login.** They are stored as a contact. The operator records any response obtained outside the platform. Notifications and links are optional future features (D1).

**C2. Lessee (leasing)**: a business or an individual customer
- **Main task:** Receive the challan passed on to them. Pay it or contest it.
- **Likely problem [Hypothesis]:** They dispute charges they don't recognise, especially after the lease has ended.
- **Information needed:** Violation details. Proof the violation falls within their lease period. Amount, plus any fee.
- **Actions:** Accept, pay directly or contest.
- **Uncertain permissions:** [Assumption] **No login** in the prototype. They're represented as a contact. A lessee portal and notifications are out of scope (optional future features).

**C3. Registered vehicle owner** (when not the platform customer, e.g. an owner-operator vehicle in a fleet)
- **Main task:** Usually none in the platform. Recorded as a party.
- **Information needed / actions:** Contact details only. Responsibility may be assigned to them.
- **Uncertain permissions:** No login.

---

## 4. Jobs to be done
1. **When** I get a batch of new vehicles to track, **I want to** bring them in by import, search or API without creating duplicates, **so that** every challan can be matched to a vehicle I manage.
2. **When** a new challan arrives, **I want to** see who had the vehicle at the exact violation time, **so that** I can assign responsibility with evidence instead of guessing.
3. **When** responsibility is unclear or contested, **I want to** record a dispute and its outcome separately from payment, **so that** the challan isn't wrongly paid, chased or dropped.
4. **When** challans are due, **I want to** see what is unpaid, overdue or awaiting approval across all vehicles, **so that** I can prevent penalties from escalating **[Hypothesis: escalation timelines not verified]**.
5. **When** a challan is resolved, **I want** a clear record of who paid, who it was recovered from, and why, **so that** finance and customers can trust the outcome.

---

## 5. Initial product model

### 5.1 Entities and relationships

```
Vehicle 1───* Assignment / Lease *───1 Party (Driver | Lessee | Owner)
   │                │  (valid_from → valid_to)
   │                │
   1                │ matched by violation timestamp
   │                ▼
   *──────── Challan (violation_at, offence, amount, source_status)
                    │
                    ├──1 Responsibility decision (current) ──* history
                    │        (party, basis, decided_by, decided_at)
                    ├──0..1 Dispute (raised_by, reason, outcome)
                    └──* Payment / Resolution records
                             (who paid, amount, ref, recovery)
```

- **Vehicle:** identified by registration number. It has a registered owner, which may differ from the platform customer.
- **Party:** a driver, lessee or owner. Holds contact details only. It doesn't have to be a platform user.
- **Assignment / Lease:** a **time-bounded** link between one vehicle and one party. Fleet = driver assignment (short, frequent). Leasing = lease contract (long). The structure is the same with different labels **[Assumption]**.
- **Challan:** in our prototype model, each challan is linked to one vehicle. Its key fact is **`violation_at`**, the time of the violation. That is not when it was issued, received or synced.
- **Responsibility decision:** the company's choice of who bears the challan. It records the **basis** (e.g. "matched to Lease #12 covering violation time", "manual override: driver confirmed"), who decided, and when. Decisions are versioned, because reassignments happen.
- **Payment / Resolution record:** what actually happened to the money. Examples: company paid, party paid directly, company paid then recovered from party, waived/cancelled by the authority, written off internally.

### 5.2 Why the current driver/lessee ≠ the responsible party
The vehicle's *current* assignment answers "who has it **now**". Responsibility depends on who had it **at `violation_at`**. When discovery is delayed (a scenario assumption, §2.3), the two can differ. The system should therefore:
- match a challan to the assignment covering `violation_at`, never to the current holder;
- flag **no match** (a gap in records), **multiple matches** (overlapping or handover-boundary records), and **ended assignments** (lease closed or driver left);
- suggest a party, but have a person confirm. It should never silently auto-assign **[Assumption]**.

### 5.3 Separate status dimensions [Assumption: not official classifications]

> **Superseded by Step 2 §5**, which refines these dimensions and their transitions. This table is kept for history.
Each challan carries these **independently**:

| Dimension | Proposed values | Owner of the truth |
|---|---|---|
| **Source status** | As reported by the data source (e.g. unpaid / paid). The exact values come from the source, and we don't invent legal states. | External source |
| **Responsibility** | Unassigned → Suggested → Assigned → Acknowledged · *Needs confirmation* | Company (operator) |
| **Dispute** | None · Raised (internal by party / with authority) · Under review · Resolved (upheld / rejected) | Company + party |
| **Payment / resolution** | Unpaid · Awaiting approval · Approved · Paid · Recovery pending · Recovered · Closed without payment (waived / written off) | Company (finance) |

The brief's four words map onto these dimensions: *paid* and *pending* → payment; *assigned* → responsibility; *disputed* → dispute. In the UI, a list row can show a combined "next action" label derived from all four, e.g. "Needs assignment", "Awaiting approval" or "Disputed". [Suggestion]

---

## 6. Scope proposal (desktop web prototype)

### 6.1 Must demonstrate
| Item | Covers |
|---|---|
| Onboarding: **manual add**, **Excel import** (including an error/duplicate review step), **search by registration/owner**, **fetch owner vehicles via API** (choose which results to add) | R1–R4 |
| **Dashboard:** what needs attention (unassigned, disputed, awaiting approval, due soon), with fleet and leasing views both possible | R13 |
| **Vehicle listing + details:** challans per vehicle, plus the assignment/lease **timeline** | R5, R9, R13 |
| **Challan listing:** filters on the four status dimensions and offence type | R5, R6, R8, R13 |
| **Challan details + responsibility assignment:** the violation time placed on the assignment timeline, the suggested party, confirm or override with a reason, history | R7, R9, R13 |
| **Dispute:** raise/record a dispute and its outcome | R8 |
| **Payment or resolution state:** approval, simulated payment, recovery, close without payment | R10, R13 |
| **Two hero scenarios:** one fleet (shift handover), one leasing (challan after lease ended) | R11 |
| **Key edge-case states:** no matching assignment, overlapping assignments, API empty/partial, import errors | R12 |
| **Design system:** tokens, components and variants that the screens are built from | R15 |

### 6.2 Sample data / simulated integrations (clearly labelled in the prototype)
- Owner-vehicle API results, including slow, empty and partial responses.
- Challan sync from the external source, with a "last synced" time.
- Payment execution and the payment reference.
- All vehicles, people and challans are fictional sample data.

### 6.3 Outside the proposed prototype
- A real payment gateway, real government or third-party APIs, and authentication.
- Driver/lessee portals or a mobile app (C-roles appear only as contacts).
- Notifications or external links to drivers, lessees or approvers. These are optional future features, and the core workflow doesn't depend on them.
- Legal/court workflows and any legal determination of liability.
- Roles and permissions administration, billing, and multi-company admin.
- Reporting/analytics beyond the dashboard.
- Mobile and responsive layouts (desktop only).

---

## 7. Open decisions (all recommendations **provisional**)

**D1. Do drivers/lessees get a login?**
- *Tradeoff:* Self-service confirmation and disputes reduce operator effort and feel fairer. But they add a whole second product, plus onboarding, for people who rarely use it.
- *Recommend:* No login. Drivers and lessees are contacts. The operator records any response obtained outside the platform. Notifications and links are optional future features, not dependencies.
- *Status:* Adopted as a **proposed working assumption** by the designer (17 Oct). Final review pending.

**D2. One shared model or separate fleet and leasing products?**
- *Tradeoff:* Separate flows fit each customer more closely, but double the screens. A shared model scales better but risks generic wording.
- *Recommend:* One model, using a time-bounded assignment for both. Fleet vs. leasing changes the **labels and defaults** ("Driver/shift" vs. "Lessee/contract"), not the screens. Demonstrate both through the two hero scenarios.
- *Status:* Adopted as a **proposed working assumption** by the designer (17 Oct). Final review pending.

**D3. How automatic is responsibility assignment?**
- *Tradeoff:* Auto-assigning is fast, but a wrong match quietly blames the wrong person. Fully manual is safe but slow at volume.
- *Recommend:* The system **suggests** a party based on the time match, and a person **confirms**. Clear matches can be confirmed in bulk. Ambiguous ones (no match, overlap, near a handover) are flagged and never auto-suggested as certain.
- *Status:* Adopted as a **proposed working assumption** by the designer (17 Oct). Final review pending. The designer added that missing, overlapping or uncertain records require manual review.

**D4. Who pays first?**
- *Tradeoff:* If the company pays first and recovers later, penalties are less likely to grow, but the company carries recovery risk. If the responsible party pays directly, the company carries no cost, but it has less control over timing.
- *Recommend:* Support both as **resolution paths** on the same payment/resolution dimension. Default to "company pays → recover" for fleet and "pass on to lessee" for leasing. These are configurable defaults, not rules.
- *Status:* The designer added a working assumption: **payment execution** (who moves the money, and when) and **allocation of payment responsibility** (who should bear the cost) are separate concepts. See Step 2 §5. The defaults above remain open.

**D5. Prototype medium**
- *Tradeoff:* Figma maps directly to the Part 5 checklist (components, variants, auto layout, variables) and is faster for visual iteration. A coded prototype shows real interactions and data states but costs time, with about 2.5 days left.
- *Recommend:* **Figma** for the design system and all six screens, with a clickable prototype for the two hero scenarios. Confirm this against your own strengths.

---

*Next step (not started): journeys, workflows, edge cases and breakpoints, after you've reviewed this document.*
