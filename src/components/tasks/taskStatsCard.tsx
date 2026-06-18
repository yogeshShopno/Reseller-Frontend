'use client';
import { ClipboardList, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { TaskSummary } from './taskConstants';

interface TaskStatsCardsProps {
  summary: TaskSummary | null;
  activeTab: 'all' | 'my';
}

export default function TaskStatsCards({ summary, activeTab }: TaskStatsCardsProps) {
  const statCards = [
    {
      label: 'Total Tasks',
      value: summary?.total ?? '-',
      icon: ClipboardList,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      border: 'border-blue-100',
      valueCls: 'text-blue-700',
    },
    {
      label: 'To Do',
      value: summary?.todo ?? '-',
      icon: Clock,
      bg: 'bg-gray-50',
      iconColor: 'text-gray-500',
      border: 'border-gray-200',
      valueCls: 'text-gray-700',
    },
    {
      label: 'In Progress',
      value: summary?.inProgress ?? '-',
      icon: Loader2,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      border: 'border-blue-100',
      valueCls: 'text-blue-700',
    },
    {
      label: 'Completed',
      value: summary?.completed ?? '-',
      icon: CheckCircle2,
      bg: 'bg-green-50',
      iconColor: 'text-green-600',
      border: 'border-green-100',
      valueCls: 'text-green-700',
    },
    {
      label: 'Cancelled',
      value: summary?.cancelled ?? '-',
      icon: XCircle,
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
      border: 'border-red-100',
      valueCls: 'text-red-700',
    },
  ];

  const priorityBars = [
    { label: 'Low Priority',    value: summary?.low    ?? 0, bg: 'bg-green-50',  border: 'border-green-100',  valueCls: 'text-green-700',  barCls: 'bg-green-400'  },
    { label: 'Medium Priority', value: summary?.medium ?? 0, bg: 'bg-yellow-50', border: 'border-yellow-100', valueCls: 'text-yellow-700', barCls: 'bg-yellow-400' },
    { label: 'High Priority',   value: summary?.high   ?? 0, bg: 'bg-red-50',    border: 'border-red-100',    valueCls: 'text-red-700',    barCls: 'bg-red-400'    },
  ];

  const priorityTotal = (summary?.low ?? 0) + (summary?.medium ?? 0) + (summary?.high ?? 0);

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.border} ${card.bg} p-4 flex items-center gap-4 shadow-sm`}
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${card.valueCls}`}>{card.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Priority Breakdown — only on All Tasks tab */}
      {activeTab === 'all' && summary && (
        <div className="grid grid-cols-3 gap-4">
          {priorityBars.map((p) => {
            const pct = priorityTotal > 0 ? Math.round((p.value / priorityTotal) * 100) : 0;
            return (
              <div key={p.label} className={`rounded-2xl border ${p.border} ${p.bg} p-4 shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{p.label}</span>
                  <span className={`text-lg font-bold ${p.valueCls}`}>{p.value}</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div className={`${p.barCls} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{pct}% of total</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}