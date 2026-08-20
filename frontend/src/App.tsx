import React, { useState, useEffect } from 'react';
import GoalList from './components/GoalList';
import WeeklyEntryList from './components/WeeklyEntryList';
import ChartView from './components/ChartView';
import CreateGoalForm from './components/CreateGoalForm';
import EditGoalForm from './components/EditGoalForm';
import CreateWeeklyEntryForm from './components/CreateWeeklyEntryForm';
import EditWeeklyEntryForm from './components/EditWeeklyEntryForm';
import GoalDetail from './components/GoalDetail';
import type { Goal, WeeklyEntry, ChartDataResponse } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataResponse[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingEntry, setEditingEntry] = useState<WeeklyEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [error, setError] = useState<string | null>(null); // Global error state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null); // For Jira-style detail view

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Use fixed internal addresses for Docker containers in localhost environment
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      try {
        // Fetch goals from backend
        const goalsResponse = await fetch(`${baseUrl}/api/goals`);
        if (!goalsResponse.ok) {
          throw new Error(`Failed to fetch goals: ${goalsResponse.status} ${goalsResponse.statusText}`);
        }
        const fetchedGoals: Goal[] = await goalsResponse.json();
        setGoals(fetchedGoals);
        
        // Select first goal if available
        if (fetchedGoals.length > 0) {
          setSelectedGoal(fetchedGoals[0]);
        }
        
        // Fetch entries from backend
        const entriesResponse = await fetch(`${baseUrl}/api/entries`);
        if (!entriesResponse.ok) {
          throw new Error(`Failed to fetch entries: ${entriesResponse.status} ${entriesResponse.statusText}`);
        }
        const fetchedEntries: WeeklyEntry[] = await entriesResponse.json();
        setEntries(fetchedEntries);
        
        // Fetch chart data from backend
        const chartResponse = await fetch(`${baseUrl}/api/chart/data`);
        if (!chartResponse.ok) {
          throw new Error(`Failed to fetch chart data: ${chartResponse.status} ${chartResponse.statusText}`);
        }
        const fetchedChartData: ChartDataResponse[] = await chartResponse.json();
        setChartData(fetchedChartData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please check your connection and try again.');
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
    daysOfWeek?: string[];
  }) => {
    try {
      // Send new goal to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create goal: ${response.status} ${response.statusText}`);
      }
      
      const newGoal: Goal = await response.json();
      setGoals([...goals, newGoal]);
      
      // If this is the first goal, automatically select it
      if (goals.length === 0) {
        setSelectedGoal(newGoal);
      }
    } catch (err) {
      console.error('Error creating goal:', err);
      setError('Failed to create goal. Please try again.');
    }
  };

  const handleGoalEdit = async (updatedGoal: Omit<Goal, 'id'>) => {
    if (!editingGoal) return;
    
    // Extract only the fields that backend supports for now
    const backendCompatibleData = {
      name: updatedGoal.name,
      unit: updatedGoal.unit,
      targetValue: updatedGoal.targetValue,
      isActive: updatedGoal.isActive,
      description: updatedGoal.description,
      daysOfWeek: updatedGoal.daysOfWeek
    };
    
    try {
      // Send updated goal to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendCompatibleData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update goal: ${response.status} ${response.statusText}`);
      }
      
      const savedGoal: Goal = await response.json();
      // Update the goal in state
      setGoals(goals.map(goal => goal.id === savedGoal.id ? savedGoal : goal));
      setEditingGoal(null); // Close edit form
    } catch (err) {
      console.error('Error updating goal:', err);
      setError('Failed to update goal. Please try again.');
    }
  };

  const handleGoalDelete = async (id: number) => {
    // Ensure ID is valid before proceeding
    if (!id || isNaN(id)) {
      console.error('Invalid goal ID provided for deletion:', id);
      setError('Invalid goal ID provided');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      // Send delete request to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/goals/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete goal: ${response.status} ${response.statusText}`);
      }
      
      // Remove the goal from state
      setGoals(goals.filter(goal => goal.id !== id));
      if (selectedGoal?.id === id) {
        setSelectedGoal(null);
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal. Please try again.');
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
    weekStartDate: string;
    actualValue: number;
  }) => {
    try {
      // Send new entry to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create entry: ${response.status} ${response.statusText}`);
      }
      
      const savedEntry: WeeklyEntry = await response.json();
      setEntries([...entries, savedEntry]);
    } catch (err) {
      console.error('Error creating entry:', err);
      setError('Failed to create entry. Please try again.');
    }
  };

  const handleEntryEdit = async (updatedEntry: Omit<WeeklyEntry, 'id'>) => {
    if (!editingEntry) return;
    
    try {
      // Send updated entry to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEntry),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update entry: ${response.status} ${response.statusText}`);
      }
      
      const savedEntry: WeeklyEntry = await response.json();
      // Update the entry in state
      setEntries(entries.map(entry => entry.id === savedEntry.id ? savedEntry : entry));
      setEditingEntry(null); // Close edit form
    } catch (err) {
      console.error('Error updating entry:', err);
      setError('Failed to update entry. Please try again.');
    }
  };

  const handleEntryDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }
    
    try {
      // Send delete request to backend
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8081' 
        : '/api';
        
      const response = await fetch(`${baseUrl}/api/entries/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete entry: ${response.status} ${response.statusText}`);
      }
      
      // Remove entry from state
      setEntries(entries.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry. Please try again.');
    }
  };

  const handleEditEntry = (entry: WeeklyEntry) => {
    setEditingEntry(entry);
  };

  const cancelEditEntry = () => {
    setEditingEntry(null);
  };

  // Function to handle selecting a goal for detail view
  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    // We don't change tab here to maintain the split-pane layout
  };

  return (
    <div className={isDarkMode ? 'dark min-h-screen bg-gray-900' : 'min-h-screen bg-gray-50'}>
      <header className={isDarkMode ? 'bg-gray-800 text-white p-4 shadow-md' : 'bg-blue-600 text-white p-4 shadow-md'}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Weekly Progress Tracker</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreateGoalModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200 text-sm"
            >
              Create Goal
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 text-yellow-300' : 'bg-blue-500 text-white'}`}
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

      <nav className={isDarkMode ? 'bg-gray-800 shadow-sm' : 'bg-white shadow-sm'}>
        <div className="container mx-auto">
          <div className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('goals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'goals' || activeTab === 'details' ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600') : (isDarkMode ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}`}
            >
              Goals
            </button>
            <button 
              onClick={() => setActiveTab('entries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'entries' ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600') : (isDarkMode ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}`}
            >
              Weekly Entries
            </button>
            <button 
              onClick={() => setActiveTab('charts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'charts' ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600') : (isDarkMode ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}`}
            >
              Charts
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'goals' && (
              <div className="flex flex-row h-[calc(100vh-200px)] space-x-4">
                <div className="w-1/3 border-r dark:border-gray-700 overflow-y-auto p-4">
                  <div className="flex justify-between items-center mb-6">
                  </div>
                  
                  {editingGoal ? (
                    <EditGoalForm 
                      goal={editingGoal} 
                      onSubmit={handleGoalEdit} 
                      onCancel={handleCancelEdit} 
                    />
                  ) : null}
                  
                  <GoalList goals={goals} onEdit={handleEditGoal} onDelete={handleGoalDelete} onSelect={handleSelectGoal} entries={entries} />
                </div>
                
                <div className="w-2/3 overflow-y-auto p-4">
                  {selectedGoal ? (
                    <GoalDetail
                      goal={selectedGoal}
                      goals={goals}
                      onSubmit={handleEntrySubmit}
                      onEditEntry={handleEditEntry}
                      onDeleteEntry={handleEntryDelete}
                      entries={entries}
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-full flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Select a goal to view details</p>
                    </div>
                  )}

                  {editingEntry ? (
                    <EditWeeklyEntryForm
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Weekly Entries</h2>
                  <CreateWeeklyEntryForm goals={goals} onSubmit={handleEntrySubmit} />
                </div>
                
                {editingEntry ? (
                  <EditWeeklyEntryForm 
                    entry={editingEntry} 
                    goals={goals.map(g => ({id: g.id, name: g.name}))}
                    onSubmit={handleEntryEdit} 
                    onCancel={cancelEditEntry} 
                  />
                ) : null}
                
                <WeeklyEntryList 
                  entries={entries} 
                  goals={goals} 
                  onEdit={handleEditEntry}
                  onDelete={handleEntryDelete}
                />
              </div>
            )}

            {activeTab === 'charts' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Progress Charts</h2>
                <ChartView data={chartData} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Goal Modal */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Goal</h3>
                <button 
                  onClick={() => setShowCreateGoalModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

      <footer className={isDarkMode ? 'bg-gray-800 border-t border-gray-700 mt-8 py-6' : 'bg-gray-100 border-t mt-8 py-6'}>
        <div className="container mx-auto text-center text-gray-600">
          <p>Weekly Progress Tracker &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;