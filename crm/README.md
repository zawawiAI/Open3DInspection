# Inspection Escalation CRM

A browser-based CRM for managing inspection reports with an **automatic
escalation chain**: when the assigned technician can't repair, declines, or
misses the SLA deadline, the report is automatically routed to the **next
available person** in the chain.

## The escalation idea

Every report is assigned to a technician. Technicians sit in an ordered chain
by **tier** (tier 1 first). At any point a report can be:

- **Resolved** by the current assignee, or
- **Escalated** because they *cannot repair*, *decline*, or the **SLA timer runs out**.

When escalated, the system finds the **next available technician** who hasn't
already been tried, gives them a fresh SLA window, and records everything in the
activity log. If the chain is exhausted, the report is flagged **Unresolved**
for manual attention.

```
Tier 1 (Aisha)  ──cannot repair──▶  Tier 1 (Marcus)  ──timeout──▶  Tier 2 (Diego)  ──▶ ... ──▶ Unresolved
```

## Features

- **Auto-routing** to the lowest-tier available technician on create and on every escalation.
- **SLA timers** per severity (critical 4h, high 24h, medium 72h, low 168h). Overdue reports auto-escalate on a 60-second sweep.
- **Escalation chain visualization** showing who's current, who was tried, who's next, and who's unavailable.
- **Team management**: add/remove people, set tier order, toggle availability (unavailable people are skipped).
- **Activity log** with comments per report.
- **Filters & search**: open / unresolved / in-progress / resolved / overdue.
- **Local persistence** (localStorage) plus JSON **export/import** and a **demo reset**.

## Getting started

```bash
npm install
npm run dev
```

Opens at http://localhost:5174. The app ships with seeded demo data
(5 technicians, 4 reports) so you can try escalation immediately.

> Tip: set a report's severity to **critical** (4h SLA) or open one of the
> already-overdue seeded reports, then watch the auto-escalation sweep route it
> down the chain. You can also click **Can't repair / escalate** to do it manually.

Build for production:

```bash
npm run build && npm run preview
```

## How to use

1. **+ New report** — fill in details and severity; it's auto-assigned to the first available tier-1 tech.
2. Open a report to see its **escalation chain**, SLA, and actions.
3. As the assignee: **Start repair → Mark resolved**, or **Can't repair / escalate** to pass it on.
4. **Verify & close** resolved reports, or **Reopen & reassign** if needed.
5. In **Team**, reorder tiers and flip availability — routing respects both instantly.

## Tech stack

- Vite + React + TypeScript
- [zustand](https://github.com/pmndrs/zustand) store with localStorage persistence
- No backend — everything runs in the browser

## Project structure

```
src/
  lib/
    escalation.ts   core engine: next-available routing, SLA, escalate()
    seed.ts         demo technicians + reports
    format.ts       time-ago / due labels
  store/useCrmStore.ts   actions + persistence + auto-escalation sweep
  components/
    ReportList.tsx       filterable list of reports
    ReportDetail.tsx     facts, actions, escalation box
    EscalationChain.tsx  chain visualization
    ActivityFeed.tsx     log + comments
    TeamPanel.tsx        roster, tiers, availability
    NewReportModal.tsx   create report
    Badges.tsx           severity/status/escalation badges
  types.ts
```

## Connecting the 3D annotator (future)

The `Report` model has a `source` field (`'manual' | 'annotator'`). To feed
inspection comments from the sibling 3D annotator app, map each annotation to a
report (title/body/location) and call the store's `createReport`, or import a
batch via the JSON **Import**.
```
