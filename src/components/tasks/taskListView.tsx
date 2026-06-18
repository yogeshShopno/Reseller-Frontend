'use client';
import moment from 'moment';
import DataTable, { Column } from '@/components/DataTable';
// import InlineDropdown from './InlineDropdown';
import { Task } from '@/components/TaskDialog';
import { TaskStatus, PRIORITY_OPTIONS } from './taskConstants';
import InlineDropdown from './inlineDropdown';

interface TaskListViewProps {
    tasks: Task[];
    loading: boolean;
    page: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    taskStatuses: TaskStatus[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onSearch: (val: string) => void;
    onStatusChange: (taskId: string, status: string) => void;
    onPriorityChange: (taskId: string, priority: string) => void;
    onView: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
}

export default function TaskListView({
    tasks,
    loading,
    page,
    totalPages,
    totalRecords,
    limit,
    taskStatuses,
    onPageChange,
    onPageSizeChange,
    onSearch,
    onStatusChange,
    onPriorityChange,
    onView,
    onEdit,
    onDelete,
}: TaskListViewProps) {
    const columns: Column<Task>[] = [
        {
            key: 'subject',
            label: 'Name',
            render: (v, row) => <span className="font-semibold">{row?.subject}</span>,
        },
        {
            key: 'startDate',
            label: 'START DATE',
            render: (v) => (v ? <span style={{ whiteSpace: "nowrap" }}>{moment(v).format('DD-MM-YYYY')}</span> : '-'),
        },
        {
            key: 'endDate',
            label: 'END DATE',
            render: (v) => (v ? <span style={{ whiteSpace: "nowrap" }}>{moment(v).format('DD-MM-YYYY')}</span> : '-'),
        },
        {
            key: 'assignedUsers',
            label: 'ASSIGNED TO',
            render: (v: Task['assignedUsers']) => (
                <div className="flex flex-wrap gap-1">
                    {v?.length
                        ? v.map((u) => (
                            <span key={u._id} className="p-2 bg-[#0a2352]/10 text-[#0a2352] rounded text-xs">
                                {u.fullName}
                            </span>
                        ))
                        : <span className="text-gray-400">-</span>}
                </div>
            ),
        },
        {
            key: 'assignedTeams',
            label: 'TEAMS',
            render: (v: Task['assignedTeams']) => (
                <div className="flex flex-wrap gap-1">
                    {v?.length
                        ? v.map((t) => (
                            <span key={t._id} className="p-2 bg-[#0a2352]/10 text-[#0a2352] rounded text-xs">
                                {t.name}
                            </span>
                        ))
                        : <span className="text-gray-400">-</span>}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'STATUS',
            render: (v, row) => (
                <InlineDropdown
                    value={row?.status?._id}
                    options={taskStatuses.map((s) => ({ value: s._id, label: s.name, cls: '' }))}
                    onSelect={(val) => onStatusChange(row._id, val)}
                />
            ),
        },
        {
            key: 'priority',
            label: 'PRIORITY',
            render: (v, row) => (
                <InlineDropdown
                    value={v}
                    options={PRIORITY_OPTIONS}
                    onSelect={(val) => onPriorityChange(row._id, val)}
                />
            ),
        },
    ];

    return (
        <DataTable
            data={tasks}
            columns={columns}
            loading={loading}
            pagination
            currentPage={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={limit}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onSearch={onSearch}
            actions
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    );
}