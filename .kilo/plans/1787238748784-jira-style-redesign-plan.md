# Jira-Style Redesign Plan

## Context
The current application uses a tabbed interface that lacks the "Master-Detail" workflow requested. The redesign aims to implement a Jira-style experience, primarily within the **Goals** view, which will feature a permanent split-pane layout (Left: Goal List, Right: Goal Details).

## Design Decisions

### 1. Layout & Navigation
- **Top Navigation**: Retain `Goals`, `Weekly Entries`, and `Charts` tabs.
- **Goals View (Redesigned)**: Implement a permanent split-pane view.
    - **Left Panel**: A slim, scrollable list of all goals.
    - **Right Panel**: The detailed workspace for the currently selected goal.

### 2. Goal List (Master)
- **Visuals**: Display concise info: Name, Active Status (color-coded), and a Progress Bar.
- **Selection**: Clicking a goal highlights it and updates the Right Panel.
- **Calculation**: Progress percentage is calculated on-the-fly in the frontend: `(sum of entries for this goal / targetValue) * 100`.

### 3. Goal Detail (Detail/Workspace)
- **Goal Info**: Name, description, target value, and unit.
- **Trend Graph**: A new local line chart using `recharts` that displays the historical progress trend of the *selected goal only*.
    - Data is derived by filtering the global `entries` state for entries matching the current goal's ID.
- **Recent Entries**: A list/table showing only the entries related to this specific goal.
- **Actions**: Integrated controls for:
    - Adding a new entry.
    - Editing the goal.
    - Deleting the goal.

### 4. Global Views (Unchanged)
- **Weekly Entries**: Remains a global table/list view of all entries.
- **Charts**: Remains a global analytics dashboard comparing all goals.

## Implementation Steps

### Phase 1: Refactor Layout in `App.tsx`
1.  Modify the `goals` tab rendering to use a flexbox container (`flex flex-row`) for the split-pane layout.
2.  Adjust CSS/Tailwind classes to support fixed or proportional widths for the side panel vs. detail view.

### Phase 2: Refactor `GoalList.tsx` (The "Master" component)
1.  Simplify the UI from a full card to a compact list item.
2.  Add logic to calculate and display a progress bar/percentage based on the passed `entries` or calculated data.
3.  Implement visual highlighting for the currently selected goal.

### Phase 3: Refactor `GoalDetail.tsx` (The "Workspace" component)
1.  Receive `entries` as an additional prop to facilitate local calculations and filtering.
2.  Implement a new, localized trend chart using `recharts`.
3.  Filter and display only the entries belonging to the selected goal in a "Recent Entries" section.

### Phase 4: Styling & Refinement
1.  Ensure consistent dark/light mode styling across the new split-pane layout.
2.  Refine hover states and selection indicators to mimic Jira's professional look.

## Validation Plan
1.  **Functional Test**: Verify that selecting a goal in the left panel immediately updates the right panel with specific data for that goal.
2.  **Data Integrity Test**: Check that the progress bar in `GoalList` matches the sum of entries divided by target value.
3.  **Chart Test**: Confirm the `GoalDetail` graph correctly displays historical entry values for only the selected goal.
4.  **Responsiveness Test**: Ensure the split-pane layout behaves reasonably on smaller screens (may stack visually).

## Risks & Dependencies
- **Frontend State Dependency**: The UI heavily relies on the relationship between `goals` and `entries`. Ensuring `App.tsx` passes both correctly is critical.
- **Performance**: For a very large number of entries, calculating progress on every render in the sidebar could impact performance; however, for typical user usage, this should be negligible.
