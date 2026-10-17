# Step 2: Journeys, workflows and edge cases

**Status:** Working draft · AI-assisted · **pending designer review**
**Builds on:** [`01-problem-and-users.md`](01-problem-and-users.md) · [`00-brief-original.md`](00-brief-original.md)
**Covers the brief's discovery questions:** journey from start to finish (§1), major workflows (§3–§5), edge cases (§6), what a company needs to know to decide (the "Information needed" rows in §1, plus §4), and where the workflow can break (the "What can go wrong" rows in §1, plus §6).

### Working assumptions (designer-supplied 17 Oct, pending final review)
- **WA1.** Desktop web platform, with one underlying model shared by fleet and leasing.
- **WA2.** The system suggests a responsible party using the assignment active at the violation timestamp. An operator reviews and confirms it.
- **WA3.** Missing, overlapping or uncertain records require manual review.
- **WA4.** Drivers and lessees are contacts. There is no separate portal in this prototype.
- **WA5.** Payment execution and allocation of payment responsibility are separate concepts.
- **WA6.** Integrations and payment outcomes use clearly labelled simulated data.
- **WA7.** No invented research, no legal conclusions and no automatic liability decisions.

**Wording rule used throughout:** a "responsibility decision" is the **company's internal attribution**, based on its own records. Assignment timing is *evidence*. It does not prove legal liability.

---

## 1. Primary end-to-end journey

**Onboard vehicle → Discover challans → Review → Decide responsibility → Pay or resolve → Updated record**

### Stage 1: Vehicle onboarding
| | |
|---|---|
| **Actor & goal** | Fleet/asset admin (A2). Get vehicles and their assignments/leases into the platform. |
| **Information needed** | Registration number, any owner details, whether the vehicle already exists, and the assignment/lease periods. |
| **Action → feedback** | Add the vehicle by one of four methods (§3). Every method passes through a **review-before-add** step, which shows the valid, invalid and duplicate counts. On confirm, the vehicles are created, and each shows a **challan check** state of *Not checked yet*. |
| **What can go wrong** | Invalid rows, duplicates, no or partial API results, a failed fetch, or a vehicle added without any assignment history. |
| **Recovery / next** | Fix or skip rows, then retry the fetch. A vehicle with no assignments is flagged "No assignment records", because its challans will go to manual review. |

### Stage 2: Challan discovery
| | |
|---|---|
| **Actor & goal** | System (simulated sync). Find the challans linked to each vehicle. |
| **Information needed** | Per vehicle: **check result** and **last checked time**. Per challan: reference, `violation_at`, offence, amount, location and **source status**. |
| **Action → feedback** | The sync runs. Each vehicle ends in one of four states: *Checked: N challans*, *Checked: no challans found*, *Check incomplete* or *Check failed*. New challans appear on the dashboard as "New". |
| **What can go wrong** | A failed or incomplete check is mistaken for "no challans". A challan duplicates an existing one. A challan is missing its time of day. |
| **Recovery / next** | Failed or incomplete checks are listed on the dashboard with **Retry**, and are never shown as zero. A suspected duplicate gets a "possible duplicate" flag for manual review [future]. A missing time goes to manual review (§4.1). |

### Stage 3: Review / triage
| | |
|---|---|
| **Actor & goal** | Challan operator (A1). Decide what to handle first. |
| **Information needed** | A **next-action** label (§5.7), the due date if the source provides one, amount, vehicle and the customer type label. |
| **Action → feedback** | Filter the challan list. Open challans that need review. Bulk-confirm clear suggestions after checking a summary. |
| **What can go wrong** | Ambiguous cases get bulk-confirmed. Urgent items get buried. |
| **Recovery / next** | Bulk confirm only covers challans in **Suggested** state. Needs-review items are excluded and their count is shown. |

### Stage 4: Responsibility decision
| | |
|---|---|
| **Actor & goal** | Challan operator (A1). Attribute the challan to a party, with recorded reasons. |
| **Information needed** | `violation_at` on the vehicle's assignment timeline, the suggested party and why, evidence, nearby handovers, the party's contact details, and prior decisions. |
| **Action → feedback** | **Confirm**, **Choose another party** (reason required) or **Leave unresolved** (reason required). Each action writes an audit entry. Responsibility becomes *Confirmed*. |
| **What can go wrong** | No match, an overlap, an uncertain timestamp, or the party contests the decision later. |
| **Recovery / next** | See §4. A contest reopens review, and the earlier decision stays in the history. |

