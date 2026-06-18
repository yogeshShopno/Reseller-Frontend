'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, ListCollapse, Kanban } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { baseUrl, getAuthToken } from '@/config';
import TaskDialog, { Task } from '@/components/TaskDialog';
import DeleteDialog from '@/components/DeleteDialog';
import { TaskStatus, TaskSummary } from '@/components/tasks/taskConstants';
import TaskListView from '@/components/tasks/taskListView';
import TaskKanbanView from '@/components/tasks/taskKanbanView';
import TaskViewDialog from '@/components/tasks/taskViewDialog';
import { KanbanColumnSkeleton, PageSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function TasksPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [kanbanData, setKanbanData] = useState<any[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [taskPermissions, setTaskPermissions] = useState<{
    readAll?: boolean;
    readOwn?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  } | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const permissionsChecked = useRef(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const effectiveTab = (!taskPermissions?.readAll && taskPermissions?.readOwn) ? 'my' : activeTab;

  // ── Permissions ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (permissionsChecked.current) return;
    const token = getAuthToken();
    if (!token) return;

    axios.get(baseUrl.currentStaff, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const role = res.data?.data?.role || {};
        const rawPerms = Array.isArray(role.permissions) ? role.permissions[0] : role.permissions || {};
        const tp = rawPerms.task || {};
        setTaskPermissions(tp);
        if (!tp.readAll && tp.readOwn) setActiveTab('my');
        permissionsChecked.current = true;
      })
      .catch(console.error);
  }, []);

  // ── Data Fetchers ──────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const url = effectiveTab === 'my' ? baseUrl.myTasks : baseUrl.getAllTasks;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: searchQuery || undefined },
      });
      setTasks(res.data.data || []);
      setTotalPages(res.data.pagination.totalPages);
      setTotalRecords(res.data.pagination.totalRecords);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, effectiveTab]);

  const fetchSummary = useCallback(async () => {
    try {
      const token = getAuthToken();
      const url = effectiveTab === 'my' ? baseUrl.myTaskSummary : baseUrl.taskSummary;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setSummary(res.data.data);
      if (res.data.data?.taskStatuses) setTaskStatuses(res.data.data.taskStatuses);
    } catch {
      setSummary(null);
    }
  }, [effectiveTab]);

  const fetchTaskStatuses = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get(baseUrl.taskStatuses, { headers: { Authorization: `Bearer ${token}` } });
      setTaskStatuses(res.data.data || []);
    } catch {
      setTaskStatuses([]);
    }
  }, []);

  const fetchKanbanData = useCallback(async () => {
    try {
      setKanbanLoading(true);
      const token = getAuthToken();
      const res = await axios.get(`${baseUrl.taskKanban}?my=${effectiveTab === 'my'}&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKanbanData(res.data.data?.tasksByStatus || []);
    } catch {
      setKanbanData([]);
    } finally {
      setKanbanLoading(false);
    }
  }, [effectiveTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    // fetchSummary();
    fetchTaskStatuses();
  }, []);

  useEffect(() => {
    // if (viewMode === 'kanban') fetchKanbanData(); // Skip heavy global fetch, component now handles status-wise
  }, [viewMode, fetchKanbanData]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      const token = getAuthToken();
      const res = await axios.patch(`${baseUrl.updateTaskStatus}/${taskId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Find the full status object from taskStatuses
      const fullStatus = taskStatuses.find(s => s._id === status);
      if (fullStatus) {
        setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: fullStatus, taskStatus: fullStatus } : t));
      }
      // Refresh both views to reflect changes
      refreshData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (taskId: string, priority: string) => {
    try {
      const token = getAuthToken();
      await axios.patch(`${baseUrl.updateTaskPriority}/${taskId}/priority`, { priority }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, priority } : t));
      // Refresh both views to reflect changes
      refreshData();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchTasks(),
      // fetchKanbanData() // Global fetch skipped
    ]);
  }, [fetchTasks]);

  const handleConfirmDelete = async () => {
    if (!deleteTask) return;
    try {
      const token = getAuthToken();
      await axios.delete(`${baseUrl.deleteTask}/${deleteTask._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Task deleted successfully');
      setDeleteTask(null);
      refreshData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete task');
    }
  };

  // Check if we're loading and have no data (initial load)
  const isInitialLoad = (loading && tasks.length === 0) || (kanbanLoading && kanbanData.length === 0);
  const isRefreshing = (loading && tasks.length > 0) || (kanbanLoading && kanbanData.length > 0);

  // Show skeleton loader only on initial load
  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="rounded-md border border-gray-200 bg-white px-6 py-4 transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="h-10 w-20 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'list' ? (
            <div className="bg-white rounded-md border border-gray-200 p-4">
              <PageSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <KanbanColumnSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Page Header (Matching Leads) */}
        <div className="rounded-md border border-gray-200 bg-white px-4 sm:px-6 py-4 transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            </div>

            <div className="flex items-center gap-3 ml-auto flex-wrap justify-end">
              {/* View Toggle */}
              <div className="relative flex items-center bg-gray-100 p-1 rounded-md w-fit">
                <div
                  className={`absolute z-0 top-1 bottom-1 w-10 rounded-md bg-secondary transition-all duration-300 ease-in-out ${viewMode === 'list' ? 'left-1' : 'left-[calc(50%)]'
                    }`}
                  title='view'
                />

                <button
                  onClick={() => setViewMode('list')}
                  className={`relative z-10 cursor-pointer flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-300 ${viewMode === 'list'
                    ? 'text-white'
                    : 'text-gray-700'
                    }`}
                  title='list'
                >
                  <ListCollapse className="h-5 w-5 text-current" />
                </button>

                <button
                  onClick={() => setViewMode('kanban')}
                  className={`relative z-10 cursor-pointer flex items-center justify-center w-10 h-10 rounded-md transition-colors duration-300 ${viewMode === 'kanban'
                    ? 'text-white'
                    : 'text-gray-700'
                    }`}
                  title='kanban'
                >
                  <Kanban className="h-5 w-5 text-current" />
                </button>
              </div>

              <button
                onClick={() => { setEditTask(null); setShowDialog(true); }}
                className="cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-md bg-secondary hover:bg-blue-700 text-white text-sm font-semibold shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>
        </div>

        {/* View Content Wrapper */}
        <div className="flex-1">
          {/* List View */}
          {viewMode === 'list' && (
            <TaskListView
              tasks={tasks}
              loading={loading}
              page={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              limit={limit}
              taskStatuses={taskStatuses}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
              onSearch={(val) => { setSearchQuery(val); setPage(1); }}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onView={(row) => setViewTask(row)}
              onEdit={(row) => { setEditTask(row); setShowDialog(true); }}
              onDelete={(row) => setDeleteTask(row)}
            />
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <TaskKanbanView
              taskStatuses={taskStatuses}
              onTaskClick={(task) => setViewTask(task)}
              onEdit={(task) => { setEditTask(task); setShowDialog(true); }}
              onDelete={(task) => setDeleteTask(task)}
              onRefresh={refreshData}
              searchQuery={searchQuery}
              activeTab={effectiveTab as 'all' | 'my'}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <TaskDialog
        isOpen={showDialog}
        onClose={() => { setShowDialog(false); setEditTask(null); }}
        mode={editTask ? 'edit' : 'add'}
        initialData={editTask}
        onSuccess={() => { refreshData(); }}
        taskStatuses={taskStatuses}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        isOpen={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        title="Delete Task"
        size="md"
        footer={
          <>
            <button
              onClick={() => setDeleteTask(null)}
              className="rounded-lg border cursor-pointer border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="rounded-lg cursor-pointer bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="py-4 text-gray-700">
          Are you sure you want to delete task &quot;{deleteTask?.subject}&quot;? This action cannot be undone.
        </p>
      </DeleteDialog>

      {/* View Dialog */}
      <TaskViewDialog
        task={viewTask}
        taskStatuses={taskStatuses}
        onClose={() => setViewTask(null)}
      />
    </>
  );
}