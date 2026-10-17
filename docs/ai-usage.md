# AI assistance record

This file records how AI tools were used during the assignment and what the designer reviewed or decided. It is kept honest so reviewers can see where design thinking came from.

| Field | Meaning |
|---|---|
| AI contribution | What the AI produced |
| Designer review | What the designer checked, changed or rejected |
| Final decision | What was adopted and why |

---

## Step 1: Problem framing and users (17 Oct 2026)

**Tool:** Claude (Claude Code), used as a thinking partner from a prompt written by the designer.

**Inputs given to AI**
- The assignment brief, pasted by the designer and saved in [`00-brief-original.md`](00-brief-original.md).
- The designer's own constraints for the step: no screens, no visual style, no invented research, keep all requirements traceable, statuses as assumptions, and no legal claims.

**AI contribution**
- Pulled the requirements out of the brief into a traceable list (R1–R17) and flagged gaps and ambiguities. These include the missing Parts 1–3, the blank "help customers" line, and status words that mix different dimensions.
- Drafted plain-language product understanding, plus two fictional examples (one fleet, one leasing).
- Proposed **user role hypotheses**, Jobs-to-be-done statements, an initial entity model, separate status dimensions, a prototype scope and five open decisions with provisional recommendations.
- No external research was done. No users were interviewed. No quotes, metrics or findings were produced.

**Designer review:** *Pending.*

**Final decisions:** *Pending.* None of the hypotheses, assumptions or recommendations in [`01-problem-and-users.md`](01-problem-and-users.md) have been validated or approved by the designer yet.

---

## Step 1 corrections (17 Oct 2026)

**Designer-directed changes**, applied by AI to [`01-problem-and-users.md`](01-problem-and-users.md):
- Parts 1–3 are now recorded as **absent from the supplied text**. The earlier AI assumption that mapped them onto "The Design Problem" was removed.
- The deadline (19 Oct 2026, 6 PM) is now sourced to the **recruiter's email**.
- Absolute claims were removed. "Challans attach only to vehicles" is now described as *our prototype model*, and delayed discovery as a *scenario assumption*.
- Driver/lessee notifications and links are now *optional future features*, not dependencies of the core workflow.
- D1–D4 are marked as designer-supplied working assumptions, pending final review. §5.3 is marked as superseded by Step 2.

These corrections came from the designer's review. The AI's first draft had over-stated these points.

## Step 2: Journeys, workflows and edge cases (17 Oct 2026)

**Tool:** Claude (Claude Code), from a prompt written by the designer.

**Inputs from the designer**
- Step 1 documents plus the brief.
- Seven working assumptions (WA1–WA7 in [`02-journeys-workflows-edge-cases.md`](02-journeys-workflows-edge-cases.md)): desktop web with a shared model; system suggests and operator confirms; manual review for uncertain records; contacts without a portal; payment execution separate from responsibility allocation; simulated integrations; no invented research or legal conclusions.
- Specific principles: a failed payment must not show as paid; an uncertain payment outcome must be checked before retry; a zero-challan fetch must be distinct from a failed or incomplete fetch; "assigned" ≠ "accepted" ≠ "paid".

**AI contribution (drafted from those inputs)**
- The six-stage end-to-end journey table.
- Two fictional scenarios, with sample vehicles, contacts, dates, amounts and references.
- The onboarding branch matrix and the challan-check states.
- The responsibility suggestion logic, operator actions, audit record and dispute route.
- A status model with five dimensions plus guarded closure, transitions, guards and consistency rules.
- 12 prioritised edge cases with prototype/future coverage, the screen coverage map, and the decision log.
- AI-proposed specifics that the designer has **not** yet reviewed: the 30-minute near-handover window (DL-07); allowing payment before responsibility is final (DL-06); a contest moving responsibility back to Needs review (DL-08); screen 6 as a view of the same challan (DL-10); the single review-before-add step (DL-11); the separate cost-recovery dimension.
- No external research, user data, quotes, metrics or legal conclusions were produced.

**Designer review:** *Pending.*

**Final decisions:** *Pending.* Every decision-log entry is either a working assumption pending final review or an AI proposal pending review.

## Step 3: Clickable prototype (17 Oct 2026)

**Tool:** Claude (Claude Code), from a prompt written by the designer. Claude also drove a real Chrome browser (Claude-in-Chrome) to verify the prototype.

