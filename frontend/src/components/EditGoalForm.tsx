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
  const [period, setPeriod] = useState<'YEAR' | 'MONTH' | 'WEEK' | 'WORKWEEK' | 'WEEKEND'>('WEEK');
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
      setPeriod(goal.period || 'WEEK');
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
      period,
      amountPerPeriod: amountPerPeriod === '' ? Number(targetValue) : Number(amountPerPeriod)
    });
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
          onChange={(e) => setPeriod(e.target.value as 'YEAR' | 'MONTH' | 'WEEK' | 'WORKWEEK' | 'WEEKEND')}
          className="form-input"
        >
          <option value="WEEK">Per Week</option>
          <option value="WORKWEEK">Per Workweek (5 days)</option>
          <option value="WEEKEND">Per Weekend (2 days)</option>
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