### Stage 5: Payment or resolution
| | |
|---|---|
| **Actor & goal** | Approver (B1) and executor (B2). Settle the challan with the authority. Operator (A1): recover the cost if another party bears it. |
| **Information needed** | Amount, due date, responsibility state, who will pay (company or party directly), approval status and payment reference. |
| **Action → feedback** | Request approval → Approve → Pay (simulated) → *Paid*, *Failed* or *Outcome unknown*. Alternatively, **record a payment made outside the platform**, with a reference. If the company paid and another party bears the cost, **recovery** starts. |
| **What can go wrong** | Payment fails. The outcome is unknown (timeout). The source still shows unpaid after our payment. A dispute opens after payment. |
| **Recovery / next** | Failed → retry is allowed. Unknown → **Check status** must run before any retry (§5.4). A source mismatch shows a *Reconcile* flag, and nothing changes automatically. |

### Stage 6: Updated record
| | |
|---|---|
| **Actor & goal** | Operator (A1). Close the case with a clear outcome. |
| **Information needed** | Every dimension is final (no open dispute, payment settled, recovery not pending), plus the full audit trail. |
| **Action → feedback** | **Close case**, with an outcome such as *Settled by company*, *Settled and recovered*, *Paid directly by party*, *Absorbed by company* or *Cancelled at source*. The vehicle record and the dashboard update. |
| **What can go wrong** | Closing while something is still open. New information arrives after closure. |
| **Recovery / next** | Close is blocked until its guard conditions are met, and the blocking reason is shown. **Reopen** with a reason is allowed and audited. |

---

## 2. Fictional scenarios
All companies, people, registration numbers, references, dates and amounts below are **fictional sample data**. The "₹" amounts are illustrative.

### 2.1 Fleet: violation near a driver handover

| Item | Sample data |
|---|---|
| Customer | Example Freight Co. (fleet) |
| Vehicle | `XX 00 AA 0001`, light goods vehicle |
| Contacts | Driver A, Driver B (no logins) |
| Assignment F-201 | Driver A · 2 Oct 2026 08:00 → 20:00 |
| Assignment F-202 | Driver B · 2 Oct 2026 20:00 → 3 Oct 08:00 |
| Record note | Both assignments were **entered by hand on 2 Oct at 21:15**. Handover note: "Keys handed to B around 19:45." |
| Challan | `SAMPLE-F-0142` · Speeding · **2 Oct 2026 19:55** · Ring Road (sample) · ₹2,000 · Source: *Unpaid at source* |
| Discovered | 9 Oct 2026 (scenario assumption) |

**Flow**
1. The sync finds `SAMPLE-F-0142`. The violation is **5 minutes before** the recorded 20:00 handover. That is inside the *near-handover window* (proposed: 30 min, configurable; DL-07).
2. The system **does not suggest a single party.** Responsibility → *Needs review*, with the reason "Near handover · record entered after the fact". It shows both candidates: A, according to the assignment record, and B, according to the handover note.
3. The operator compares the evidence: the violation time on the timeline, the record entry time (21:15) and the handover note. They contact both drivers outside the platform. Driver B states they took the vehicle at about 19:45. The operator records that statement as a note.
4. The operator chooses **Driver B**. Because this differs from the assignment record, a **reason is required**: "Handover note and Driver B's statement indicate B had the vehicle from ~19:45." Responsibility → *Confirmed (Driver B)*. An audit entry is written.
5. Payment: the company pays and recovers internally (fleet default, DL-05). The approver approves ₹2,000. The simulated payment returns **Outcome unknown** (timeout). *Retry* is disabled, and the operator runs **Check status** → *Paid* (ref `SIM-PAY-0091`).
6. Recovery from Driver B → *Pending*. The recovery is handled outside the platform (e.g. payroll) and then recorded → *Recovered*.
7. **Close case** with the outcome *Settled and recovered*.

**What this demonstrates:** an uncertain case is not auto-suggested. An override needs a reason. An unknown payment outcome is checked before any retry. Execution (company paid) is shown separately from allocation (Driver B bears the cost).

### 2.2 Leasing: challan discovered after the lease ended

