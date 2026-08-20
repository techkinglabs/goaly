import React, { useState, useEffect } from 'react';
import { Goal } from '../types';

interface CreateWeeklyEntryFormProps {
    goals: Goal[];
    onSubmit: (entryData: {
        goalId: number;
        weekStartDate: string;
        actualValue: number;
    }) => void;
}

const CreateWeeklyEntryForm: React.FC<CreateWeeklyEntryFormProps> = ({
    goals,
    onSubmit,
}) => {
    const [goalId, setGoalId] = useState<number | ''>('');
    const [weekStartDate, setWeekStartDate] = useState('');
    const [actualValue, setActualValue] = useState('');

    // Set default date to today and default goal to the first available
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setWeekStartDate(today);
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
            weekStartDate,
            actualValue: Number(actualValue),
        });

        setActualValue('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg shadow-md p-6 w-full max-w-md dark:bg-gray-800"
        >
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
                Add Entry
            </h3>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Goal
                </label>
                <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-green-500 focus:border-green-500"
                    required
                >
                    <option value="">Select a goal</option>
                    {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Entry Date
                </label>

                <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-green-500 focus:border-green-500"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Actual Value
                </label>

                <input
                    type="number"
                    step="0.01"
                    value={actualValue}
                    onChange={(e) => setActualValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-green-500 focus:border-green-500"
                    required
                />
            </div>

            <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
                Add Entry
            </button>
        </form>
    );
};

export default CreateWeeklyEntryForm;