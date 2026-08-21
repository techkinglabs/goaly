# Fix Progress Graph: Cumulative Total Progress

## Problem
The progress graph must show **Total Progress** as a *cumulative sum* of daily progress
values, not the daily value plotted on its own. The backend already computes the cumulative
`totals` correctly, but the **frontend `ChartView`** does not render it:

- `ChartDataResponse` is `{ weekStart, goals: {...}, totals: {...} }` — `goals`/`totals` are
  **nested** maps keyed by `goal_<id>` / `total_<id>`.
- In `frontend/src/components/ChartView.tsx`, the **line chart** uses
  `dataKey={key}` (`goal_1`) and `dataKey={"total_"+goalId}` (`total_1`) directly on the raw
  `data` array. These keys are nested under `goals`/`totals`, so Recharts finds `undefined`
  for both lines. The cumulative line never renders.
- The **bar chart** (`barChartData`) reads `entry.totals[firstGoalKey]`, so it does show a
  cumulative value, but only for the *first* goal and is inconsistent with the line chart.

The example in the request (Mon..Sun each = 1, target 7 → cumulative 1,2,3,4,5,6,7) is
exactly what the backend `runningActual` cumulative produces; the frontend just fails to plot it.

## Root cause
`lineChartData` is the unmodified backend `data` array. The `Line` components reference
top-level keys (`goal_<id>`, `total_<id>`) that do not exist at the top level of the objects
(they are nested in `goals` / `totals`). Therefore neither the daily nor the cumulative line
renders with real values.

## Fix (frontend only — backend is already correct)
File: `frontend/src/components/ChartView.tsx`

1. Build a **flattened** dataset for the line chart so Recharts can resolve the dataKeys:
   ```ts
   const lineChartData = data
     .slice()
     .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
     .map(entry => {
       const flat: Record<string, number | string> = { weekStart: entry.weekStart };
       // daily progress per goal (top-level key goal_<id>)
       for (const [k, v] of Object.entries(entry.goals)) flat[k] = v;
       // cumulative total progress per goal (top-level key total_<id>)
       for (const [k, v] of Object.entries(entry.totals)) flat[`total_${k.replace('goal_', '')}`] = v;
       return flat;
     });
   ```
   This keeps the existing `allGoalKeys` logic (`goal_1` → `total_1`) working and makes the
   cumulative (`total_<id>`) line actually render.

2. Make the **bar chart** consistent with the line chart by deriving `totalProgress` from the
   same cumulative source. The current `entry.totals[firstGoalKey]` is fine, but ensure it reads
   the cumulative value (it does). No change required unless unifying datasets; optional: reuse
   `lineChartData` and read `total_${firstGoalKey}` instead of `entry.totals[...]`.

## Notes / verification
- The backend (`ChartDataService.java:38,44-46` for all goals; `:70,76-78` for single goal)
  already accumulates `runningActual` as a sum and divides by `target` to produce the cumulative
  percentage. No backend change needed.
- Verify the cumulative line is monotonically non-decreasing across the time axis and matches a
  running sum of the daily values (e.g., daily 1/7 → cumulative 14%, 28%, … , 100%).
- Run the frontend dev server / typecheck to confirm the `Line` dataKeys resolve (no `undefined`
  series) and the legend shows distinct daily vs. total lines.

## Open question (out of scope unless requested)
The request's example treats each day as a separate entry (target 7 over 7 days). The app currently
models **weekly** entries (`weekStartDate`). If the user truly wants *daily* granularity the data
model would need to change; the cumulative logic itself is already correct and this plan fixes the
rendering of that cumulative value.
