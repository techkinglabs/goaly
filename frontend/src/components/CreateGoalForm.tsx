import React, { useState } from 'react';

interface CreateGoalFormProps {
    onSubmit: (goalData: {
        name: string;
        unit: string;
        targetValue: number;
        isActive: boolean;
    }) => void;
}

const CreateGoalForm: React.FC<CreateGoalFormProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({
            name,
            unit,
            targetValue: Number(targetValue),
            isActive,
        });

        setName('');
        setUnit('');
        setTargetValue('');
        setIsActive(true);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-md p-6 w-full max-w-md"
        >
            <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                </label>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                </label>

                <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="km, hours, pages..."
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

            <div className="mb-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="mr-2"
                    />

                    <span className="text-sm text-gray-700">
            Active Goal
          </span>
                </label>
            </div>

            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
                Create Goal
            </button>
        </form>
    );
};

export default CreateGoalForm;