**Inputs from the designer**
- Steps 1–2 documents.
- Six screens (Overview, Vehicles, Vehicle details, Challans, Challan details/responsibility, Payment & resolution) and the two scenarios (A: fleet handover `SAMPLE-F-0142`; B: leasing, discovered after the lease ended, `SAMPLE-L-0377`).
- Constraints:
  - React + TypeScript + Vite, run locally, **no deploy**.
  - One accent colour, text status labels, accessible, 1440px-first and usable at 1024px.
  - Simulated integrations only; no dead buttons; localStorage with reset.
  - An honest `/design-system` page.
  - No real payments, messages or personal data. No legal conclusions. No automatic liability decisions.

**AI contribution**
- All code in `src/`:
  - Data model, fictional seed data, matching logic, status labels.
  - Store and persistence.
  - Components and the six screens.
  - The coded design-system page and prototype controls.
- Interaction and copy decisions, all **pending designer review**:
  - Each metric links to a filtered list.
  - Evidence timeline on challan details.
  - Separate "Who is responsible?" / "Who pays the authority?" panels.
  - Payer locks once payment starts.
  - "Check payment status" required before retry after an unconfirmed outcome.
  - Recovery can be recorded or written off with a reason.
  - Close-case checklist.
  - Workspace auto-switch.
  - The CSV row statuses (Ready / Duplicate in file / Already added / Error).
