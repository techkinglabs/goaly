import React, { useState, useEffect } from 'react';
import GoalList from './components/GoalList';
import WeeklyEntryList from './components/WeeklyEntryList';
import ChartView from './components/ChartView';
import CreateGoalForm from './components/CreateGoalForm';
import EditGoalForm from './components/EditGoalForm';
import CreateWeeklyEntryForm from './components/CreateWeeklyEntryForm';
import EditWeeklyEntryForm from './components/EditWeeklyEntryForm';
import type { Goal, WeeklyEntry } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingEntry, setEditingEntry] = useState<WeeklyEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // Default to dark mode

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch goals from backend
        const goalsResponse = await fetch('http://localhost:8081/api/goals');
        const fetchedGoals: Goal[] = await goalsResponse.json();
        setGoals(fetchedGoals);
        
        // Fetch entries from backend
        const entriesResponse = await fetch('http://localhost:8081/api/entries');
        const fetchedEntries: WeeklyEntry[] = await entriesResponse.json();
        setEntries(fetchedEntries);
      } catch (error) {
        console.error('Error loading data:', error);
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
  }) => {
    try {
      // Send new goal to backend
      const response = await fetch('http://localhost:8081/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      
      if (response.ok) {
        const newGoal: Goal = await response.json();
        setGoals([...goals, newGoal]);
      } else {
        console.error('Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
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
    };
    
    try {
      // Send updated goal to backend
      const response = await fetch(`http://localhost:8081/api/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendCompatibleData),
      });
      
      if (response.ok) {
        const savedGoal: Goal = await response.json();
        // Update the goal in state
        setGoals(goals.map(goal => goal.id === savedGoal.id ? savedGoal : goal));
        setEditingGoal(null); // Close edit form
      } else {
        const errorText = await response.text();
        console.error('Failed to update goal:', errorText);
        alert('Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Error updating goal');
    }
  };

  const handleGoalDelete = async (id: number) => {
    // Ensure ID is valid before proceeding
    if (!id || isNaN(id)) {
      console.error('Invalid goal ID provided for deletion:', id);
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      // Send delete request to backend
      const response = await fetch(`http://localhost:8081/api/goals/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the goal from state
        setGoals(goals.filter(goal => goal.id !== id));
      } else {
        console.error('Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
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
      const response = await fetch('http://localhost:8081/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });
      
      if (response.ok) {
        const savedEntry: WeeklyEntry = await response.json();
        setEntries([...entries, savedEntry]);
      } else {
        console.error('Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const handleEntryEdit = async (updatedEntry: Omit<WeeklyEntry, 'id'>) => {
    if (!editingEntry) return;
    
    try {
      // Send updated entry to backend
      const response = await fetch(`http://localhost:8081/api/entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEntry),
      });
      
      if (response.ok) {
        const savedEntry: WeeklyEntry = await response.json();
        // Update the entry in state
        setEntries(entries.map(entry => entry.id === savedEntry.id ? savedEntry : entry));
        setEditingEntry(null); // Close edit form
      } else {
        const errorText = await response.text();
        console.error(
          'Failed to update entry:',
          response.status,
          response.statusText,
          errorText
        );
      }
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const handleEntryDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }
    
    try {
      // Send delete request to backend
      const response = await fetch(`http://localhost:8081/api/entries/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove entry from state
        setEntries(entries.filter(entry => entry.id !== id));
      } else {
        console.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleEditEntry = (entry: WeeklyEntry) => {
    setEditingEntry(entry);
  };

  const cancelEditEntry = () => {
    setEditingEntry(null);
  };

  return (
    <div className={isDarkMode ? 'dark min-h-screen bg-gray-900' : 'min-h-screen bg-gray-50'}>
      <header className={isDarkMode ? 'bg-gray-800 text-white p-4 shadow-md' : 'bg-blue-600 text-white p-4 shadow-md'}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Weekly Progress Tracker</h1>
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
      </header>

      <nav className={isDarkMode ? 'bg-gray-800 shadow-sm' : 'bg-white shadow-sm'}>
        <div className="container mx-auto">
          <div className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('goals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'goals' ? (isDarkMode ? 'border-blue-500 text-blue-400' : 'border-blue-500 text-blue-600') : (isDarkMode ? 'border-transparent text-gray-300 hover:text-gray-100 hover:border-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}`}
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
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'goals' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Your Goals</h2>
                  <CreateGoalForm onSubmit={handleGoalSubmit} />
                </div>
                
                {editingGoal ? (
                  <EditGoalForm 
                    goal={editingGoal} 
                    onSubmit={handleGoalEdit} 
                    onCancel={handleCancelEdit} 
                  />
                ) : null}
                
                <GoalList goals={goals} onEdit={handleEditGoal} onDelete={handleGoalDelete} />
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
                <ChartView data={entries.map((e: any) => ({ ...e, name: `Entry ${e.id}` }))} />
              </div>
            )}
          </>
        )}
      </main>

      <footer className={isDarkMode ? 'bg-gray-800 border-t border-gray-700 mt-8 py-6' : 'bg-gray-100 border-t mt-8 py-6'}>
        <div className="container mx-auto text-center text-gray-600">
          <p>Weekly Progress Tracker &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;