import React, { useState, useEffect } from 'react';
import { Goal } from '../types';
import DatePicker from './DatePicker';

interface CreateDailyEntryFormProps {
    goals: Goal[];
    onSubmit: (entryData: {
        goalId: number;
        entryDate: string;
        actualValue: number;
        note?: string | null;
    }) => void;
}

const CreateDailyEntryForm: React.FC<CreateDailyEntryFormProps> = ({
    goals,
    onSubmit,
}) => {
    const [goalId, setGoalId] = useState<number | ''>('');
    const [entryDate, setEntryDate] = useState('');
    const [actualValue, setActualValue] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        setEntryDate(`${y}-${m}-${d}`);
        if (goals.length > 0 && goalId === '') {
            setGoalId(goals[0].id);
        }
    }, [goals, goalId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!goalId) {
            alert('Please create a goal first.');
            return;
        }

        onSubmit({
            goalId: Number(goalId),
            entryDate,
            actualValue: Number(actualValue),
            note: note.trim() || null,
        });

        setActualValue('');
        setNote('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="surface !mb-0 rounded-xl p-0 w-full max-w-md border-0"
        >
            <div className="mb-4">
                <label className="form-label">
                    Goal
                </label>
                <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : '')}
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
                <label className="form-label">
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
                <label className="form-label">
                    Actual Value
                </label>

                <input
                    type="number"
                    step="1"
                    value={actualValue}
                    onChange={(e) => setActualValue(e.target.value)}
                    className="form-input"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="form-label">
                    Note (optional)
                </label>

                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="form-input"
                    rows={3}
                />
            </div>

            <button
                type="submit"
                className="btn w-full"
                style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}
            >
                Add Entry
            </button>
        </form>
    );
};

export default CreateDailyEntryForm;
