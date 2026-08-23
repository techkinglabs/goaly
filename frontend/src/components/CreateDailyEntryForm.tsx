import React, { useState, useEffect } from 'react';
import { Goal } from '../types';
import DatePicker from './DatePicker';

interface CreateDailyEntryFormProps {
    goals: Goal[];
    onSubmit: (entryData: {
        goalId: number;
        entryDate: string;
        actualValue: number;
    }) => void;
}

const CreateDailyEntryForm: React.FC<CreateDailyEntryFormProps> = ({
    goals,
    onSubmit,
}) => {
    const [goalId, setGoalId] = useState<number | ''>('');
    const [entryDate, setEntryDate] = useState('');
    const [actualValue, setActualValue] = useState('');

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setEntryDate(today);
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
        });

        setActualValue('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="surface !mb-0 rounded-xl p-6 w-full max-w-md"
        >
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                Add Entry
            </h3>

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
