import React, { useState, useEffect } from 'react';
import GoalList from './components/GoalList';
import WeeklyEntryList from './components/WeeklyEntryList';
import ChartView from './components/ChartView';
import CreateGoalForm from './components/CreateGoalForm';
import CreateWeeklyEntryForm from './components/CreateWeeklyEntryForm';
import type { Goal, WeeklyEntry } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleEntrySubmit = async (entryData: {
    goalId: number;
    weekStartDate: string;
    actualValue: number;
    targetValue: number;
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
        const newEntry: WeeklyEntry = await response.json();
        setEntries([...entries, newEntry]);
      } else {
        console.error('Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Weekly Progress Tracker</h1>
        </div>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex space-x-8">
            <button 
              onClick={() => setActiveTab('goals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'goals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Goals
            </button>
            <button 
              onClick={() => setActiveTab('entries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'entries' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Weekly Entries
            </button>
            <button 
              onClick={() => setActiveTab('charts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'charts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
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
                
                <GoalList goals={goals} />
              </div>
            )}

            {activeTab === 'entries' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Weekly Entries</h2>
                  <CreateWeeklyEntryForm onSubmit={handleEntrySubmit} />
                </div>
                
                <WeeklyEntryList entries={entries} goals={goals} />
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

      <footer className="bg-gray-100 border-t mt-8 py-6">
        <div className="container mx-auto text-center text-gray-600">
          <p>Weekly Progress Tracker &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;