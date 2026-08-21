# Fix Chart: Progress + Total Progress

## Context

The chart (`ChartView.tsx`) visualizes weekly progress. Requirements:
- **Progress** = the actual progress **per Entry**, shown as a RAW percentage (`actualValue / targetValue * 100`). The backend already computes this per goal per week in `ChartDataService.calculatePercentage` and the line chart already plots it correctly (one line per goal).
- **Total Progress** = cumulative **sum of actual values** of all entries up to each date, divided by the cumulative **sum of target values** up to that date, expressed in the same percentage format as Progress. It must be shown per goal (one cumulative line per goal alongside that goal's raw Progress line).

Current problems:
1. The **bar chart** (`Weekly Progress Comparison`) only takes `Object.values(entry.goals)[0]` — the first goal only, ignoring all others. It also references a nonexistent `progress` field (review.md HIGH issue). It needs rework to show the same Progress/Total concept.
2. **Total Progress** is not computed or sent anywhere in the backend (`ChartDataResponse` carries only per-goal percentage under `goal_<id>` keys).

## Decisions

- Total Progress = `(sum of actualValue up to week) / (sum of targetValue up to week) * 100`, per goal, computed in chronological order.
- Charts: line chart shows, per goal, two lines — `goal_<id>` (Progress, raw %) and `total_<id>` (Total Progress, cumulative %). Bar chart rebuilt to compare Progress vs Total Progress per week (summarized using a single selected goal or aggregated — see Open Question). For initial implementation, bar chart uses the same per-goal data with two bars (Progress / Total Progress).
- Reuse existing percentage format. No new percentage semantics.

## Changes

### Backend

**`backend/src/main/java/org/example/dto/ChartDataResponse.java`**
- Add `Map<String, Double> totals` (key = `total_<goalId>`) alongside existing `goals` map. Keep `weekStart` and `goals` unchanged.

**`backend/src/main/java/org/example/service/ChartDataService.java`**
- In `getChartDataForAllGoals()` and `getChartDataForGoal(...)`: after grouping per week, sort week start dates chronologically and compute, per goal, a running cumulative `actualValue` and `targetValue`. For each week store:
  - `goal_<id>` = raw percentage (`calculatePercentage`).
  - `total_<id>` = cumulative actual / cumulative target * 100 (guard divide-by-zero -> 0.0).
- Apply same `goal_`-prefixed filter in the controller for both `goals` and `totals` maps.

**`backend/src/main/java/org/example/controller/ChartController.java`**
- Build `ChartDataResponse` with both `goals` (existing filtered map) and `totals` (new filtered `total_` map).

### Frontend

**`frontend/src/types/index.ts`**
- Extend `ChartDataResponse` with `totals: Record<string, number>`.

**`frontend/src/components/ChartView.tsx`**
- Line chart: for each goal key, render two `<Line>`: one `dataKey="goal_<id>"` (Progress) and one `dataKey="total_<id>"` (Total Progress), with distinct names/colors (e.g., Progress solid, Total dashed or different hue).
- Bar chart: replace the `Object.values(...)[0]` hack. Build `barChartData` per week with two values pulled from `entry.goals[firstGoalKey]` and `entry.totals[firstGoalKey]` (or aggregate). Render two `<Bar>`: `progress` and `totalProgress`.
- Use `goals` and `totals` maps explicitly; remove reliance on any `progress` field.

## Open Question (non-blocking)
Bar chart currently shows a single goal's value. Decide whether the bar chart should (a) follow the selected goal, (b) show the first goal, or (c) aggregate all goals. Default to showing the first available goal (current behavior) unless a `selectedGoal` is wired in. Will match line chart's per-goal semantics.

## Validation
- Restart backend (`backend`) and frontend (`frontend`); open Charts tab.
- Verify line chart shows two lines per goal (Progress + Total Progress) in %.
- Verify Total Progress is non-decreasing per goal over time and equals raw % in the first week.
- Verify bar chart shows two bars (Progress / Total Progress) with no `undefined`.
- Confirm no console errors; data comes from `/api/chart/data`.