- Browser verification and the fixes it led to, listed in [`03-prototype-guide.md` §7](03-prototype-guide.md#7-verification-done-17-oct-2026).
- [`03-prototype-guide.md`](03-prototype-guide.md): run instructions, walkthroughs, assumptions, limitations, outstanding deliverables.
- No external research, user data, metrics or legal conclusions were produced. Every person, organisation, registration and amount is fictional.

**Not produced by AI (still outstanding):** Figma design system (components, Auto Layout, variables), Figma screens, walkthrough video.

**Designer review:** *Pending.*

**Final decisions:** *Pending.* The designer has not yet reviewed or approved the prototype.

---

## Step 4: Prototype refinement (17 Oct 2026)

**Designer input:** a list of six review findings for the existing prototype (count consistency, unknown challan counts after failed checks, challan table readability, decision panel and evidence on challan details, a more compact dashboard, clearer terminology). The designer asked for targeted fixes only, with no new features and no deployment.

**AI contribution:** code and copy changes in `src/`, browser verification, and these doc updates. The full list is in [`03-prototype-guide.md` §8](03-prototype-guide.md#8-refinement-17-oct-2026). In summary:
- Shared selectors (`isNeedsReview`, `isUnresolved`, `isPaymentAttention`, `challanCountView`) now drive the dashboard, the sidebar and the list filters. The sidebar pill reads "N unresolved" because it includes suggested-but-unconfirmed challans.
- Vehicles now show "Not verified" when the challan count is unknown, or the known count marked "Earlier results · may be out of date" when the latest check failed. Earlier challans are never cleared by a failed check.
- Short action labels in tables, with full accessible names.
- A decision panel at the top of challan details: amount, violation time, holder or "Unclear · not preselected", and next action.
- A chronological evidence timeline. The conflicting handover note is shown as its own highlighted row.
- Compact dashboard cards. Status explanations moved into an expandable section.
- Terminology: "Responsibility dispute" replaces "internal contest". "Amount recovery" replaces "recovery", with a short explanation.

All of these are AI proposals, **pending designer review**. The sample note time (≈19:45) on `SAMPLE-F-0142` was added to the fictional seed data so the conflict could be shown.

**Designer review:** *Pending.*

**Final decisions:** *Pending.*

---

## Step 5: Visual refinement (17 Oct 2026)

**Designer input:** five visual references, with reference #3 as the primary direction, and a written brief covering tokens, the shell, lists, challan details, the assignment dialog, drawers, payment and the design system. The designer asked for visual refinement only: no rebuild, no new features, no deployment.

**AI contribution:**
- CSS token and component changes, shared list controls (`src/components/Filters.tsx`: status tabs, More filters, applied-filter chips), a fact strip, disclosure, a split dialog layout and drawer sections.
- Page-level layout changes on all six screens and `/design-system`.
- Browser verification and these notes. The full list is in [`03-prototype-guide.md` §9](03-prototype-guide.md#9-visual-refinement-17-oct-2026).

The references were used as inspiration for structure and hierarchy. No content, branding or imagery was copied. All visual choices are AI proposals, **pending designer review**. The `/design-system` page is coded CSS and does not replace the Figma design system deliverable.

**Designer review:** *Pending.*

**Final decisions:** *Pending.*

---

## Step 6: Operations workspace pass (17 Oct 2026)

**Designer input:** a written brief to make the prototype a compact B2B operations workspace. It covered:
- Dashboard metrics and the work queue; vehicle states and honest Excel support; vehicle detail tabs.
- Challan views and filters; a single decision summary with an exact handover sentence; the assignment dialog.
- Ordered payment steps; design-system states. No deployment.

**AI contribution:** code, copy and CSS changes in `src/`, a small `.xlsx` reader, browser verification at three widths, and these notes. The full list is in [`03-prototype-guide.md` §10](03-prototype-guide.md#10-operations-workspace-pass-17-oct-2026).

**What was not done by AI:** no user research, usability testing or legal review. Nothing in the prototype makes a liability decision automatically: record matches are shown as suggestions that an operator must confirm. All payments, checks and sources are simulated, and the data is fictional.

All changes are AI proposals, **pending designer review**. The Figma deliverables (components, variants, Auto Layout, variables, screens, walkthrough video) are still outstanding.


## Step 7: Navigation and workflow clarity pass (17 Oct 2026)

**Designer input:** a written brief to fix the journey through Vehicles and Challans. It covered:
- Contextual back links that keep list filters; confirmation and next steps after adding and checking vehicles.
- Clearer assignment and lease entry; action labels that match their outcomes.
- A clearer payment current step; the table clipping fix; browser verification of the journeys. No deployment.

**AI contribution:** code, copy and CSS in `src/` (a new `src/features/nav.tsx`, a simulated "challans found" outcome, minimal new driver/lessee entry), browser walkthroughs and these notes. The full list, the actual verification results and the limitations are in [`03-prototype-guide.md` §11](03-prototype-guide.md#11-navigation-and-workflow-clarity-pass-17-oct-2026).

**What was not done by AI:** no user research or usability testing. Nobody is assigned automatically: every responsibility decision still needs a person to choose and a reason. All checks, challans and payments are simulated, and the data is fictional.

All changes are AI proposals, **pending designer review**.

**Designer review:** *Pending.*

**Final decisions:** *Pending.*


## Step 8: Compact operations layout pass (17 Oct 2026)

**Designer input:**
- A written brief for a compact, ERP-style operational layout: one list surface, 36px controls, 40px headers, about 56px rows, and specific Vehicles and Challans columns with short action labels.
- It referred to an attached SunFrame ERP screenshot. **No screenshot was received**, so the AI worked from the text only.

**AI contribution:**
- Token, CSS and component changes in `src/`, column and label changes on Vehicles, Challans, Overview and vehicle details, and the `/design-system` update.
- Browser verification and these notes. Details and actual results are in [`03-prototype-guide.md` §12](03-prototype-guide.md#12-compact-operations-layout-pass-17-oct-2026).

**What was not done by AI:**
- No user research or usability testing.
- No automatic responsibility decisions: labels open the review and never confirm it.
- No pagination, and no records were added to fill tables.
- Checks and payments remain simulated, and all data is fictional. Not deployed.

All changes are AI proposals, **pending designer review**.

**Designer review:** *Pending.*

**Final decisions:** *Pending.*

## Step 9: Workflow review pass (17 Oct 2026)

**Designer input:**
- A written brief to fix the remaining workflow issues:
  - Payment vs source status, and the vehicle summary wording.
  - Browser tests of flows A–G.
  - Layout at 1440 and 1024.
- The brief said to keep demo data (no reset) and use disposable test records.

**AI contribution:**
- Code changes in `src/`: source-pending callout, re-check, filter, shared count wording, overlap marking, cross-tab sync, and 1024px table fit.
- Browser testing and the verification report in [`03-prototype-guide.md` §13](03-prototype-guide.md#13-workflow-review-pass-17-oct-2026).

**Assumption needing validation:** closing a case while the source update is pending is allowed provisionally. It is not a confirmed business or legal rule.

**What was not done by AI:**
- No user research.
- No legal conclusions.
- No automatic responsibility decisions.
- No real payments or messages.
- Not deployed.

All changes are AI proposals, **pending designer review**.

**Designer review:** *Pending.*

**Final decisions:** *Pending.*
