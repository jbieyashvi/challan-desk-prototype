# 03 · Prototype guide

Clickable, coded prototype of the Challan Management Platform (working name **Challan Desk**).
It runs locally only. It is **not deployed**, and every integration is simulated.

> Status: working prototype, refined 17 Oct 2026 (see [§8](#8-refinement-17-oct-2026)). Designer review: **Pending**.
> This is not the final submission. See [Outstanding deliverables](#6-outstanding-deliverables).

---

## 1. How to run

```bash
cd ass02
npm install        # first time only
npm run dev        # → http://localhost:5190
```

- The port is fixed at **5190** (`vite.config.ts`, `strictPort`). If 5190 is busy, Vite stops instead of moving to another port.
- `npm run build` type-checks and produces `dist/`. Nothing is published.
- Best viewed at **1440px** wide. It is usable down to **1024px**: the sidebar narrows, less important columns hide, the dashboard stacks into one column, and wide tables scroll sideways inside their card instead of squeezing the action buttons.
- Data is saved in this browser's `localStorage` (key `challan-desk-demo`). To start again, use **Prototype controls → Reset demo data** in the sidebar.

## 2. What is in it

| Screen | Route | What to look at |
|---|---|---|
| Overview | `/` | Four compact metrics (Needs review, Responsibility unresolved, Outstanding amount, Payments to verify). Each opens the matching filtered list with the same count. Work queue near the top. Vehicle check health. "How statuses work" is an expandable section. |
| Vehicles | `/vehicles` | Search and filters. **Add vehicle** drawer (validation, duplicate detection). **Import spreadsheet** (`.xlsx` or CSV; sample download, preview, row-level problems, duplicates; legacy `.xls` rejected. Before §10, `.xlsx` was rejected). **Fetch by owner** (simulated: results / partial / empty / failed / not found). |
| Vehicle details | `/vehicles/:id` | Challan check state (checked / failed / incomplete / not checked). A failed check keeps challans found earlier and marks them as possibly out of date. Linked challans with *holder at violation time*. Assignment or lease history. **Current holder shown separately.** |
| Challans | `/challans` | Separate columns for source status, responsibility (+ responsibility dispute), and payment, plus a short row action (Review, Confirm, Check payment, Reconcile…) whose accessible name names the challan. Filters are kept in the URL. Two different empty states: "no challans yet" and "no challans match these filters". |
| Challan details | `/challans/:id` | Decision panel at the top (amount, violation time, holder at violation time or "Unclear · not preselected", next action). Chronological evidence timeline, with a conflicting handover note highlighted. Confirm, choose another party (reason required), or leave unresolved. Responsibility dispute (internal). Activity log. |
| Payment & resolution | `/challans/:id/payment` | Who is responsible vs who pays the authority. Approve → pay (simulated outcome). Check status before any retry. Receipt. Record an external payment (operator-recorded). Amount recovery or write-off. Close case with a checklist. |
| Design system | `/design-system` | The coded tokens and components. It states plainly that this is **not** the Figma deliverable. |

Two workspaces are in the sidebar switcher: **Example Freight Co.** (fleet, driver shifts) and **Example Lease Ltd.** (leasing, lease contracts). Opening a challan or vehicle from another workspace switches to it automatically.

## 3. Scenario walkthroughs

All names, registrations, IDs and amounts are fictional sample data.

### Scenario A: fleet handover close to the violation time (`SAMPLE-F-0142`)

1. **Overview** → *Needs review* → open **SAMPLE-F-0142** (or go to `/challans/c-f0142`).
2. The decision panel shows ₹2,000, 2 Oct 2026 19:55, *Driver at violation time: Unclear · not preselected*, and the next action. The callout says the violation is **5 min from a recorded handover** and that the handover note conflicts with the recorded shift times. *Current driver* (Driver C) is shown for context only.
3. The evidence timeline lists, in time order: Shift F-201 (Driver A, until 20:00), the depot note ("keys handed to B around 19:45", flagged *Conflicts with recorded times*), the violation at 19:55, and Shift F-202 (Driver B, from 20:00).
4. Choose the responsible party → pick Driver B, add a reason → the decision is recorded in the activity log.
5. **Payment & resolution** → approve → pay and pick **Unconfirmed** as the simulated outcome. The challan is *not* treated as paid, retry is disabled, and **Check payment status** is offered.
6. Check status → "No payment was made" → it becomes *Failed* and retry becomes available → retry with success → *Paid*, with a receipt.
7. Record amount recovery (or write it off with a reason) → **Close case**. The checklist shows why it is allowed.

### Scenario B: leasing, challan discovered after the lease ended (`SAMPLE-L-0377`)

1. Open `/challans/c-l0377`. The workspace switches to **Example Lease Ltd.**
2. A **suggestion**: Lessee Org C (Lease L-101 covered the violation time). The **current** lessee, Org D, is shown separately and is not used for matching. A callout notes that the challan was discovered after that lease ended.
3. **Confirm Lessee Org C** (reason required). Then **Record responsibility dispute** (e.g. "vehicle was returned that morning"). The challan goes back to *Needs review* with nothing preselected, amount recovery pauses, and the copy says this is **internal only, not an official challan dispute**. The platform does not file or resolve disputes with the authority.
4. **Review dispute**, then choose a party and save. Choosing the same party → *Dispute not upheld*; a different party → *Dispute upheld*. Or **Record dispute withdrawn**.
5. **Payment & resolution** → payer: **Responsible party pays directly** → **Record party payment** (reference, paid by, date). It shows *Paid* and *operator-recorded, not verified by the platform*. Amount recovery is *Not applicable*.
6. **Close case** → "Paid directly by responsible party".

### Other states worth clicking

- **Prototype controls** → set the outcome of "Check now" (no challans / failed / incomplete) → open a vehicle → **Check now**.
- **Fetch by owner** with `OWN-SAMPLE-01`, `OWN-PARTIAL`, `OWN-EMPTY`, `OWN-FAIL`, or any other ID (not found).
- **Import CSV** → *Download sample CSV*. The sample deliberately contains problem rows.
- `SAMPLE-F-0115`: the source says *Paid at source* while payment here is *Not started*. The next action is **Reconcile with source**, and the Overview's outstanding card counts it separately.

## 4. Assumptions in the prototype

These come from the Step 1 and Step 2 working assumptions (see [`02-journeys-workflows-edge-cases.md`](02-journeys-workflows-edge-cases.md)). Each remains **pending designer review**.

- Desktop web, operator-facing. Drivers and lessees have no portal; they appear only as contacts.
- The system **suggests** a responsible party only when exactly one record covers the violation time. Overlap, gaps, a date-only violation, missing records, and violations within **30 minutes** of a handover all go to manual review with nothing preselected. The 30-minute window is an AI proposal (DL-07).
- Responsibility (who bears the cost) and payer (who pays the authority) are separate decisions.
- Payment is allowed before responsibility is final (DL-06, AI proposal). Once payment starts, the payer is locked.
- A "responsibility dispute" is a record inside this platform only. It never represents a dispute filed with, or accepted by, any authority.
- Only a confirmed success, or an operator-recorded external payment, counts as paid. "Unconfirmed" must be checked before a retry.
- A case closes only when responsibility is confirmed, no responsibility dispute is open, payment is confirmed, and recovery is recorded, written off, or not applicable.

## 5. Limitations (what this prototype is not)

- **No real integrations.** The challan source, owner lookup, payment service and receipts are simulated. Nothing leaves the browser. No messages are sent.
- **No legal logic.** It does not decide liability, and it makes no claim about how any authority handles disputes or payments.
- **Single user, single browser.** There are no roles, logins, approvals by different people, or multi-user conflicts. "Operator" and "Approver" are labels only.
- **Not responsive below 1024px.** Mobile is out of scope.
- **No real research.** Labels and flows are designer and AI hypotheses and have not been tested with users.
- Accessibility work so far:
  - Visible labels and text status labels (colour is never the only signal).
  - Focus-trapped dialogs that close with Esc and return focus.
  - `aria-live` notifications.
  - Field-level errors.

  A full audit (screen reader pass, contrast measurement, keyboard-only run) has **not** been done.
- Spreadsheet import reads `.xlsx` (first worksheet only, cell values as text) and CSV. Legacy `.xls` is not supported, and the user is told to save as `.xlsx` or CSV. (Before §10, `.xlsx` was also rejected.)

## 6. Outstanding deliverables

Still needed before submission (deadline 19 Oct 2026, 6 PM):

- [ ] **Figma design system**: real Figma components, Auto Layout, and variables. The `/design-system` page is only a coded reference.
- [ ] **Figma screens / high-fidelity designs** for the six screens, if the brief expects them in Figma.
- [ ] **Walkthrough video** of the two scenarios.
- [ ] Designer review of every AI-proposed decision (DL-06, DL-07, DL-08, DL-10, DL-11, amount-recovery dimension, write-off option).
- [ ] Final copy review (labels, callouts, empty states).
- [ ] Hosting/sharing decision. This prototype is local only and has not been deployed.
- [ ] Any submission write-up the brief requires.

## 7. Verification done (17 Oct 2026)

Checked by driving the app in a real Chrome browser at `localhost:5190`. Only the checks listed here were done.

- **Scenario A, end to end:** near-handover review, no preselection, validation errors on both fields, choose with reason, unconfirmed → check status → failed → retry → paid + receipt, recovery, close, and the state persisting after reload.
- **Scenario B, end to end:** suggestion with current lessee shown separately, confirm, internal contest → back to review, resolve, payer → responsible party, record external payment (validation + operator-recorded), recovery not applicable, close.
- **Overview:** metric counts match the filtered list ("Payments to verify" vs `?payment=attention`), both before and after reset.
- **Challans filters:** search, combined filters, the "no match" empty state.
- **Vehicles:**
  - Add-vehicle validation (empty fields; duplicate detected despite lowercase input).
  - CSV import (at that time): `.xlsx` rejected; a test file with ready, duplicate-in-file, already-added and error rows previewed correctly; the one valid row was imported.
  - All five owner-fetch outcomes.
- **Vehicle details:** check-incomplete state through Prototype controls.
- **Other pages:** `/design-system` and the 404 page render. No console errors on those pages.
- **Reset demo data:** restores the seed.
- **Width:** at a 1024px window, the challans and vehicles tables fit without sideways scrolling. *(Superseded in §8: wide tables now scroll inside their card rather than squeezing action buttons.)*

**Not done:**
- Keyboard-only run of every flow.
- Screen reader pass.
- Testing in other browsers.
- Clicking through the "Download sample CSV" and "Download receipt" files (the buttons exist; the downloaded file contents were not opened).

**Fixed during verification:**
- The close-case check passed recovery before payment.
- Added a write-off outcome for recovery.
- Dialog errors moved next to their fields.
- Lease date ranges overflowed the evidence column.
- Reason hints were fleet-only in the leasing workspace.
- The vehicle-details challan table overflowed.
- Tables overflowed at 1024px.
- Minor copy fixes.

## 8. Refinement (17 Oct 2026)

Targeted fixes from a design review. Routes, sample scenarios, visual direction and existing behaviour are unchanged, and no new features were added. All changes are AI proposals and **pending designer review**.

### What changed

1. **Consistent counts.** One set of shared selectors (`src/domain/logic.ts`) feeds the dashboard metrics, the sidebar and the challan filters.
   - *Needs review* means records are unclear, conflicting or disputed.
   - *Responsibility unresolved* means needs review plus suggested but not yet confirmed.
   - The sidebar pill now reads **"N unresolved"** and opens that exact list. Below 1180px it shows only the number; the accessible name keeps the full wording.
   - Both workspaces use the same logic.
2. **Unknown vs zero challans.**
   - Vehicles with no complete check and no known challans show **"Not verified"**, not "0".
   - Vehicles whose latest check failed or was incomplete, but that have challans found earlier, show the known count with **"Earlier results · may be out of date"**.
   - A failed check never removes earlier challans. A *Last complete check* time is now recorded.
   - The dashboard's vehicle-check card uses the same split.
3. **Challan table readability.**
   - Short action labels: Review, Confirm, Check payment, Retry payment, Reconcile, Approve, Record recovery, Close case.
   - Each button's accessible name gives the full action and the challan reference.
   - Buttons are 32px tall, at least 96px wide, and never wrap.
   - The action column sizes to its content. The table keeps a minimum width and scrolls sideways inside its card when needed.
4. **Decision panel and evidence on challan details.**
   - The responsibility card is now a decision panel at the top. It shows amount, violation time, holder at violation time (suggestion, or "Unclear · not preselected"), and next action, followed by the decision buttons.
   - The evidence timeline sits directly below, in time order.
   - A handover note that conflicts with the recorded shift times becomes its own highlighted row, flagged *Conflicts with recorded times*.
   - Nothing is sticky, so nothing can cover content, focus or dialogs. The choose-party dialog still starts with nothing selected.
5. **Compact dashboard.**
   - The four metric cards are smaller and sit in one row at 1440px, with two per row below 1180px.
   - Supporting copy is shortened, so the work queue starts right under the metrics.
   - "How statuses work" is an expandable section.
   - Below 1180px the work queue and side panel stack.
   - No charts or new metrics were added.
6. **Terminology.**
   - "Internal contest" is now **"Responsibility dispute"**. Where it matters, the UI says *internal only, not an official challan dispute*, and that the platform does not file or resolve disputes.
   - "Recovery" is now **"Amount recovery"**, with a short explanation of getting the amount back from the responsible party after the company pays, which happens outside the platform.
   - Help text is now in tooltips and the expandable section.

Seed data version 4 adds two fictional details: an earlier complete check for `XX 00 AA 0003` (its latest check failed), and the ≈19:45 time stated in the `SAMPLE-F-0142` handover note.

### Verified in Chrome (17 Oct 2026)

Done at a 1470px-wide window. The 1024px checks used a 1024px-wide same-origin iframe of the app, because the browser window could not be resized in this session.

- **Counts, fleet:** the dashboard (Needs review 4, Unresolved 5, Outstanding ₹9,000 across 8 challans, Payments to verify 2) and the sidebar pill (5) each match the list they open. After deciding `SAMPLE-F-0142`, these became 3 and 4 everywhere: dashboard, pill, both lists and work queue.
- **Counts, leasing:** the metrics and pill match their lists. No fleet challans appear.
- **Scenario A (fleet handover):**
  - Decision panel shows "Unclear · not preselected".
  - Conflicting note is highlighted.
  - The dialog opens with no radio selected. Empty save shows both field errors.
  - Esc closes the dialog, and focus returns to the trigger with a visible focus ring. Enter reopens it, and Shift+Tab stays inside the dialog.
  - Chose Driver B with a reason. Details, list and dashboard updated, and the change survived a full page reload.
- **Scenario B (leasing):**
  - The suggestion is Lessee Org C (lease L-101), and current lessee Org D is shown separately as context.
  - Confirmed with a reason, then recorded a responsibility dispute. The case went back to needs review, nothing was preselected, amount recovery paused, and the copy says it is internal only.
- **Payments:**
  - `SAMPLE-F-0127` (unconfirmed) is not marked paid. *Check payment status* is offered, and *Retry payment* stays disabled until the check.
  - `SAMPLE-F-0124` (failed) shows "Payment failed: not paid".
- **Vehicles:**
  - "Not verified" vs "0" vs "1 · Earlier results" all appear as expected.
  - Running *Check now* with a failed outcome kept the vehicle's earlier challan and showed the stale message.
- **Add vehicle:** required-field errors appear, and a duplicate typed in lowercase is caught.
- **CSV import (at that time):** `.xlsx` is rejected, and a test CSV previews 1 ready, 1 duplicate in file, 1 already added, and 2 errors. Nothing was imported.
- **Owner lookup:** `OWN-SAMPLE-01` returns results, `OWN-EMPTY` returns "owner found, no vehicles", and `OWN-FAIL` returns "The lookup failed".
- **Layout at 1440 and 1024:**
  - Action buttons are 32px tall and none wrap. The challans table scrolls inside its card at 1024.
  - The pages checked had no page-level horizontal overflow and no clipped buttons: overview, vehicles, challans, both challan details, and payment.
  - Two problems found at 1024 and fixed: the sidebar pill overlapped the "Challans" label, and the dashboard work-queue action spilled out of its card.
- **Other:**
  - The 404 page and `/design-system` render.
  - No console errors were recorded on the pages visited after console tracking started.
  - *Reset demo data* restored the seed counts.
  - `npm run build` passes.

**Not done in this refinement:**
- Resizing a real browser window to 1024px (an iframe was used instead).
- The full Scenario A payment-to-close path. It was not re-run after this refinement; it was verified in §7, and the payment logic was not changed.
- Keyboard-only run of every flow.
- Screen reader pass.
- Other browsers.

## 9. Visual refinement (17 Oct 2026)

The designer supplied five visual references (reference #3 as primary). This pass changes visual design and interaction hierarchy only. Routes, data, domain logic and workflows are unchanged. It is not deployed.

### What changed
- **Tokens:** neutral `#f6f7f9` background with white surfaces, one indigo accent (`#3b4fd8`), a subtle row-separator colour, 28px page titles, 38px controls, 56px table rows, and tabular numerals for amounts and counts. Cards have no shadow; shadows are used on overlays only.
- **Shell:** the workspace switcher is a labelled card at the top of the sidebar showing the workspace kind. The Design system link, Prototype controls and the "Prototype · simulated data" label are quiet and sit at the bottom.
- **Overview:** four metrics in one row at wide widths (number, label, one-line breakdown, action link). The vehicle-check warning is shown as one callout. The work queue is a full-width table, and "How statuses work" sits below it.
- **Vehicles and Challans lists (reference #3):**
  - Status tabs with counts. Each tab is a link to an existing filter, so its count matches the Overview and the sidebar.
  - Search and the frequent filters stay visible. Other filters are behind **More filters**, which shows an active count.
  - Applied-filter chips with a result count and **Reset all**.
  - Uppercase subtle table headers. Registration numbers are shown as plates, challan numbers as underlined links, and amounts are right-aligned.
- **Challan details:**
  - The header shows the challan number, offence, source status and payment, followed by a fact strip (amount, violation time, vehicle, location, due date).
  - The main column has "At violation time vs Current holder", then the evidence timeline. Source and sync, and Activity, are collapsible.
  - The decision panel sits on the right and holds the status, the conflict callout, the actions and the next step.
  - The duplicate status summary card was removed.
- **Assignment dialog (reference #2):** an evidence summary beside the form, which stacks above the form under 800px. Each party option shows its ID and shift or lease. The dialog explains why a reason is required, and the footer stays visible while the body scrolls. Nothing is preselected.
- **Payment & resolution:** a fact strip (amount, payment, responsibility, payer, amount recovery). The payment card comes first, and the close-case checklist sits in the side column with "X of Y done". The receipt has a confirmed header and aligned rows.
- **Add vehicle drawer (reference #4):** fields grouped into Vehicle and Ownership sections.
- **`/design-system`:** now includes the forced hover, focus, disabled, error and selected states, plus status tabs, the toolbar with More filters, filter chips, fact strip, disclosure, evidence timeline, split dialog and sectioned drawer. It is coded CSS, **not** Figma components, variables or Auto Layout.

### Verified in Chrome (17 Oct 2026)
Same setup as §8: a 1470px window, with 1440px and 1024px checks done in a same-origin iframe.
- **All six screens, both workspaces, at 1440 and 1024:** an automated pass over 24 combinations found no page-level horizontal scroll and no clipped or wrapped buttons, tabs, badges, filter chips or table headers. At 1024 the challan and vehicle tables scroll inside their cards.
- **Counts (fleet):**
  - Overview showed 4 / 5 / ₹9,000 (8 unpaid) / 2, and the sidebar showed "5 unresolved".
  - The Challans tabs showed the same numbers, and each tab listed that many rows.
  - After deciding `SAMPLE-F-0142`, the sidebar showed 4.
- **Filters:**
  - Setting Source status in More filters gave "?source=paid", an active count of 1, a chip and "3 challans · ₹2,500".
  - Removing the chip cleared it, and Reset all cleared every filter.
  - Escape closed the panel and returned focus to the button.
  - The Vehicles "Not verified" tab showed 1 of 7, with "Not verified" in the count column (not 0).
- **Scenario A:**
  - The conflict is highlighted in the timeline and the decision panel.
  - The dialog opened with 0 radios checked and the summary on the right, fitting the viewport with the footer visible. The same held at 1024; at 760px the summary stacked above the form.
  - Escape closed the dialog and returned focus to "Choose responsible party".
  - Chose Driver A with a reason, and the decision saved.
- **Payment:**
  - Approve, then Pay with "No confirmation" gave Unconfirmed, with *Check payment status* first and *Retry payment* disabled.
  - The state survived a reload.
  - The status check returned "went through", giving Paid and the receipt. The close checklist showed 3 of 4.
- **Drawer:** Add vehicle drawer is full height at 1024 with two sections.
- **Focus:** `:focus-visible` rings are present on the workspace select, nav, tabs, search, selects, More filters, table links, registration links and table buttons.
- **Fixed during this check:**
  - A stray 1px vertical scrollbar on the tab row.
  - The tab focus ring, which was clipped (it is now an inset ring).
  - A cramped challan-details main column at 1024. The side panel is now 288px below 1100px.
- **Other:** *Reset demo data* restored the seed counts, no console errors were recorded on the pages visited, and `npm run build` passes.

**Not done:** a real 1024px browser window; keyboard focus moved by real Tab key presses (the automation's key events did not reach the page, so focus styles were checked by focusing elements directly); a screen reader pass; other browsers; a re-run of the leasing payment path.

**Known issue:** at 1024 the Overview metrics wrap to 2×2, so the work-queue header appears near the bottom of a 768px-tall viewport rather than well inside it.

## 10. Operations workspace pass (17 Oct 2026)

AI-assisted changes, all **pending designer review**. Routes, data contracts and scenarios are unchanged; every count is derived from the seed data.

**Overview**
- Four metrics in one row (down to 860px wide): Responsibility pending (with "N manual reviews · M suggestions"), Outstanding amount, Payments needing attention (unconfirmed · failed) and Vehicle check issues (failed · incomplete). Each opens its filtered list, and the list shows the same count.
- Work queue with a stated order rule (payment problems, disputes, responsibility, payments, wrap-up; then earliest due date), a factual reason per row and the due date. It makes no urgency claims beyond that rule.

**Vehicles**
- `.xlsx` import now works with no new dependency (`src/features/xlsx.ts`), and CSV and XLSX share the same validation. Legacy `.xls` is rejected with instructions.
- "Not verified" (unknown), "None found" (verified zero) and "N · may be out of date" (stale) are distinct. Failed or incomplete checks get a Retry check button in the row. Timestamps show the date only, with the full time on hover.

**Vehicle details**
- One summary: registered owner, today's driver or lessee, open challans and check status. A note says today's holder is not automatically responsible.
- Tabs (Challans, Assignment/Lease history, Vehicle info), synced to `?tab=`. The Challans tab shows the holder at the violation time, separate from today's holder.

**Challans**
- Views: All, Responsibility pending, Payment attention, Closed. Other conditions are filters (Responsibility and Payment separate; Case and Source under More filters).
- Columns: challan/offence, vehicle, violation date, amount, responsibility, payment and next action. The action column is sticky on the right, identifiers do not wrap, and the table scrolls horizontally when it needs to.

**Challan details**
- A summary row (amount, violation time, vehicle, due date with days left, payment and source status).
- One decision summary derived from the records, shown once. For `SAMPLE-F-0142` it reads exactly: "Violation at 19:55. Driver A's recorded shift ends at 20:00, but the handover note says Driver B received the keys around 19:45. Verify the handover before assigning responsibility."
- For leasing, the summary compares the violation time with lease start/end and return records, and says explicitly that the discovery date and today's lessee are not used.
- The evidence timeline is in the main column and the responsibility panel beside it. Record entry details are expandable. Today's holder is a secondary "Vehicle today" line marked as not used for matching.
- Assignment dialog: parties in the nearby records, any disputing or decided party, and the company come first. Others sit behind a searchable "Choose another party". Nothing is preselected, a reason is required, and "Keep pending instead" switches to the pending note. Suggestions are labelled "suggested from records". The dispute, withdrawal and reopen flows are unchanged.

**Payment & resolution**
- Ordered steps: Payer → Approve → Pay or record external payment → Verify → Recover (only when applicable, marked as tracked outside the platform) → Close.
- Each step is derived from data as Done / Current / Not yet / Blocked / Not required / Failed / Needs a check, with a one-line reason when it is blocked or not required.
- Failed, unconfirmed (retry disabled until a status check), operator-recorded ("not verified by the platform") and source-shows-paid states are kept distinct. When the source shows paid, recording an external payment becomes the primary action. All payments are simulated.

**Design system**: adds metrics, page tabs, the summary block, ordered steps and loading/empty/error/success examples. It lists the remaining Figma deliverables.

**Verified in Chrome** (http://localhost:5190, `npm run build` passing):
- The exact handover text appears once on `SAMPLE-F-0142`.
- Assignment dialog: no preselection, relevant parties first, search, required party and reason, Keep pending, decision saved.
- A dispute was recorded and withdrawn.
- Payment: approve → unconfirmed (retry disabled) → status check "not paid" (Failed) → retry success → recovery recorded → close → reopen available.
- The source-mismatch primary action; the leasing summaries on `SAMPLE-L-0377` and `SAMPLE-L-0350`.
- Metric counts equal the counts in the lists they open.
- `.xlsx` import of a generated test workbook (2 ready, 1 error); `.xls` rejected; Retry check.
- Overview, Challans, Challan details, Payment, Vehicles and Vehicle details at 1440, 1280 and 1024 wide with no horizontal page scroll (one Vehicles overflow was found and fixed). The sticky action column stays visible.

**Limitations**
- Widths were tested with an iframe inside a 1470px window, not by resizing the browser.
- Only the scenarios in the seed data were exercised.
- No screen-reader testing was done beyond the semantic markup (tabs, `aria-current` on steps, labelled fields).
- The `.xlsx` reader handles typical files but not every Excel feature (dates come through as serial numbers; formulas use their cached values).


## 11. Navigation and workflow clarity pass (17 Oct 2026)

AI-assisted changes, all **pending designer review**. Routes, seed data and the visual design are unchanged.

**Return navigation** (`src/features/nav.tsx`)
- Every detail page has a "Back to …" link beside the breadcrumb. The breadcrumb only shows location; the back link is the return action. Top-level lists have no back link.
- Wording follows where the user came from: "Back to vehicles", "Back to vehicle XX 00 AA 0001", "Back to challans", "Back to overview", and "Back to challan" on Payment & resolution.
- The origin, including the list's search, filters and view, travels in router history state. It is kept through payment, so payment → challan → vehicle → list returns to the same filtered list.
- Direct URLs and new tabs have no history state, so they fall back to the parent route: payment → its challan, challan → Challans, vehicle → Vehicles.

**Vehicle journey**
- After adding, importing or owner lookup, a confirmation banner lists the new vehicles with **Check challans** / **Check these N vehicles**, plus **View vehicle** for a single vehicle.
- The banner shows each vehicle's result separately: Checking…, Not checked yet, Check failed (challans unknown), Check incomplete (there may be more), No challans found, or N open challans found with a **View challans** link. Failed and incomplete checks get a Retry button.
- On vehicle details, a check run there ends with "Check complete: N new challans found", "no new challans" or "no challans found", plus **View challans**. Failed and incomplete checks stay as separate warnings.
- The Prototype controls have a new outcome, "Checked: sample challans found", which creates fictional `SAMPLE-N-####` challans (2 the first time, then 1 more per check).

**Assignment records**
- The buttons now read **Add driver assignment** (fleet) and **Add lease** (leasing). Help text: "Record who had this vehicle and when. Used to review responsibility for past challans."
- Record management stays in the vehicle's history tab. From a challan, the "Add driver assignment" / "Add lease" link opens that tab, and its back link returns to the challan.
- The record form can create a minimal new driver or lessee: a name and an internal reference only. No contact or ID data is collected, and it is stored in this browser only.
- The form warns, without blocking, when the new record overlaps an existing one. Challans in the overlap still go to human review.

**Actions match their outcomes**
- On Challans, "Check vehicles for challans" is now **Go to vehicles**. A note says new challans appear after a vehicle is checked. Checking cannot start from Challans.
- Buttons that only open a review are labelled **Review responsibility**, **Review suggestion** or **Review dispute**. "Confirm {party}" appears only on the save button inside the dialog. A reason is still required, and nothing is preselected.

**Payment & resolution**
- The default payer is shown as **Default, not confirmed**, not Done. Approving the payment confirms the payer.
- A "Now" line states the current action and what it does, including that the company can pay before responsibility is decided and recover the amount afterwards.
- The approve step states its consequence ("Nothing is paid yet").
- The closing checklist is folded ("What closing needs (x of y done)") until it is relevant.
- Responsibility and payer stay separate. Simulated labels and failed/unconfirmed handling are unchanged.

**Tables**
- At 1280px wide and above, the next-action column is sticky with an opaque background and an edge shadow.
- Below 1280px it scrolls with the row, so it no longer covers the Payment or Responsibility columns.
- The Vehicles "Latest check" cell stacks badge and date, and the offence clip width was reduced.

**Verified in Chrome** (http://localhost:5190; `npx tsc -b` and `npm run build` passing; no console errors after a reload and a pass through all main routes):
- **A.** Vehicles filtered by check = Checked → XX 00 AA 0001 ("Back to vehicles") → SAMPLE-F-0142 ("Back to vehicle XX 00 AA 0001") → payment ("Back to challan") → back → back → `/vehicles?check=checked` with the filter restored and 5 rows.
- **B.** Challans filtered by Responsibility = unresolved and Payment = not started → challan ("Back to challans") → payment → back → back: both filters and the 5 rows were restored.
- **C.** Added XX 00 ZZ 0042 → banner → Check challans: "Checking…", then "2 open challans found". View challans → vehicle → challan ("Back to vehicle XX 00 ZZ 0042").
- **D.** Owner lookup added 3 vehicles. A failed batch showed "Check failed: challans unknown" ×3 with "Retry 3 failed". The retry with none-found showed "No challans found" ×3. A single incomplete check showed a warning banner and Retry. Vehicle details: the loading note, "no new challans", "1 new challan found", and the failed and incomplete warnings.
- **E.** Add driver assignment with a new driver: empty-save validation showed 4 messages, then the save worked. A second, overlapping assignment showed the overlap warning and still saved. The 7 Oct challan became "Unclear: records overlap" / Needs review. Its dialog had nothing preselected and needed a party and a reason; the save recorded the reason in Activity. The 13 Oct challan showed **Review suggestion**, opening a dialog titled "Review suggestion: Driver Z" with **Confirm Driver Z** as its submit. It was cancelled without saving.
- **Payment:** "Default, not confirmed" on the payer step, the Now line text, and the folded close checklist.
- **Direct URLs** (fresh loads): payment → "Back to challan" `/challans/c-f0135`, challan → "Back to challans", vehicle → "Back to vehicles". Lists have no back link.
- **Keyboard:** Tab from the main area focused "Back to challan" first, with a visible focus ring. Enter returned to the challan, whose link read "Back to vehicle XX 00 ZZ 0042".
- **Tables** at 1440 and 1024 (iframe): no element under the sticky column on Challans, Vehicles, Vehicle details or Overview, and no horizontal page scroll. At 1024 the tables scroll inside their frame.
- The demo data was reset afterwards.

**Limitations**
- The return origin lives in browser history state. Opening a link in a new tab, or bookmarking it, loses it and the parent-route fallback applies.
- The vehicles banner is page state. It disappears after leaving Vehicles; per-vehicle results stay on each vehicle.
- A new driver or lessee is minimal (name and internal reference only), and parties cannot be edited or removed.
- "Found" challans are fictional samples from the simulated source.
- Payment short labels in tables (Approve, Pay, Check payment, …) open the Payment page; they do not act directly.
- Checking from Challans was not implemented (the button was renamed instead).
- Keyboard checks covered the back link only. The banner and dialog buttons are native buttons but were operated by script, not by keyboard. No screen-reader testing was done.
- Widths were tested in an iframe, not by resizing the window.

## 12. Compact operations layout pass (17 Oct 2026)

AI-assisted changes, all **pending designer review**. The brief asked for a compact operational layout "inspired by" a SunFrame ERP screenshot. **No screenshot was received**, so the work follows the written brief only. Routes, workflows, seed data, return navigation and the Prototype controls are unchanged.

**Shared tokens and components** (`src/styles/tokens.css`, `src/styles/components.css`, `src/components/`)
- Page title is 26px. Controls are 36px, table headers 40px, and page gaps 16px. Rows are about 56px and grow with content; nothing is clipped to save space.
- The secondary text colour is darker (`#5b6474`: 5.97:1 on white, was 4.97:1).
- Table headers are sentence case, 13px and semibold.
- A cell can hold a primary line and a secondary line (`.cell-sub` / `.cell-stack`).
- New `SearchField` and `TableFooter` components. `AppliedFilters` now shows only the chips and the reset; the result count moved to the footer.
- **List surface.** Tabs, toolbar, applied filters, table and footer now sit in one bordered white card. The toolbar stays on one row at 1024px.
- **Sticky headers.** The table header sticks to the top of the page when the table fits its width. There is no nested vertical scroll.
- **Narrow widths.** When the table is wider than its container (e.g. 1024px), it scrolls sideways inside the card and the header is not sticky.
- **Supersedes §11's sticky column.** The sticky next-action column was removed, which ends the overlap with the Payment column.
- `/design-system`: the old "List controls" and "Table" samples are replaced by one "List surface" sample, and the type and spacing notes are updated.

**Vehicles**
- Columns: Registration (type below) / Registered owner / Driver or Current lessee / Open challans / Latest check (date below) / Next action.
- "Added via" left the table. It is still a More filter and appears on vehicle details.
- **Open challans** keeps four distinct states:
  - "Not verified".
  - A count with "May be out of date" below.
  - "None found".
  - A verified count, which links to `/challans?vehicle=…&view=open` and offers "Back to vehicles".
- Next action is **View vehicle** once checked. Otherwise it is **Check challans** or **Retry check** (simulated, showing "Checking…" while running).

**Challans**
- Columns: Challan (offence below) / Vehicle / Violation date (time below) / Amount (right-aligned, tabular figures) / Responsibility / Payment / Next action.
- **Short action labels:** Review, Review suggestion, Review dispute, Check payment, Record payment, Open payment, Review closure, and so on.
- **Accessible names.** Each action's accessible name includes the challan and what the link opens, e.g. "Review, challan SAMPLE-F-0135: review responsibility". These labels only open pages and never confirm anything.
- **Footer:** "All N challans" or "N of M challans", plus the total of the filtered rows.

**Overview:** the queue uses the same short labels. At 1024px the vehicle column is hidden so the queue fits without sideways scroll.

**Pagination** was not added. The sample lists are small, and the footer shows the accurate result count.

**Verified in Chrome** (http://localhost:5190; `npx tsc -b` passing; a production build into a scratch folder succeeded and `dist/` was not touched; no console errors on the routes visited):
- **Widths.** Tested in an iframe at 1440×900 and 1024×768, because the browser window could not be made wider than 1040px.
  - Both workspaces were checked on Vehicles, Challans and Overview. Vehicle details and `/design-system` were checked at 1440, fleet workspace only.
  - No cell spill, no wrapped buttons and no page-level horizontal scroll.
  - At 1440 every table fits and the header sticks (header top at 0 after scrolling).
  - At 1024 Vehicles and Challans scroll sideways inside the card, while Overview fits.
  - Row heights were 56–65px on tables at 1440 and up to 97px in the Overview queue at 1024.
- **Vehicles (fleet).**
  - Search "0003" gave "1 of 7 vehicles" with a chip. Reset restored "All 7".
  - Check = attention gave "2 of 7" and the "Check issues" tab was active.
  - The "2" for AA 0002 opened Challans filtered to that vehicle and open cases ("2 of 10", chips Case: Open and Vehicle).
  - Its "Back to vehicles" link returned to Vehicles. The same back link was also re-checked in leasing ("1 of 4").
- **Challans (fleet).**
  - Unfiltered: "All 10 challans · Total ₹10,500".
  - Search: "signal" gave 2 of 10 (₹2,000); "zzzz" gave 0 of 10, the empty state and no total.
  - Tab counts matched the footer and the rows.
  - More filters: Case = Closed gave 1 of 10. Reset restored all.
- **Chain.** Filtered challans → payment page → "Back to challan" → "Back to challans" restored the filtered list.
- **Leasing.**
  - "Retry check" on XX 00 BB 0009 showed "Checking…" (disabled), then "Checked", "None found" and "View vehicle", with a simulated toast.
  - Review on SAMPLE-L-0350 opened the dialog with nothing preselected.
  - "Save decision" with nothing chosen showed "Choose a lessee or the company." and "Add a reason for this decision."
  - Choosing the company and entering a reason saved it as Confirmed.
  - Payment: Approve payment, then Pay ₹1,000 with the simulated "Success" outcome. The button showed "Processing…", then the status became Paid.
- **Keyboard.** Tabbing on Vehicles showed a visible focus indicator on each stop: the tabs, search, select, More filters, registration link, count link and View vehicle button.
- Demo data was reset and the fleet workspace was restored afterwards.

**Limitations**
- No reference screenshot was received, so similarity to the ERP layout is unverified.
- At 1024px the Next action column of Vehicles and Challans is off-screen until the table is scrolled sideways, and the header is not sticky there.
- Widths were tested in an iframe, not a real 1440px window. ChallanDetail and Payment were inspected at the real window size (~1040px) only.
- No screen-reader testing was done. The assignment and payment dialogs were operated by script, not by keyboard.

## 13. Workflow review pass (17 Oct 2026)

AI-assisted changes, all **pending designer review**. Compact design, routes and back navigation are unchanged. Demo data was **not** reset. Testing used clearly named disposable records (prefix `TEST-` or "(disposable)"), listed under "Demo records changed" below.

### 13.1 Payment status vs source status

- Payment status and source status are **independent**. The source status changes only on a successful source response ("Re-check source" → "Paid at source"). A failed or "no response" re-check changes nothing except the activity log and the toast.
- **Paid, source unchanged.** The challan and payment pages show the callout "Payment confirmed · source update pending". It includes the payment reference, the confirmation time, the last source check and its result, "Do not pay again", and **Re-check source**.
- **No second payment.** Once paid, the Pay, Retry and record-external-payment controls are gone.
- **Visible and filterable.**
  - Challans has a Payment filter "Source update pending" and a badge on the row. The footer adds "Paid, awaiting source ₹X".
  - Overview links to "N paid challan(s) awaiting source update".
  - This all still works after the case is closed.
- **Provisional rule (assumption, needs stakeholder validation).** A case **may be closed while the source update is pending**. The close dialog says the source still shows it unpaid. After closing, the callout adds "Closed here; the authority's record may not be updated yet."
  - This is not a confirmed business or legal rule.
  - Ops, finance and legal stakeholders must confirm whether closure should instead wait for the source, or need a reason or approval.

### 13.2 Vehicle challan summary

- Shared count definitions (`challanCountView` / `challanCountText` in `src/domain/logic.ts`) are used in Vehicles and on vehicle details:
  - **"N open · M closed"**, e.g. "0 open · 1 closed".
  - **"No challans found"** only after a complete, successful check that found none.
  - **"Not verified"** when the vehicle was never checked.
  - **Stale.** When the latest check failed or was incomplete, the count is shown with "Latest check failed · may be out of date" (or "incomplete").
- **Amount labels.**
  - "Unpaid amount" on Overview.
  - "Total" of the filtered rows in the Challans footer.
  - "Paid, awaiting source" when any rows are pending at the source.

### 13.3 Other fixes

- **Assignment history.** Overlapping assignments are marked in the history list with an "Overlap" badge and the note "Overlaps <ref>: challans in that period need review". Previously the overlap warning appeared only in the form.
- **Assignment form.** The "Choose a driver" error clears when "New driver" is chosen.
- **Import.** The unsupported-file message now says what to do: save as .xlsx or CSV and upload that.
- **Re-check dialog.** It resets to "Paid at source" each time it opens.
- **Dispute resolved to the company.** The banner no longer says "Not yet acknowledged by the party".
- **Payment filter.** The attention option is labelled "Unconfirmed or failed".
- **Cross-tab persistence (bug found during testing).** A second open tab could overwrite newer data with its stale copy.
  - The store now adopts data saved by another tab (the `storage` event) and does not re-save it.
  - Each tab keeps its own workspace.
- **1024px layout.**
  - In Challans the Vehicle and Violation date columns are hidden, and their values move under the challan number.
  - In vehicle details the holder column is hidden and its value moves under the violation.
  - Cell padding is slightly tighter.
  - Tables now fit without sideways scroll at 1024, so the sticky header works there too.

### 13.4 Verification report

Tested in Chrome at http://localhost:5190. `npx tsc -b` passes. The scratch production build succeeded, and `dist/` was not touched. No console errors on the last checks. Widths were checked in an iframe at 1024 and 1440.

| # | Scenario | Steps | Expected | Observed | Result | Remaining issue |
|---|---|---|---|---|---|---|
| 1 | Payment vs source (SAMPLE-L-0377, leasing) | Confirm responsibility → approve → pay (Failure) → Retry (Timeout) → status check → re-check "No response" → re-check "Still unpaid" → record recovery → close → filter → re-check "Paid at source" | Failure is retryable; a timeout blocks retry until checked; paid shows the pending callout; failed re-check changes nothing; closure allowed with a note; filterable after closure; source changes only on success | As expected. Single ref SIM-PAY-3852; last check unchanged on "No response" and updated on "Still unpaid"; closed case listed under "Source update pending"; callout gone after "Paid at source"; 11 activity entries | Pass | Closure-while-pending rule is provisional (13.1) |
| 2 | Vehicle summary wording | Inspect BB 0002, BB 0009, BB 0011 (leasing), AA 0003, AA 0006 (fleet) in the list and the detail | "0 open · 1 closed", "Not verified", "No challans found", stale note | As expected after a fix: AA 0003 first read "Latest check incomplete" for a failed check, now "Latest check failed · may be out of date" | Pass (after fix) | — |
| A | Manual entry | Empty submit; "ABC"; "xx-00-aa-0001"; add XX 00 ZZ 9001; Check challans | Required, format and duplicate errors; save; next action offered | As expected; check gave "No challans found" (simulated) | Pass | — |
| B | Import | .xlsx with 5 mixed rows; .txt; .xls; corrupt .xlsx; CSV | Accurate preview; actionable errors; only valid rows imported | Preview 1 ready / 1 duplicate in file / 1 already added / 2 errors; all three error messages shown; CSV imported XX 00 ZZ 9003 | Pass | — |
| C | Owner lookup | OWN-FAIL, OWN-EMPTY, OWN-SAMPLE-01 | Loading, failure with retry, empty, results with existing vehicle disabled | As expected; added XX 00 EE 0201 | Pass | OWN-PARTIAL and not-found **not tested** |
| D | Assignments | Empty submit; end before start; two overlapping assignments on ZZ 9001 | Errors; overlap warning before and after saving | Errors and the form warning shown; after the fix both history rows show the Overlap badge and note; the driver error clears | Pass (after fix) | Party labels inconsistent ("Driver ID D-01" vs a plain ref). These test records were later lost to the cross-tab overwrite |
| E | Internal dispute (SAMPLE-F-0121, paid) | Record with an empty reason, then with a reason → refresh → resolve with an empty reason, then keep Driver C | Reason required; clearly internal; back to review; recovery paused; payment unchanged; audit trail | As expected; "Internal only, not an official challan dispute"; Needs review; persisted after refresh; resolved "not upheld"; payment SIM-PAY-0084 (1 attempt) and source paid unchanged; 9 activity entries | Pass | Reassign-to-company was run once but lost to the cross-tab overwrite; not re-run |
| F | Payment failure / timeout / duplicate | Covered by row 1 | No double payment | Retry disabled after timeout until status check; no pay controls once paid | Pass | Not repeated on a second challan |
| G | Navigation, persistence, URLs, workspaces | Vehicles → vehicle → challan → payment → back chain; `/challans?payment=attention` → F-0127 → payment → back ×2; refresh; direct and invalid URLs; two tabs in different workspaces | Back returns to the origin with filters; data persists; direct URL switches workspace; invalid URL shows not-found; no mixed records | As expected; invalid URLs show "Challan not found", "Vehicle not found", "Page not found"; two tabs stay in sync after the fix, each keeping its own workspace | Pass (after fix) | — |
| L | Layout 1024 / 1440 | Measure Overview, Vehicles, Vehicle details, Challans, challan detail and payment for overflow; scroll for sticky overlap | No clipping, no sideways scroll, no sticky overlap | At 1024 every table fits (766/766 px); at 1440 Challans 1166/1166; no overflowing elements; header sticks below the toolbar | Pass | Iframe-based, not a real window resize; no screen-reader test |

### 13.5 Demo records changed (left in place)

- **SAMPLE-L-0377 (leasing):** it was open before testing. Now: paid (SIM-PAY-3852), recovery TEST-REC-0377, closed, source paid.
- **SAMPLE-F-0121 (fleet):** dispute TEST-DISPUTE-2 recorded and resolved "not upheld". Responsibility is still Driver C; the payment is unchanged.
- **Backup:** a pre-test backup is in localStorage under `challan-desk-demo-backup-2026-10-17`.
- **No longer in storage:**
  - Test vehicles XX 00 ZZ 9001, XX 00 ZZ 9003 and XX 00 EE 0201.
  - The party "Test Driver (disposable)".
  - Assignments TEST-SHIFT-1 and TEST-SHIFT-2.

  These were created, then removed by the cross-tab overwrite (since fixed). Nothing to clean up.
- **Changes made in another tab** during the review (e.g. SAMPLE-F-0130 paid with source pending) were preserved.

### 13.6 Limitations

- Source responses, payments and lookups are simulated.
- The closure rule is an unvalidated assumption.
- No user research or usability testing.
- Widths were measured in an iframe.
- The keyboard-only and screen-reader passes were not repeated for this round.
