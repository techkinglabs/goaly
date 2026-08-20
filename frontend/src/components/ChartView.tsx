import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartViewProps {
  data: any[];
}

const ChartView: React.FC<ChartViewProps> = ({ data }) => {
  // Prepare data for line chart
  const lineChartData = data.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Prepare data for bar chart
  const barChartData = data.map(entry => ({
    name: `Entry ${entry.id}`,
    progress: entry.progress,
    date: entry.date
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg shadow-md p-6 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Progress Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={lineChartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
            <XAxis dataKey="date" className="dark:fill-gray-300" />
            <YAxis className="dark:fill-gray-300" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} 
              itemStyle={{ color: '#f9fafb' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="progress" 
              stroke="#3b82f6" 
              activeDot={{ r: 8 }} 
              name="Progress (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="rounded-lg shadow-md p-6 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Weekly Progress Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={barChartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
            <XAxis dataKey="name" className="dark:fill-gray-300" />
            <YAxis className="dark:fill-gray-300" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} 
              itemStyle={{ color: '#f9fafb' }}
            />
            <Legend />
            <Bar dataKey="progress" fill="#10b981" name="Progress (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartView;