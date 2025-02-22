import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  FileText,
  Phone,
  Clock,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

const MetricCard = ({
  title = "Metric",
  value = "0",
  change = 0,
  icon,
}: MetricCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card className="bg-[#354f52] border-[#52796f]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#84a98c]">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-[#84a98c]">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#cad2c5]">{value}</div>
        <div
          className={`flex items-center text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDownRight className="h-4 w-4 mr-1" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricCardsProps {
  metrics?: {
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
  }[];
}

const MetricCards = ({ metrics }: MetricCardsProps) => {
  const defaultMetrics = [
    {
      title: "Σύνολο Πελατών",
      value: "1,234",
      change: 20.1,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Ενεργές Προσφορές",
      value: "156",
      change: -3.2,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Σημερινές Κλήσεις",
      value: "45",
      change: 8.4,
      icon: <Phone className="h-4 w-4" />,
    },
    {
      title: "Εκκρεμείς Εργασίες",
      value: "12",
      change: -5.5,
      icon: <Clock className="h-4 w-4" />,
    },
  ];

  const displayMetrics = metrics || defaultMetrics;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {displayMetrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          icon={metric.icon}
        />
      ))}
    </div>
  );
};

export default MetricCards;
