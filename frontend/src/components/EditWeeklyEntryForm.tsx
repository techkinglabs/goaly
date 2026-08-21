import React, { useState, useEffect } from 'react';
import type { WeeklyEntry } from '../types';

interface EditWeeklyEntryFormProps {
  entry?: WeeklyEntry;
  goals: {id: number; name: string}[];
  onSubmit: (entryData: Omit<WeeklyEntry, 'id'>) => void;
  onCancel: () => void;
}

const EditWeeklyEntryForm: React.FC<EditWeeklyEntryFormProps> = ({ 
  entry, 
  goals,
  onSubmit, 
  onCancel 
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const [actualValue, setActualValue] = useState<number | ''>('');
  const [targetValue, setTargetValue] = useState<number | ''>('');

  useEffect(() => {
    if (entry) {
      setSelectedGoalId(entry.goalId);
      setWeekStartDate(entry.weekStartDate);
      setActualValue(entry.actualValue);
      setTargetValue(entry.targetValue);
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoalId || !weekStartDate || actualValue === '') {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      goalId: Number(selectedGoalId),
      weekStartDate,
      actualValue: Number(actualValue),
      targetValue: Number(targetValue)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-lg shadow-md mb-6 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Edit Weekly Entry</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="goalId">
          Goal
        </label>
        <select
          id="goalId"
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : '')}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600"
          required
        >
          <option value="">Select a goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="weekStartDate">
          Week Starting
        </label>
        <input
          id="weekStartDate"
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="actualValue">
          Actual Value
        </label>
        <input
          id="actualValue"
          type="number"
          step="0.01"
          value={actualValue}
          onChange={(e) => setActualValue(e.target.value ? Number(e.target.value) : '')}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="targetValue">
          Target Value
        </label>
          <input
            id="targetValue"
            type="number"
            step="0.01"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : '')}
            readOnly
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:text-white dark:border-gray-600 opacity-70 cursor-not-allowed"
            required
          />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Update Entry
        </button>
      </div>
    </form>
  );
};

export default EditWeeklyEntryForm;