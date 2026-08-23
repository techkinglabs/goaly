import React, { useState, useEffect } from 'react';
import type { DailyEntry } from '../types';
import DatePicker from './DatePicker';

interface EditDailyEntryFormProps {
  entry?: DailyEntry;
  goals: {id: number; name: string}[];
  onSubmit: (entryData: Omit<DailyEntry, 'id'>) => void;
  onCancel: () => void;
}

const EditDailyEntryForm: React.FC<EditDailyEntryFormProps> = ({
  entry,
  goals,
  onSubmit,
  onCancel
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
  const [entryDate, setEntryDate] = useState('');
  const [actualValue, setActualValue] = useState<number | ''>('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (entry) {
      setSelectedGoalId(entry.goalId);
      setEntryDate(entry.entryDate);
      setActualValue(entry.actualValue);
      setTargetValue(entry.targetValue);
      setNote(entry.note ?? '');
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGoalId || !entryDate || actualValue === '') {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      goalId: Number(selectedGoalId),
      entryDate,
      actualValue: Number(actualValue),
      targetValue: Number(targetValue),
      note: note.trim() || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="surface !mb-0 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Edit Daily Entry</h3>

      <div className="mb-4">
        <label className="form-label" htmlFor="goalId">
          Goal
        </label>
        <select
          id="goalId"
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : '')}
          className="form-input"
          required
        >
          <option value="">Select a goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="entryDate">
          Entry Date
        </label>
        <DatePicker
          value={entryDate}
          onChange={setEntryDate}
          className="form-input !mb-0"
          required
        />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="actualValue">
          Actual Value
        </label>
        <input
          id="actualValue"
          type="number"
          step="1"
          value={actualValue}
          onChange={(e) => setActualValue(e.target.value ? Number(e.target.value) : '')}
          className="form-input"
          required
        />
      </div>

      <div className="mb-4">
        <label className="form-label" htmlFor="targetValue">
          Target Value
        </label>
          <input
            id="targetValue"
            type="number"
            step="1"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : '')}
            readOnly
            className="form-input opacity-70 cursor-not-allowed"
            required
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
          Update Entry
        </button>
      </div>
    </form>
  );
};

export default EditDailyEntryForm;
