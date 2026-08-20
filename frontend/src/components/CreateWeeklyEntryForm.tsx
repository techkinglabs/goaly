import React, { useState } from 'react';

interface CreateWeeklyEntryFormProps {
    onSubmit: (entryData: {
        goalId: number;
        weekStartDate: string;
        actualValue: number;
        targetValue: number;
    }) => void;
}

const CreateWeeklyEntryForm: React.FC<CreateWeeklyEntryFormProps> = ({
                                                                         onSubmit,
                                                                     }) => {
    const [goalId, setGoalId] = useState('');
    const [weekStartDate, setWeekStartDate] = useState('');
    const [actualValue, setActualValue] = useState('');
    const [targetValue, setTargetValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({
            goalId: Number(goalId),
            weekStartDate,
            actualValue: Number(actualValue),
            targetValue: Number(targetValue),
        });

        setGoalId('');
        setWeekStartDate('');
        setActualValue('');
        setTargetValue('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-md p-6 w-full max-w-md"
        >
            <h3 className="text-lg font-semibold mb-4">
                Create Weekly Entry
            </h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal ID
                </label>

                <input
                    type="number"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Starting
                </label>

                <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actual Value
                </label>

                <input
                    type="number"
                    step="0.01"
                    value={actualValue}
                    onChange={(e) => setActualValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value
                </label>

                <input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
            </div>

            <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
                Create Entry
            </button>
        </form>
    );
};

export default CreateWeeklyEntryForm;