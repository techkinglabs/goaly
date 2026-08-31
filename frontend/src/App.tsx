import React, { useCallback, useState } from 'react';
import AppFooter from './components/layout/AppFooter';
import AppHeader from './components/layout/AppHeader';
import AppNav, { type TabId } from './components/layout/AppNav';
import ChartsView from './components/views/ChartsView';
import EntriesView from './components/views/EntriesView';
import GoalsView from './components/views/GoalsView';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ErrorState, LoadingState } from './components/ui/StatusStates';
import { useConfirm } from './components/ui/ConfirmProvider';
import { useAsyncAction } from './hooks/useAsyncAction';
import { useDarkMode } from './hooks/useDarkMode';
import { useEntries } from './hooks/useEntries';
import { useGoalSelection } from './hooks/useGoalSelection';
import { useGoals } from './hooks/useGoals';
import { getErrorMessage } from './lib/http';
import type { ChartRange, DailyEntryPayload, Goal, GoalFilter, GoalPayload } from './types';

/**
 * Composition root. All data access lives in hooks, all HTTP in services, and
 * each tab is its own component — App only wires them together.
 */
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('goals');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('active');
  const [chartRange, setChartRange] = useState<ChartRange>('week');

  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const confirm = useConfirm();
  const runAction = useAsyncAction();

  const {
    goals,
    isLoading: isLoadingGoals,
    error: goalsError,
    refetch: refetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    isCreating: isCreatingGoal,
    isUpdating: isUpdatingGoal,
    deletingId: deletingGoalId,
    syncGoal,
  } = useGoals(goalFilter);

  const {
    entries,
    totalsByGoalId,
    weekTotalsByGoalId,
    isLoading: isLoadingEntries,
    error: entriesError,
    refetch: refetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    isCreating: isCreatingEntry,
    isUpdating: isUpdatingEntry,
    deletingId: deletingEntryId,
  } = useEntries();

  const { selectedGoal, selectedGoalId, selectGoal } = useGoalSelection(goals);

  const handleCreateGoal = useCallback(
    (payload: GoalPayload) =>
      runAction(() => createGoal(payload), {
        errorMessage: 'Failed to create goal',
        successMessage: 'Goal created',
      }),
    [runAction, createGoal]
  );

  const handleUpdateGoal = useCallback(
    (id: number, payload: GoalPayload) =>
      runAction(() => updateGoal({ id, payload }), {
        errorMessage: 'Failed to update goal',
        successMessage: 'Goal updated',
      }),
    [runAction, updateGoal]
  );

  const handleDeleteGoal = useCallback(
    async (id: number) => {
      const confirmed = await confirm({
        title: 'Delete goal',
        message:
          'Are you sure you want to delete this goal? Its entries will no longer be shown.',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;

      await runAction(() => deleteGoal(id), {
        errorMessage: 'Failed to delete goal',
        successMessage: 'Goal deleted',
      });
    },
    [confirm, runAction, deleteGoal]
  );

  const handleCreateEntry = useCallback(
    (payload: DailyEntryPayload) =>
      runAction(() => createEntry(payload), {
        errorMessage: 'Failed to create entry',
        successMessage: 'Entry added',
      }),
    [runAction, createEntry]
  );

  const handleUpdateEntry = useCallback(
    (id: number, payload: DailyEntryPayload) =>
      runAction(() => updateEntry({ id, payload }), {
        errorMessage: 'Failed to update entry',
        successMessage: 'Entry updated',
      }),
    [runAction, updateEntry]
  );

  const handleDeleteEntry = useCallback(
    async (id: number) => {
      const confirmed = await confirm({
        title: 'Delete entry',
        message: 'Are you sure you want to delete this entry?',
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!confirmed) return;

      await runAction(() => deleteEntry(id), {
        errorMessage: 'Failed to delete entry',
        successMessage: 'Entry deleted',
      });
    },
    [confirm, runAction, deleteEntry]
  );

  const handleGoalUpdated = useCallback((goal: Goal) => syncGoal(goal), [syncGoal]);

  const isInitialLoading = isLoadingGoals || isLoadingEntries;
  const loadError = goalsError ?? entriesError;

  const retry = useCallback(() => {
    void refetchGoals();
    void refetchEntries();
  }, [refetchGoals, refetchEntries]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} />
      <AppNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container-app flex-grow py-8">
        {loadError ? (
          <ErrorState
            message={`Failed to load data: ${getErrorMessage(loadError)}`}
            onRetry={retry}
          />
        ) : null}

        {isInitialLoading ? (
          <LoadingState message="Loading data…" />
        ) : (
          <ErrorBoundary boundaryName={`tab-${activeTab}`}>
            {activeTab === 'goals' ? (
              <GoalsView
                goals={goals}
                entries={entries}
                totalsByGoalId={totalsByGoalId}
                weekTotalsByGoalId={weekTotalsByGoalId}
                selectedGoal={selectedGoal}
                selectedGoalId={selectedGoalId}
                goalFilter={goalFilter}
                isDarkMode={isDarkMode}
                onFilterChange={setGoalFilter}
                onSelectGoal={selectGoal}
                onCreateGoal={handleCreateGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onCreateEntry={handleCreateEntry}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onGoalUpdated={handleGoalUpdated}
                isCreatingGoal={isCreatingGoal}
                isUpdatingGoal={isUpdatingGoal}
                deletingGoalId={deletingGoalId}
                isMutatingEntry={isCreatingEntry || isUpdatingEntry}
                deletingEntryId={deletingEntryId}
              />
            ) : null}

            {activeTab === 'entries' ? (
              <EntriesView
                entries={entries}
                goals={goals}
                onCreateEntry={handleCreateEntry}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                isCreating={isCreatingEntry}
                isUpdating={isUpdatingEntry}
                deletingEntryId={deletingEntryId}
              />
            ) : null}

            {activeTab === 'charts' ? (
              <ChartsView
                goals={goals}
                isDarkMode={isDarkMode}
                range={chartRange}
                onRangeChange={setChartRange}
              />
            ) : null}
          </ErrorBoundary>
        )}
      </main>

      <AppFooter />
    </div>
  );
};

export default App;
