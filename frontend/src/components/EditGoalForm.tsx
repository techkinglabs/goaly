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
  const [period, setPeriod] = useState('ONGOING');
  const [amountPerPeriod, setAmountPerPeriod] = useState<number | ''>('');

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
      setPeriod(goal.period || 'ONGOING');
      setAmountPerPeriod(goal.amountPerPeriod ?? goal.targetValue);
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
      daysOfWeek,
      period,
      amountPerPeriod: amountPerPeriod === '' ? Number(targetValue) : Number(amountPerPeriod)
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
    <form onSubmit={handleSubmit} className="surface !mb-0 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Edit Goal</h3>
      
      <div className="mb-4">
        <label className="form-label" htmlFor="name">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
          required
        />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="unit">
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
          className="form-input"
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
            className="mt-2 form-input"
            required
          />
        )}
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="targetValue">
          Target Value
        </label>
        <input
          id="targetValue"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : '')}
          className="form-input"
        />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="period">
          Period
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="form-input"
        >
          <option value="ONGOING">Ongoing (forever)</option>
          <option value="WEEK">Per Week</option>
          <option value="MONTH">Per Month</option>
          <option value="YEAR">Per Year</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="amountPerPeriod">
          Amount per Period
        </label>
        <input
          id="amountPerPeriod"
          type="number"
          step="0.01"
          value={amountPerPeriod}
          onChange={(e) => setAmountPerPeriod(e.target.value ? Number(e.target.value) : '')}
          placeholder="Defaults to Target Value if empty"
          className="form-input"
        />
      </div>

      <div className="mb-6">
        <label className="form-label">Days of Week</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={selectAllDays}
            className="badge badge-accent !cursor-pointer hover:opacity-80 transition-opacity"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={unselectAllDays}
            className="badge badge-info !cursor-pointer hover:opacity-80 transition-opacity"
          >
            Unselect All
          </button>
          <button
            type="button"
            onClick={selectWorkWeek}
            className="badge badge-success !cursor-pointer hover:opacity-80 transition-opacity"
          >
            Select Work Week
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
            <label key={day} className="flex items-center space-x-1 text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={daysOfWeek.includes(day)}
                onChange={() => toggleDay(day)}
                className="mr-1 rounded focus:ring-2 focus:ring-[var(--accent)] accent-[var(--accent)]"
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
            className="mr-2 rounded focus:ring-2 focus:ring-[var(--accent)] accent-[var(--accent)]"
          />
          <span className="ml-2 text-[var(--text-secondary)]">Active Goal</span>
        </label>
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="description">
          Description
        </label>
        <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            rows={3}
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          Update Goal
        </button>
      </div>
    </form>
  );
};

export default EditGoalForm;