import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';

// Color palettes
const COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // teal
  '#ec4899', // pink
  '#f97316', // orange
];

// Common interfaces
interface ChartProps {
  data: any[];
  index: string;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  showTooltip?: boolean;
  height?: number;
}

/**
 * Line Chart Component
 */
interface LineChartProps extends ChartProps {
  categories: string[];
  colors?: string[];
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showTooltip = true,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        {showGridLines && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={index} />
        <YAxis />
        {showTooltip && (
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
          />
        )}
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i % colors.length]}
            activeDot={{ r: 8 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

/**
 * Bar Chart Component
 */
interface BarChartProps extends ChartProps {
  categories: string[];
  colors?: string[];
  stacked?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showTooltip = true,
  stacked = false,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        {showGridLines && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={index} />
        <YAxis />
        {showTooltip && (
          <Tooltip
            formatter={(value: number) => [valueFormatter(value)]}
          />
        )}
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            fill={colors[i % colors.length]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

/**
 * Pie Chart Component
 */
interface PieChartProps {
  data: any[];
  index: string;
  category: string;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showLabel?: boolean;
  showLegend?: boolean;
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  index,
  category,
  colors = COLORS,
  valueFormatter = (value) => `${value}`,
  showLabel = true,
  showLegend = true,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          nameKey={index}
          dataKey={category}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={showLabel ? ({ name, value }) => `${name}: ${value}` : undefined}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [valueFormatter(value)]} />
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

// Export all charts
export default {
  LineChart,
  BarChart,
  PieChart
}; 