// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskStatus {
  _id: string;
  name: string;
  order: number;
  color: string;
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  low?: number;
  medium?: number;
  high?: number;
  taskStatuses?: TaskStatus[];
  statusCounts?: Record<string, number>;
  legacyCounts?: Record<string, number>;
}

// ─── Static Options ────────────────────────────────────────────────────────────

export const LEGACY_STATUS_OPTIONS = [
  { value: 'todo',        label: 'To Do',       cls: 'bg-gray-100 text-gray-700',  color: '#6B7280' },
  { value: 'in_progress', label: 'In Progress',  cls: 'bg-blue-100 text-blue-700',  color: '#3B82F6' },
  { value: 'completed',   label: 'Completed',    cls: 'bg-green-100 text-green-700', color: '#10B981' },
  { value: 'cancelled',   label: 'Cancelled',    cls: 'bg-red-100 text-red-700',    color: '#EF4444' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    cls: 'bg-green-100 text-green-700'  },
  { value: 'medium', label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'high',   label: 'High',   cls: 'bg-red-100 text-red-700'      },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

export const getStatusCls = (v: string | TaskStatus | undefined): string => {
  if (!v) return 'bg-gray-100 text-gray-700';
  if (typeof v === 'object' && '_id' in v) return '';
  return LEGACY_STATUS_OPTIONS.find((s) => s.value === v)?.cls || 'bg-gray-100 text-gray-700';
};

export const getStatusLabel = (v: string | TaskStatus | undefined): string => {
  if (!v) return 'Unknown';
  if (typeof v === 'object' && '_id' in v) return (v as TaskStatus).name;
  return LEGACY_STATUS_OPTIONS.find((s) => s.value === v)?.label || String(v);
};

export const getStatusColor = (v: string | TaskStatus | undefined): string => {
  if (!v) return '#6B7280';
  if (typeof v === 'object' && '_id' in v) return (v as TaskStatus).color || '#6B7280';
  return LEGACY_STATUS_OPTIONS.find((s) => s.value === v)?.color || '#6B7280';
};

export const getPriorityCls   = (v: string) => PRIORITY_OPTIONS.find((p) => p.value === v)?.cls   || 'bg-gray-100 text-gray-700';
export const getPriorityLabel = (v: string) => PRIORITY_OPTIONS.find((p) => p.value === v)?.label || v;