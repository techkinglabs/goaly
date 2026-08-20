import React, { useState } from 'react';

interface CreateGoalFormProps {
    onSubmit: (goalData: {
        name: string;
        unit: string;
        targetValue: number;
        isActive: boolean;
        description?: string;
        daysOfWeek?: string[];
    }) => void;
}

const CreateGoalForm: React.FC<CreateGoalFormProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [customUnit, setCustomUnit] = useState('');
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    const [targetValue, setTargetValue] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [description, setDescription] = useState('');
    const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

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

        setName('');
        setUnit('');
        setCustomUnit('');
        setIsCustomUnit(false);
        setTargetValue('');
        setIsActive(true);
        setDescription('');
        setDaysOfWeek([]);
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
        <form
            onSubmit={handleSubmit}
            className="rounded-lg shadow-md p-6 w-full max-w-md dark:bg-gray-800"
        >
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Create New Goal</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Name
                </label>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Unit
                </label>

                <select
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
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
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Target Value
                </label>

                <input
                    type="number"
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Days of Week
                </label>
                
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
                                className="mr-1 rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">{day.substring(0, 3)}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="mr-2 rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500"
                    />

                    <span className="text-sm dark:text-gray-300">
            Active Goal
          </span>
                </label>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                    Description
                </label>

                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                />
            </div>


            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
                Create Goal
            </button>
        </form>
    );
};

export default CreateGoalForm;