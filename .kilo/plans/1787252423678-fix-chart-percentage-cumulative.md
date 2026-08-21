# Fix Chart: Calculate Everything in Percentage, Total = Cumulative Sum of Weekly Percentages

## Goal
Fix the progress chart so that:
1. **All values are percentages** (already the case on the backend, but confirm/keep).
2. **Total progress = running sum of the per-week progress percentages** (NOT cumulative
   actuals ÷ target). The user explicitly chose this interpretation, so the backend
   calculation must change.

This differs from the previous plan (`.kilo/plans/1787251558447-fix-cumulative-progress-graph.md`),
which assumed total = sum(actuals)/target. That assumption is now superseded.

## Current behavior (defect)
`backend/.../service/ChartDataService.java`:
- `goals` (per-week %): `actual / entry.target * 100` — correct, already a percentage.
- `totals` (current): `runningActual (sum of raw actuals) / goal.target * 100`.

The new requirement is: `total_<id>` at week N = `Σ (goal_% at weeks 1..N)` i.e. the running
sum of the *weekly percentages* themselves. This can exceed 100% (acceptable per user choice).

Additionally the **frontend** `ChartView.tsx` never flattens the nested `goals`/`totals` maps,
so the lines render `undefined`. This must also be fixed.

## Changes

### 1. Backend — `ChartDataService.java`
Replace the `runningActual` (raw-value accumulator) with a **percentage accumulator**:
- `getChartDataForAllGoals()` (lines 30, 38, 44-46):
  - Change `Map<Long, Double> runningActual` to accumulate *percentage*, not raw actual.
  - Per week: compute `double weekPct = calculatePercentage(entry);`
  - `runningPct.merge(id, weekPct, Double::sum);`
  - Store `weekData.put(goalKey, weekPct);`
  - `weekData.put("total_"+id, runningPct.get(id));`  // sum of per-week percentages
- `getChartDataForGoal()` (lines 63, 70, 76-78):
  - Change `double runningActual = 0.0;` to `double runningPct = 0.0;`
  - `double weekPct = calculatePercentage(entry);`
  - `runningPct += weekPct;`
  - `weekData.put(goalKey, weekPct);`
  - `weekData.put("total_"+goalId, runningPct);`
- `calculatePercentage(WeeklyEntry)` (lines 84-89) can be reused unchanged — it already returns a %.

No change needed to `ChartDataResponse.java`, `ChartController.java`, or `types/index.ts`
(the shape `{ weekStart, goals: Record<string,Double>, totals: Record<string,Double> }` is unchanged;
values are still numbers/Doubles representing percentages).

### 2. Frontend — `frontend/src/components/ChartView.tsx`
Fix flattening so Recharts resolves the nested keys (this is where the chart is currently broken):

- Replace the `lineChartData` mapping (lines 23-33) with correct flattening. NOTE the previous
  plan's snippet is buggy — `entry.totals` is already keyed `total_<id>`, so do NOT re-prefix.
  Correct version:
  ```ts
  const lineChartData = data
    .slice()
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
    .map(entry => {
      const flat: Record<string, number | string> = { weekStart: entry.weekStart };
      for (const [k, v] of Object.entries(entry.goals)) flat[k] = v;     // goal_<id>
      for (const [k, v] of Object.entries(entry.totals)) flat[k] = v;     // total_<id>
      return flat;
    });
  ```
- The existing `allGoalKeys` + line `dataKey={key}` / `dataKey={`total_${goalId}`}` logic
  (lines 36-85) then works correctly: `goal_1` and `total_1` now exist at the top level.
- Bar chart (lines 42-46): derive from the same flattened source for consistency:
  ```ts
  const barChartData = lineChartData.map(entry => ({
    name: entry.weekStart,
    progress: firstGoalKey ? (entry[firstGoalKey] ?? 0) : 0,
    totalProgress: firstGoalKey ? (entry[`total_${firstGoalKey.replace('goal_','')}`] ?? 0) : 0
  }));
  ```
- Y-axis is percentage by nature; values may exceed 100% (acceptable). Optionally cap-axis
  label, but no hard cap on data.

## Files touched
- `backend/src/main/java/org/example/service/ChartDataService.java` (calculation change)
- `frontend/src/components/ChartView.tsx` (flattening fix)

## Verification
- Backend: with entries where week1 actual/target = 1/7 (≈14.3%) and week2 = 1/7, the `total_`
  for week2 must be ≈28.6% (14.3 + 14.3), not 28.6% of a re-divided cumulative. Confirm a
  monotonic non-decreasing `total_` line and that it equals the running sum of `goal_`.
- Frontend: run `npm run build` / typecheck; load chart and confirm BOTH the daily (`goal_<id>`)
  and total (`total_<id>`) lines render real numbers (no undefined series) and the legend shows
  distinct Progress vs Total entries for each goal.
- Manual smoke test via backend curl: `GET /api/chart/data` returns per-goal percentages and
  totals that are the running sum of those percentages.

## Open questions / notes
- Totals can exceed 100% by design (sum of percentages). If a visual cap is desired later, do it
  in the chart axis only, not in the data.
- The larger review.md findings (missing Goal fields, error handling) are out of scope for this task.
