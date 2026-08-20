import React, { useState } from 'react';
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
    const [selectedGoalId, setSelectedGoalId] = useState('');
    const [weekStartDate, setWeekStartDate] = useState('');
    const [actualValue, setActualValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedGoalId) {
            alert('Please select a goal');
            return;
        }

        onSubmit({
            goalId: Number(selectedGoalId),
            weekStartDate,
            actualValue: Number(actualValue),
        });

        setSelectedGoalId('');
        setWeekStartDate('');
        setActualValue('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg shadow-md p-6 w-full max-w-md dark:bg-gray-800"
        >
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
                Create Weekly Entry
            </h3>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Goal
                </label>

                <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-green-500 focus:border-green-500"
                    required
                >
                    <option value="">Select a goal</option>
                    {goals.map(goal => (
                        <option key={goal.id} value={goal.id} className="dark:bg-gray-800 dark:text-white">
                            {goal.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Week Starting
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
                Create Entry
            </button>
        </form>
    );
};

export default CreateWeeklyEntryForm;