| Item | Sample data |
|---|---|
| Customer | Example Lease Ltd. (leasing) |
| Vehicle | `XX 00 BB 0002`, sedan |
| Contacts | Lessee Org C (past lessee), Lessee Org D (current lessee) |
| Lease L-101 | Lessee Org C · 1 Jan 2026 → planned 30 Jun 2026 · **returned early, ended 15 Jun 2026 10:00** |
| Lease L-102 | Lessee Org D · 20 Jun 2026 → ongoing |
| Challan | `SAMPLE-L-0377` · Red-light violation · **14 Jun 2026 18:10** · ₹1,000 · Source: *Unpaid at source* |
| Discovered | 10 Aug 2026 (scenario assumption) |

**Flow**
1. The sync finds `SAMPLE-L-0377`. The **current lessee is D**, but `violation_at` falls inside **L-101 (C)**, which has since ended. It is about 16 hours before the recorded return, outside the near-handover window.
2. The system **suggests Lessee Org C**, with this evidence: "Lease L-101 active at violation time · lease ended 15 Jun 10:00 · current holder differs (Lessee Org D)." The *ended lease* and *current holder differs* flags are shown clearly, so the operator doesn't attribute the challan to D by mistake.
3. The operator **confirms C**, using the default reason "Lease active at violation time." Responsibility → *Confirmed (Lessee Org C)*.
4. Payment: the company pays the authority and passes the cost on (DL-05). It is approved, then *Paid* (ref `SIM-PAY-0107`). Recovery from C → *Pending*.
5. **C contests**, saying the vehicle was returned to a branch on 13 Jun and the return was only entered on 15 Jun. The operator records the contest. Dispute → *Open*. Responsibility → *Needs review*, with the earlier decision kept in the history. **Recovery is paused.** Payment stays *Paid*, because the money already went to the authority. Only the allocation is in question.
6. The operator checks the company's own return records. Two outcomes are possible:
   - **(Prototype path) Contest not upheld.** The branch inspection record is dated 15 Jun 10:00. The operator re-confirms C, with the reason and evidence noted. Dispute → *Resolved: not upheld*. Recovery resumes → *Recovered* (recorded) → close as *Settled and recovered*.
   - **(Documented alternative) Contest upheld.** The records support a 13 Jun return. The operator chooses **Example Lease Ltd. (company)**, with the reason noted. Dispute → *Resolved: upheld*. Recovery → *Not applicable* → close as *Absorbed by company*.

**What this demonstrates:** the timestamp-based match beats the "current holder" shortcut. A responsibility dispute reopens review without undoing a completed payment. The outcome is a recorded internal decision, not a legal finding.

---

## 3. Onboarding branches

```
 Manual entry ─┐
 Excel import ─┤                              ┌─> Vehicle created ─> Challan check ─> core flow (§1, Stage 2)
 Lookup (reg/  ├─> Review-before-add (staging)┤      (source tag:    (per vehicle)
   owner)     ─┤    validate · dedupe · pick  └─> Skipped / fix later  manual/import/
 Owner API    ─┘                                                       lookup/API)
```

> **Unresolved requirement (R3):** "Search vehicles using their registration/owner details" could mean (a) searching vehicles *already in the platform*, or (b) an external lookup that *adds* a vehicle. This document covers both: (a) as search on the vehicle listing, and (b) as the lookup branch. Whether (b) exists, and what the R4 API actually returns (vehicles only, or challans as well), changes onboarding. Pending clarification.

**Shared rules for all four branches:**
- Registration numbers are **normalised** before matching, ignoring case, spaces and hyphens [Assumption].
- **Duplicates** are checked against the batch itself *and* against vehicles already in the platform.
- Every created vehicle records its **source** (manual, import, lookup or API) and when it was added.
- Assignment/lease periods can be added during review or later. A vehicle without any is flagged.

