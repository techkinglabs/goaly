import React, { useState, useEffect } from 'react';
import GoalList from './components/GoalList';
import DailyEntryList from './components/DailyEntryList';
import ChartView from './components/ChartView';
import CreateGoalForm from './components/CreateGoalForm';
import EditGoalForm from './components/EditGoalForm';
import CreateDailyEntryForm from './components/CreateDailyEntryForm';
import EditDailyEntryForm from './components/EditDailyEntryForm';
import GoalDetail from './components/GoalDetail';
import { apiGet, apiSend, ApiError } from './api';
import type { Goal, DailyEntry, ChartDataResponse } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataResponse[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [error, setError] = useState<string | null>(null); // Global error state
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null); // For Jira-style detail view

  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const [chartRange, setChartRange] = useState<string>('week');

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const loadGoals = async (filter: 'all' | 'active' | 'inactive' = 'active') => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('active', filter === 'active' ? 'true' : 'false');
    const fetchedGoals = await apiGet<Goal[]>(`/api/goals${params.toString() ? `?${params.toString()}` : ''}`);
    setGoals(fetchedGoals);
    setSelectedGoalId((prev) => {
      if (prev != null && fetchedGoals.some((g) => g.id === prev)) return prev;
      return fetchedGoals.length > 0 ? fetchedGoals[0].id : null;
    });
  };

  const refreshChart = async (range: string, anchor: string) => {
    try {
      const params = new URLSearchParams({ range });
      if (anchor) params.set('anchor', anchor);
      const fetchedChartData = await apiGet<ChartDataResponse[]>(`/api/chart/data?${params.toString()}`);
      setChartData(fetchedChartData);
    } catch (err) {
      console.error('Error loading chart data:', err);
    }
  };

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fetchedGoals = await apiGet<Goal[]>(`/api/goals?active=true`);
        setGoals(fetchedGoals);

        if (fetchedGoals.length > 0) {
          setSelectedGoalId(fetchedGoals[0].id);
        }

        const fetchedEntries = await apiGet<DailyEntry[]>('/api/entries');
        setEntries(fetchedEntries);

        const fetchedChartData = await apiGet<ChartDataResponse[]>('/api/chart/data');
        setChartData(fetchedChartData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof ApiError
          ? `Failed to load data: ${err.message}`
          : 'Failed to load data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleGoalSubmit = async (goalData: {
    name: string;
    unit: string;
    targetValue: number;
    isActive: boolean;
    description?: string;
  }) => {
    try {
      const newGoal: Goal = await apiSend<Goal>('/api/goals', 'POST', goalData);
      setGoals((prev) => [...prev, newGoal]);

      if (goals.length === 0) {
        setSelectedGoalId(newGoal.id);
      }
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err instanceof ApiError ? `Failed to create goal: ${err.message}` : 'Failed to create goal. Please try again.');
    }
  };

  const handleGoalEdit = async (updatedGoal: Omit<Goal, 'id'>) => {
    if (!editingGoal) return;

    const backendCompatibleData = {
      name: updatedGoal.name,
      unit: updatedGoal.unit,
      targetValue: updatedGoal.targetValue,
      isActive: updatedGoal.isActive,
      description: updatedGoal.description,
      period: updatedGoal.period,
      amountPerPeriod: updatedGoal.amountPerPeriod
    };

    try {
      const savedGoal: Goal = await apiSend<Goal>(`/api/goals/${editingGoal.id}`, 'PUT', backendCompatibleData);
      setGoals((prev) => prev.map((goal) => (goal.id === savedGoal.id ? savedGoal : goal)));
      setEditingGoal(null); // Close edit form
    } catch (err) {
      console.error('Error updating goal:', err);
      setError(err instanceof ApiError ? `Failed to update goal: ${err.message}` : 'Failed to update goal. Please try again.');
    }
  };

  const handleGoalDelete = async (id: number) => {
    if (!id || isNaN(id)) {
      console.error('Invalid goal ID provided for deletion:', id);
      setError('Invalid goal ID provided');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      await apiSend<void>(`/api/goals/${id}`, 'DELETE');

      setGoals((prev) => prev.filter((goal) => goal.id !== id));
      setSelectedGoalId((prev) => (prev === id ? null : prev));
      setEditingGoal((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err instanceof ApiError ? `Failed to delete goal: ${err.message}` : 'Failed to delete goal. Please try again.');
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
  };

  const handleEntrySubmit = async (entryData: {
    goalId: number;
    entryDate: string;
    actualValue: number;
    note?: string | null;
  }) => {
    try {
      const savedEntry: DailyEntry = await apiSend<DailyEntry>('/api/entries', 'POST', entryData);
      setEntries((prev) => [...prev, savedEntry]);
    } catch (err) {
      console.error('Error creating entry:', err);
      setError(err instanceof ApiError ? `Failed to create entry: ${err.message}` : 'Failed to create entry. Please try again.');
    }
  };

  const handleEntryEdit = async (updatedEntry: Omit<DailyEntry, 'id'>) => {
    if (!editingEntry) return;

    try {
      const savedEntry: DailyEntry = await apiSend<DailyEntry>(`/api/entries/${editingEntry.id}`, 'PUT', updatedEntry);
      setEntries((prev) => prev.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry)));
      setEditingEntry(null); // Close edit form
    } catch (err) {
      console.error('Error updating entry:', err);
      setError(err instanceof ApiError ? `Failed to update entry: ${err.message}` : 'Failed to update entry. Please try again.');
    }
  };

  const handleInlineEntryUpdate = async (id: number, updates: { goalId: number; entryDate: string; actualValue: number; targetValue: number; note?: string | null }) => {
    try {
      const savedEntry: DailyEntry = await apiSend<DailyEntry>(`/api/entries/${id}`, 'PUT', updates);
      setEntries((prev) => prev.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry)));
    } catch (err) {
      console.error('Error updating entry:', err);
      setError(err instanceof ApiError ? `Failed to update entry: ${err.message}` : 'Failed to update entry. Please try again.');
    }
  };

  const handleEntryDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await apiSend<void>(`/api/entries/${id}`, 'DELETE');
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError(err instanceof ApiError ? `Failed to delete entry: ${err.message}` : 'Failed to delete entry. Please try again.');
    }
  };

  const handleEditEntry = (entry: DailyEntry) => {
    setEditingEntry(entry);
  };

  const cancelEditEntry = () => {
    setEditingEntry(null);
  };

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoalId(goal.id);
    // We don't change tab here to maintain the split-pane layout
  };

  return (
    <div className={isDarkMode ? 'dark min-h-screen flex flex-col' : 'min-h-screen flex flex-col'}>
      <header className="header">
        <div className="container-app flex justify-between items-center">
          <h1 className="text-2xl font-bold">Personal Progress Tracker</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-blue-500/30 text-yellow-300 hover:bg-blue-500/50' : 'bg-white/15 text-white hover:bg-white/25'}`}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

    <nav className="nav">
      <div className="container-app">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('goals')}
            className={`nav-tab ${activeTab === 'goals' || activeTab === 'details' ? 'active' : ''}`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('entries')}
            className={`nav-tab ${activeTab === 'entries' ? 'active' : ''}`}
          >
            Daily Entries
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`nav-tab ${activeTab === 'charts' ? 'active' : ''}`}
          >
            Charts
          </button>
        </div>
      </div>
    </nav>

      <main className="container-app py-8 flex-grow">
        {error && (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-[var(--text-muted)]">Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'goals' && (
              <div className="flex flex-row h-[calc(100vh-200px)] space-x-4">
                <div className="w-1/3 overflow-y-auto p-4 pane">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                      {(['active', 'inactive', 'all'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => { setGoalFilter(f); loadGoals(f); }}
                          className={goalFilter === f ? 'btn btn-primary' : 'btn btn-secondary'}
                        >
                          {f === 'active' ? 'Active' : f === 'inactive' ? 'Inactive' : 'All'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowCreateGoalModal(true)}
                      className="btn btn-primary ml-auto flex items-center justify-center text-lg"
                      aria-label="Create Goal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>

                  {editingGoal ? (
                    <EditGoalForm
                      goal={editingGoal}
                      onSubmit={handleGoalEdit}
                      onCancel={handleCancelEdit}
                    />
                  ) : null}

                  <GoalList goals={goals} selectedGoalId={selectedGoalId} onEdit={handleEditGoal} onDelete={handleGoalDelete} onSelect={handleSelectGoal} entries={entries} />
                </div>

                <div className="w-2/3 overflow-y-auto p-4 pane-detail">
                  {selectedGoal ? (
                    <GoalDetail
                      goal={selectedGoal}
                      goals={goals}
                      onSubmit={handleEntrySubmit}
                      onUpdateEntry={handleInlineEntryUpdate}
                      onEditEntry={handleEditEntry}
                      onDeleteEntry={handleEntryDelete}
                      entries={entries}
                      isDarkMode={isDarkMode}
                      onGoalUpdated={(updated) => setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
                    />
                  ) : (
                    <div className="empty-state h-full flex items-center justify-center p-6">
                      <p>Select a goal to view details</p>
                    </div>
                  )}

                  {editingEntry ? (
                    <EditDailyEntryForm
                      entry={editingEntry}
                      goals={goals.map(g => ({ id: g.id, name: g.name }))}
                      onSubmit={handleEntryEdit}
                      onCancel={cancelEditEntry}
                    />
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === 'entries' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <h2 className="text-xl font-semibold">Daily Entries</h2>
                  <button
                    onClick={() => setShowCreateEntryModal(true)}
                    className="btn btn-primary flex items-center justify-center"
                    aria-label="Add Entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                    Add
                  </button>
                </div>

                {editingEntry ? (
                  <EditDailyEntryForm
                    entry={editingEntry}
                    goals={goals.map(g => ({id: g.id, name: g.name}))}
                    onSubmit={handleEntryEdit}
                    onCancel={cancelEditEntry}
                  />
                ) : null}

                <DailyEntryList
                  entries={entries}
                  goals={goals}
                  onEdit={handleEditEntry}
                  onDelete={handleEntryDelete}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <div>
                <div className="flex flex-wrap items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Progress Charts</h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(['7d', '30d', '365d', 'week', 'year', 'all'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => { setChartRange(r); refreshChart(r, ''); }}
                        className={chartRange === r ? 'btn btn-primary' : 'btn btn-secondary'}
                      >
                        {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : r === '365d' ? 'Last 365 days' : r === 'week' ? 'This Week' : r === 'year' ? 'This Year' : 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                <ChartView data={chartData} isDarkMode={isDarkMode} goals={goals} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Goal Modal */}
      {showCreateGoalModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Escape') setShowCreateGoalModal(false); }}
        >
          <div className="surface rounded-xl shadow-lg w-full max-w-md border border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create New Goal</h3>
                <button
                  onClick={() => setShowCreateGoalModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CreateGoalForm onSubmit={(goalData) => {
                handleGoalSubmit(goalData);
                setShowCreateGoalModal(false);
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Create Entry Modal */}
      {showCreateEntryModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Escape') setShowCreateEntryModal(false); }}
        >
          <div className="surface rounded-xl shadow-lg w-full max-w-md border border-[var(--border)]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Add Entry</h3>
                <button
                  onClick={() => setShowCreateEntryModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CreateDailyEntryForm goals={goals} onSubmit={(entryData) => {
                handleEntrySubmit(entryData);
                setShowCreateEntryModal(false);
              }} />
            </div>
          </div>
        </div>
      )}

      <footer className="footer mt-auto py-6">
        <div className="container-app text-center">
          <p>Personal Progress Tracker &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
