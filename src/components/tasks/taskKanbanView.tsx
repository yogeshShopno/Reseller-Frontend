'use client';
import { useState, useCallback, useEffect } from 'react';
import { Clock, Eye, Edit, Trash2 } from 'lucide-react';
import moment from 'moment';
import axios from 'axios';
import { toast } from 'react-toastify';
import { baseUrl, getAuthToken } from '@/config';
import { Task } from '@/components/TaskDialog';
import { TaskStatus, getPriorityCls, getPriorityLabel } from './taskConstants';

interface TaskKanbanViewProps {
  taskStatuses: TaskStatus[];
  onTaskClick: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
  searchQuery?: string;
  activeTab?: 'all' | 'my';
}

export default function TaskKanbanView({
  taskStatuses,
  onTaskClick,
  onEdit,
  onDelete,
  onRefresh,
  searchQuery = '',
  activeTab = 'all',
}: TaskKanbanViewProps) {
  const [boardTasks, setBoardTasks] = useState<Record<string, Task[]>>({});
  const [columnLoading, setColumnLoading] = useState<Record<string, boolean>>({});
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});
  const [loadingMoreMap, setLoadingMoreMap] = useState<Record<string, boolean>>({});
  
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; sourceStatusId: string } | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const token = () => getAuthToken();

  const fetchStatusTasks = useCallback(
    async (statusId: string, page = 1, isLoadMore = false, isSilent = false) => {
      if (isLoadMore) {
        setLoadingMoreMap((p) => ({ ...p, [statusId]: true }));
      } else if (!isSilent) {
        setColumnLoading((p) => ({ ...p, [statusId]: true }));
      }

      try {
        const res = await axios.get(baseUrl.getKanbanStatusTasks, {
          headers: { Authorization: `Bearer ${token()}` },
          params: {
            statusId,
            page,
            limit: 10,
            search: searchQuery || undefined,
            my: activeTab === 'my',
          },
        });

        const newData: Task[] = res.data?.data || [];
        const pagination = res.data?.pagination || {};

        setBoardTasks((prev) => ({
          ...prev,
          [statusId]: isLoadMore ? [...(prev[statusId] || []), ...newData] : newData,
        }));

        setPageMap((prev) => ({ ...prev, [statusId]: page }));
        setHasMoreMap((prev) => ({
          ...prev,
          [statusId]: page < (pagination.totalPages || 1),
        }));
      } catch (error) {
        console.error(`Failed to fetch tasks for status ${statusId}:`, error);
      } finally {
        setColumnLoading((p) => ({ ...p, [statusId]: false }));
        setLoadingMoreMap((p) => ({ ...p, [statusId]: false }));
      }
    },
    [searchQuery, activeTab]
  );

  useEffect(() => {
    taskStatuses.forEach((s) => {
      fetchStatusTasks(s._id, 1);
    });
  }, [taskStatuses, searchQuery, activeTab, fetchStatusTasks]);

  const loadMore = useCallback(
    async (statusId: string) => {
      if (loadingMoreMap[statusId] || hasMoreMap[statusId] === false) return;
      const nextPage = (pageMap[statusId] || 1) + 1;
      fetchStatusTasks(statusId, nextPage, true);
    },
    [loadingMoreMap, hasMoreMap, pageMap, fetchStatusTasks]
  );

  const handleDragStart = (taskId: string, statusId: string) => {
    setDraggedTask({ taskId, sourceStatusId: statusId });
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    setDragOverStatus(statusId);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (!draggedTask) return;
    const { taskId, sourceStatusId } = draggedTask;
    
    if (sourceStatusId === targetStatusId) {
      setDraggedTask(null);
      return;
    }

    const targetStatus = taskStatuses.find((s) => s._id === targetStatusId);
    if (!targetStatus) return;

    setDraggedTask(null);
    setUpdatingId(taskId);

    // Optimistic Update
    setBoardTasks((prev) => {
      const next = { ...prev };
      const sourceTasks = [...(next[sourceStatusId] || [])];
      const taskIndex = sourceTasks.findIndex((t) => t._id === taskId);
      if (taskIndex > -1) {
        const [task] = sourceTasks.splice(taskIndex, 1);
        next[sourceStatusId] = sourceTasks;
        next[targetStatusId] = [task, ...(next[targetStatusId] || [])];
        task.taskStatus = targetStatus;
      }
      return next;
    });

    try {
      await axios.patch(
        `${baseUrl.updateTaskStatus}/${taskId}/status`,
        { status: targetStatusId },
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      toast.success('Task status updated');
      
      // Silent re-fetch to sync
      fetchStatusTasks(sourceStatusId, 1, false, true);
      fetchStatusTasks(targetStatusId, 1, false, true);
      onRefresh(); // Refresh global counts if any
    } catch {
      toast.error('Failed to update task status');
      // Re-fetch with loader to show revert
      fetchStatusTasks(sourceStatusId, 1);
      fetchStatusTasks(targetStatusId, 1);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 h-[calc(100vh-235px)] w-100 pb-4">
        {taskStatuses.map((status) => {
          const tasks = boardTasks[status._id] || [];
          const isLoading = columnLoading[status._id];

          return (
            <div
              key={status._id}
              className={`w-80 flex-shrink-0 flex flex-col transition-all ${dragOverStatus === status._id ? 'ring-2 ring-blue-400 ring-opacity-75' : ''
                }`}
              onDragOver={(e) => handleDragOver(e, status._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status._id)}
            >
              <div
                className="rounded-t-2xl px-5 py-4 shadow-sm"
                style={{ backgroundColor: status.color || '#6B7280' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white tracking-wide uppercase text-sm">{status.name}</h3>
                  <span className="rounded-2xl bg-white text-primary px-3 py-1 text-xs font-bold">
                    {tasks.length}
                  </span>
                </div>
              </div>

              <div
                className={`flex-1 overflow-y-auto rounded-b-2xl bg-[#f4f7fb] p-3 space-y-4 min-h-[400px] transition-colors ${dragOverStatus === status._id ? 'bg-blue-50' : ''
                  }`}
                onScroll={(e) => {
                  const t = e.target as HTMLDivElement;
                  if (Math.ceil(t.scrollTop + t.clientHeight) >= t.scrollHeight - 20) {
                    loadMore(status._id);
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex h-full items-center justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No tasks available
                  </div>
                ) : (
                  tasks.map((task) => (
                    <KanbanCard
                      key={task._id}
                      task={task}
                      statusId={status._id}
                      isDragging={draggedTask?.taskId === task._id}
                      isUpdating={updatingId === task._id}
                      onDragStart={handleDragStart}
                      onView={() => onTaskClick(task)}
                      onEdit={() => onEdit(task)}
                      onDelete={() => onDelete(task)}
                    />
                  ))
                )}
                {loadingMoreMap[status._id] && (
                  <div className="flex justify-center py-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  statusId: string;
  isDragging: boolean;
  isUpdating?: boolean;
  onDragStart: (taskId: string, statusId: string) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function KanbanCard({ task, statusId, isDragging, isUpdating, onDragStart, onView, onEdit, onDelete }: KanbanCardProps) {
  return (
    <div
      draggable={!isUpdating}
      onDragStart={() => onDragStart(task._id, statusId)}
      className={`group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing flex flex-col justify-between h-[180px] ${isDragging ? 'opacity-50 scale-95 ring-2 ring-blue-500' : ''
        } ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <div className="relative h-full flex flex-col justify-between">
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div
              className="font-bold text-gray-900 line-clamp-2 leading-tight cursor-pointer hover:text-blue-600 transition-colors"
              onClick={onView}
            >
              {task.subject}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onView(); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm transition-all" title="View"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 shadow-sm transition-all" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 shadow-sm transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityCls(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            {task.startDate && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                <Clock className="w-3 h-3" />
                {moment(task.startDate).format('MMM D')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center -space-x-2 overflow-hidden mt-2">
          {task.assignedUsers?.slice(0, 3).map((u: any) => (
            <div
              key={u._id}
              className="h-7 w-7 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-gray-100"
              title={u.fullName}
            >
              {u.fullName?.charAt(0).toUpperCase() || '?'}
            </div>
          ))}
          {task.assignedUsers?.length > 3 && (
            <div className="h-7 w-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm ring-1 ring-gray-100">
              +{task.assignedUsers.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}