| Branch | Normal path | Invalid input | Duplicates | No results | Partial results | Failed fetch |
|---|---|---|---|---|---|---|
| **Manual entry** | Form → review → add | Inline field errors; registration format check (format rules TBD) | "Already in your vehicles", with a link to open it; no second record created | n/a | n/a | n/a |
| **Excel import** | Upload → map columns → review (valid / invalid / duplicate counts) → add valid rows | Invalid rows are listed with the reason per row; options: fix inline, skip, or download the error rows | Shown separately as *in file* or *already exists*; default: skip | Empty file or no usable rows → clear message, nothing created | n/a (file-based) | Unreadable file → error, plus the template to download |
| **Lookup by registration/owner** | Enter details → result → review → add | Validation message | The result is marked "Already added" | "No vehicle found for these details": check the input, or add manually | n/a | "Lookup unavailable" → retry, or add manually (simulated) |
| **Owner API discovery** | Enter owner identifier → list of vehicles → select → review → add | Validation message | Each result row is marked "Already added" | **"Owner found, 0 vehicles"** is a distinct state from *Owner not found* | **"Showing 12 of an expected 18 · results incomplete"** → add the ones shown and retry for the rest | "Fetch failed: nothing was added" → retry. Nothing is assumed (simulated) |

### Challan-check result per vehicle (after onboarding)
| State | Meaning | Shown as | Allowed action |
|---|---|---|---|
| Not checked yet | No check has run | Neutral | Check now |
| **Checked: no challans found** | The check **succeeded** and found zero, *as of* the shown time | "No challans found as of 9 Oct, 10:30" | None; re-check later |
| Checked: N challans | The check succeeded | Count, plus a link | Open challans |
| **Check incomplete** | Some data came back, and the rest is unknown | Warning: "Results may be incomplete" | Retry |
| **Check failed** | No usable response | Error: "Couldn't check. Challan count unknown" | Retry |

**Rule:** a failed or incomplete check is **never** shown as "0 challans". Dashboard totals mark affected vehicles as "excluded / unknown".

---

## 4. Responsibility workflow

### 4.1 Suggestion logic [Assumption]
For each challan, the system finds the vehicle's assignments covering `violation_at`:

| Match result | System outcome | Shown to operator |
|---|---|---|
| Exactly one, and not near a boundary | **Suggested:** that party | The party, the assignment/lease reference, and the timeline with `violation_at` marked |
| Exactly one, but within the near-handover window | **Needs review** | Both adjacent candidates, the gap in minutes, and when the record was entered |
| **None** (gap in records) | **Needs review** | "No assignment covers this time", plus the nearest assignments before and after |
| **More than one** (overlap) | **Needs review** | All overlapping assignments, with their sources |
| **Uncertain timestamp** (date only, no time; or a time-zone question) | **Needs review** | "Violation time incomplete: date only", plus every assignment active that day |
| Vehicle has no assignment records | **Needs review** | "No assignment records for this vehicle", with a shortcut to add one |

Evidence shown with every suggestion: `violation_at` (source value as given), the matching record and its **source and entry time**, adjacent records, attached notes or files, the current holder (when different) and earlier decisions.

### 4.2 Operator actions
| Action | Available when | Required input | Result |
|---|---|---|---|
| **Confirm suggestion** | Suggested | None (a default reason is recorded) | Confirmed (party) |
| **Choose another party** | Suggested / Needs review / Confirmed | Party + **reason**; optional evidence | Confirmed (new party). The previous decision is kept in history |
| **Leave unresolved** | Suggested / Needs review | **Reason** (e.g. "awaiting depot log") | Needs review, with the note |
| **Record party acceptance** | Confirmed | Optional note ("Lessee accepted by email, 12 Aug") | Accepted |
| **Record contest** | Confirmed / Accepted | Who contests, the reason, optional evidence | Dispute: Open. Responsibility: Needs review |
| **Reopen decision** | Confirmed / Accepted | **Reason** | Needs review |

The party list includes the company itself (e.g. "Example Lease Ltd. (company)"), so absorbing the cost is an explicit, recorded decision.

### 4.3 Audit record
Every change writes an **immutable** entry with: timestamp, actor (or "System"), previous state → new state, party, reason, and the evidence referenced. Shown as a history list on the challan.

### 4.4 Distinctions that must be visible
- **Suggested ≠ Confirmed.** The system proposed it, but no person has decided.
- **Confirmed ≠ Accepted.** The company decided, but the party hasn't agreed (or no agreement has been recorded).
- **Confirmed/Accepted ≠ Paid.** Responsibility is about *who bears the cost*. Payment is about *whether the authority has been paid*, and by whom.

