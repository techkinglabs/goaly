import React, { useState, useEffect } from 'react';
import type { Goal } from '../types';

interface EditGoalFormProps {
  goal?: Goal;
  onSubmit: (goalData: Omit<Goal, 'id'>) => void;
  onCancel: () => void;
}

const EditGoalForm: React.FC<EditGoalFormProps> = ({ goal, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      // Check if the unit is one of our predefined units
      const predefinedUnits = ['km', 'min', 'hours', 'steps', 'kcal', 'protein'];
      if (predefinedUnits.includes(goal.unit)) {
        setUnit(goal.unit);
        setIsCustomUnit(false);
      } else {
        setUnit('');
        setCustomUnit(goal.unit);
        setIsCustomUnit(true);
      }
      setTargetValue(goal.targetValue);
      setIsActive(goal.isActive);
      setDescription(goal.description || '');
      setDaysOfWeek(goal.daysOfWeek || []);
    }
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || (!isCustomUnit && !unit) || (isCustomUnit && !customUnit)) {
      alert('Please fill in all required fields');
      return;
    }

    let finalUnit = unit;
    if (isCustomUnit) {
      finalUnit = customUnit;
    }

    onSubmit({
      name,
      unit: finalUnit,
      targetValue: Number(targetValue),
      isActive,
      description,
      daysOfWeek
    });
  };

  const toggleDay = (day: string) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const selectAllDays = () => {
    setDaysOfWeek(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
  };

  const unselectAllDays = () => {
    setDaysOfWeek([]);
  };

  const selectWorkWeek = () => {
    setDaysOfWeek(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-lg shadow-md mb-6 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Edit Goal</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="name">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="unit">
          Unit *
        </label>
        <select
          id="unit"
          value={isCustomUnit ? 'custom' : unit}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setIsCustomUnit(true);
              setUnit('');
            } else {
              setIsCustomUnit(false);
              setUnit(e.target.value);
            }
          }}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select a unit</option>
          <option value="km">km</option>
          <option value="min">min</option>
          <option value="hours">hours</option>
          <option value="steps">steps</option>
          <option value="kcal">kcal</option>
          <option value="protein">protein</option>
          <option value="custom">Custom...</option>
        </select>

        {isCustomUnit && (
          <input
            type="text"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder="Enter custom unit"
            className="mt-2 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            required
          />
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="targetValue">
          Target Value
        </label>
        <input
          id="targetValue"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : '')}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300">Days of Week</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={selectAllDays}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={unselectAllDays}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Unselect All
          </button>
          <button
            type="button"
            onClick={selectWorkWeek}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
          >
            Select Work Week
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
            <label key={day} className="flex items-center space-x-1 dark:text-gray-300">
              <input
                type="checkbox"
                checked={daysOfWeek.includes(day)}
                onChange={() => toggleDay(day)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm">{day.substring(0, 3)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="ml-2 dark:text-gray-300">Active Goal</span>
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-2 dark:text-gray-300" htmlFor="description">
          Description
        </label>
        <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            rows={3}
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          Update Goal
        </button>
      </div>
    </form>
  );
};

export default EditGoalForm;