### 4.5 Disputed responsibility: route back to review
`Confirmed/Accepted → (contest recorded) → Dispute: Open + Responsibility: Needs review → operator reviews evidence →`
- re-confirms the same party → *Dispute: Resolved: not upheld*
- chooses another party → *Dispute: Resolved: upheld*

While a dispute is open, **recovery** from the contested party is paused. **Payment to the authority stays allowed** (see DL-06), because execution is separate from allocation.

*Out of scope:* contesting the challan itself with the issuing authority. It can be noted as free text, but there is no workflow for it [documented future].

---

## 5. Status model
**Five independent dimensions** plus one guarded **case closure**. These are design assumptions, not official classifications.

### 5.1 Source status (external, read-only)
| | |
|---|---|
| Meaning | What the external source reports for this challan, as of the last sync |
| Values | *Unpaid at source* · *Paid at source* · *Not found at source* · *Unknown (sync failed)*. The exact values depend on the real source. |
| Changed by | System sync only. Never edited by users |
| Note | Always shown with **last synced** time. A mismatch with internal status raises a **Reconcile** flag and doesn't change anything automatically |

### 5.2 Responsibility (allocation: who bears the cost)
| From → To | Who |
|---|---|
| — → Suggested / Needs review | System (§4.1) |
| Suggested → Confirmed | Operator |
| Suggested / Needs review → Confirmed (other party) | Operator, with reason |
| Suggested → Needs review (leave unresolved) | Operator, with reason |
| Confirmed → Accepted | Operator (records the party's response) |
| Confirmed / Accepted → Needs review | Operator: contest recorded, or reopen with reason |

### 5.3 Dispute (responsibility contest)
| From → To | Who |
|---|---|
| None → Open | Operator records a contest |
| Open → Resolved: upheld / Resolved: not upheld | Operator, set automatically by the new responsibility decision (§4.5) |
| Open → Withdrawn | Operator, with note |

### 5.4 Payment execution (settling with the authority)
| From → To | Who | Guard |
|---|---|---|
| Not started → Awaiting approval | Operator | Amount and payer set |
| Awaiting approval → Approved / Not started (rejected) | Approver | Rejection needs a reason |
| Approved → Processing | Executor (simulated pay) | — |
| Processing → **Paid** | System, on confirmed success | Reference stored |
| Processing → **Failed** | System | Reason shown. **Never shown as paid** |
| Processing → **Outcome unknown** | System (timeout or no response) | **Retry disabled** |
| Outcome unknown → Paid / Failed | Executor runs **Check status** | Must run before any retry |
| Failed → Processing (retry) | Executor | Approval still valid |
| Not started / Approved → **Paid (recorded externally)** | Executor | Reference **and** payer required |

*Payer* (company, or the responsible party directly) is an attribute of payment, separate from responsibility.

### 5.5 Cost recovery (only when the payer ≠ the party bearing the cost)
| From → To | Who | Guard |
|---|---|---|
| Not applicable → Pending | System | Payment *Paid* by company **and** Responsibility Confirmed/Accepted to a non-company party |
| Pending → Paused | System | A dispute opens |
| Paused → Pending / Not applicable | System | The dispute resolves (same party / company or other) |
| Pending → Recovered | Operator records it (outside the platform) | Reference or note |
| Pending → Written off | Operator, with reason | Approval rules TBD |

### 5.6 Case closure (guarded record, not a free status)
- **Close** is allowed only when **all** of these hold:
  - no open dispute;
  - payment is *Paid / Paid (recorded)*, **or** the source shows *Paid at source* (reconciled) or *Not found at source*, after operator confirmation;
  - recovery is not *Pending* or *Paused*;
  - responsibility is Confirmed/Accepted, or the outcome is *Cancelled at source*.
- **Outcomes:** Settled by company · Settled and recovered · Paid directly by party · Absorbed by company · Cancelled at source · Written off.
- **Reopen** is allowed with a reason (audited).

### 5.7 Consistency rules (no contradictions)
1. Only a confirmed success or a recorded reference makes payment *Paid*. A *Failed* or *Outcome unknown* payment is never displayed as paid in any list or count.
2. *Outcome unknown* blocks retry until a status check is done, which prevents double payment.
3. Recovery can't start while responsibility is Suggested/Needs review or a dispute is open.
4. Opening a dispute never changes payment. It only pauses recovery.
5. Internal status never overwrites source status, and source status never auto-changes internal status. Mismatches create *Reconcile*.
6. Bulk actions only apply to items whose current state allows them. Ineligible items are listed.

**Derived "Next action" label** (for lists and the dashboard, computed and not stored; in the prototype the first two read *Review responsibility* and *Review suggestion*, because they open a review rather than save): *Needs review* › *Confirm suggestion* › *Dispute open* › *Awaiting approval* › *Check payment status* › *Payment failed* › *Reconcile* › *Recovery pending* › *Ready to close* › *Closed*.

---

## 6. Edge cases (prioritised by impact on this prototype)
**Coverage key:** **P** = implemented prototype state · **F** = documented future behaviour only.

| # | Edge case / trigger | Risk | Information shown | Available action | Recovery | Cov. |
|---|---|---|---|---|---|---|
| 1 | Violation **near a handover** (S1) | Wrong driver charged | Both candidates, gap in minutes, record entry time, notes | Choose party (reason) · Leave unresolved | Reopen later with new evidence | **P** |
| 2 | Challan found **after lease ended**; current holder differs (S2) | Charging the current lessee | Lease active at the violation, ended flag, current-holder flag | Confirm suggested · Choose another | Contest → review | **P** |
| 3 | **Responsibility contested** after confirmation (S2) | Recovery from the wrong party; record lost | Previous decision, contest reason, evidence | Re-confirm / choose another (reason) | Dispute resolves; recovery resumes or is cancelled | **P** |
| 4 | **Payment outcome unknown** (timeout) (S1) | Double payment | "Outcome unknown", last attempt time | Check status (retry disabled) | Becomes Paid or Failed | **P** |
| 5 | **Payment failed** | Shown as paid when not | Failure reason, approval still valid | Retry · Record external payment | Retry → Paid | **P** |
| 6 | **Challan check failed / incomplete** vs zero challans | False "all clear" | Distinct states with last-checked time | Retry | Successful check | **P** |
| 7 | **No matching assignment** (gap) | Arbitrary attribution | Nearest assignments before/after | Choose party (incl. company) · Add assignment · Leave unresolved | Re-run the suggestion after adding records | **P** |
| 8 | **Overlapping assignments** | Two parties both plausible | All overlapping records and their sources | Choose party (reason) | Fix records [F] | **P** |
| 9 | **Uncertain timestamp** (date only) | False precision | "Date only", all assignments that day | Choose party (reason) · Leave unresolved | Updated source data re-runs the match [F] | **P** |
| 10 | **Import: invalid rows and duplicates** | Bad or duplicate vehicles | Per-row reasons; *in file* vs *already exists* | Fix inline · Skip · Download errors | Re-import fixed rows | **P** |
| 11 | **Owner API: partial / empty / failed** | Fleet only partly onboarded | "12 of 18", "Owner found, 0 vehicles", "Fetch failed" | Add shown · Retry | Retry → complete | **P** (simulated) |
| 12 | **Source says paid, internal says unpaid** (e.g. the party paid directly) | Paying twice; untracked settlement | Reconcile flag, both values | Record external payment (payer = party) · Mark reconciled | Closure as *Paid directly by party* | **P** (flag + action) |

**Documented future behaviour (F, not in the prototype):** the amount changes at the source after approval (re-approval needed) · the challan is withdrawn or not found at source after payment (refund handling) · reassignment after recovery has completed (refund to party) · a vehicle is re-registered or transferred mid-history · duplicate challan records · contesting the challan with the authority · notifications or links to drivers/lessees (optional, never a dependency) · approval thresholds and role permissions.

---

## 7. Screen coverage
Six screens. Supporting UI is drawers, dialogs and states only.

| # | Screen | Journey stages | Must show | Drawers / dialogs | Key states |
|---|---|---|---|---|---|
| 1 | **Dashboard** | 2, 3, 6 | Attention counts by next action (Needs review, Confirm suggestions, Disputes, Awaiting approval, Check payment status / Failed, Reconcile, Recovery pending); challan-check health (failed/incomplete); last sync | — | Empty (no vehicles → "Add vehicles"); checks failing; all clear *with* last-checked time |
| 2 | **Vehicle listing** | 1, 2 | Search (registration/owner), customer-type labels, current holder, challan count **or** check state, "No assignment records" flag | **Add vehicles** drawer (manual · import · lookup · owner API); **Import review** dialog (valid/invalid/duplicate); **API results** dialog (select, partial/empty/failed) | Empty; duplicates; partial/failed fetch; check failed ≠ 0 |
| 3 | **Vehicle details** | 1, 2, 4 | Profile, source tag, **assignment/lease timeline** with challan markers, challans on this vehicle, check status | **Add/edit assignment** drawer | No assignments; gap/overlap highlighted; check failed |
| 4 | **Challan listing** | 3 | Filters by each status dimension + offence type; next-action column; source status + last synced | **Bulk confirm** dialog (eligible vs excluded) | Empty filter result; reconcile flag; unknown-payment rows |
| 5 | **Challan details & responsibility** | 4 | Violation details, source status, `violation_at` on the timeline, suggested party + evidence, decision panel, **audit history** | **Choose another party** dialog (reason); **Leave unresolved** dialog; **Record contest** dialog; **Record acceptance** dialog | Suggested; Needs review (near handover / no match / overlap / date only); Confirmed; Accepted; Dispute open |
| 6 | **Payment or resolution** | 5, 6 | Payment panel (payer, approval, attempts, reference), recovery panel, closure panel with guard reasons | **Approve/reject** dialog; **Pay (simulated)** dialog; **Record external payment** dialog; **Record recovery** dialog; **Close case** dialog | Awaiting approval; Processing; Paid; **Failed**; **Outcome unknown**; Recovery paused; Close blocked (with reason); Closed |

*Proposal:* Screen 6 is a **dedicated view of the same challan** (e.g. a "Payment & resolution" step reached from screen 5), not a separate payments module (DL-10).

---

## 8. Decision log
**Status key:** *WA* = designer-supplied working assumption, pending final review · *Proposed* = AI-proposed, pending designer review. **Nothing here is approved yet.**

| ID | Decision | Alternatives considered | Reason | Status |
|---|---|---|---|---|
| DL-01 | Desktop web; one shared model for fleet and leasing; labels differ | Separate products/flows; responsive/mobile | Keeps it to six screens; the brief's scenarios differ in data, not in structure | WA |
| DL-02 | The system suggests from the assignment active at `violation_at`; an operator confirms | Auto-assign; fully manual | Speed without silent attribution; matches WA7 | WA |
| DL-03 | Missing / overlapping / uncertain / near-handover → Needs review, with no single suggestion | Suggest the "best guess" | Avoids false confidence on exactly the cases most likely to be wrong | WA (+ near-handover: Proposed) |
| DL-04 | Drivers/lessees are contacts; responses recorded by the operator; no notifications in the core flow | Portal; notification links | Keeps the scope to one product; notifications are optional future features | WA |
| DL-05 | Payment execution (payer) and responsibility (who bears the cost) are separate; defaults: fleet = company pays → recover; leasing = company pays → pass on, or the party pays directly | Single "paid by responsible party" status | Lets the company pay on time while allocation is still open or disputed | WA (defaults: Proposed) |
| DL-06 | Payment to the authority is **allowed before responsibility is final** (with a visible warning); recovery waits | Block payment until confirmed | Avoids escalation risk while attribution is being worked out [Hypothesis] | Proposed |
| DL-07 | Near-handover window = **30 min**, configurable | No window; 60 min; per-customer only | Placeholder to make the edge case visible; the value is unvalidated | Proposed |
| DL-08 | A responsibility contest moves Responsibility → Needs review and pauses recovery; payment unchanged | Keep Confirmed with a "disputed" badge | Prevents a "Confirmed + Disputed" contradiction | Proposed |
| DL-09 | *Outcome unknown* requires **Check status** before any retry | Allow immediate retry | Prevents double payment | Proposed (designer-stated principle) |
| DL-10 | Screen 6 = a view of the same challan, not a separate payments module | Separate payments list | Keeps the six screens coherent; batch payments are future | Proposed |
| DL-11 | All four onboarding methods go through one review-before-add step with deduplication | Separate flows per method | One mental model; consistent duplicate handling | Proposed |
| DL-12 | "Checked: no challans found" is distinct from *failed* / *incomplete*, and is always time-stamped | Show 0 when unknown | Prevents false "all clear" | Proposed (designer-stated principle) |
| DL-13 | Integrations and payment outcomes are simulated and labelled | Real APIs | No real API or payment provider is available | WA |
