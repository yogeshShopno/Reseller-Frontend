'use client';
import { Eye, Download } from 'lucide-react';
import moment from 'moment';
import { toast } from 'react-toastify';
import { getAuthToken } from '@/config';
import Dialog from '@/components/Dialog';
import { Task } from '@/components/TaskDialog';
import { TaskStatus, getStatusCls, getStatusLabel, getPriorityCls, getPriorityLabel } from './taskConstants';
import { getFileIcon } from '@/utills/utill';

interface TaskViewDialogProps {
  task: Task | null;
  taskStatuses: TaskStatus[];
  onClose: () => void;
}

export default function TaskViewDialog({ task, taskStatuses, onClose }: TaskViewDialogProps) {
  if (!task) return null;

  const handleDownload = async (fileUrl: string, originalName: string) => {
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const openImageModal = (fileUrl: string, originalName: string) => {
    const modal = document.createElement('dialog');
    modal.className = 'fixed inset-0 w-full h-full bg-black/80 flex items-center justify-center p-4 z-[10000]';
    modal.innerHTML = `
      <div class="relative max-w-4xl max-h-[90vh]">
        <img src="${fileUrl}" alt="${originalName}" class="max-w-full max-h-[90vh] object-contain" />
        <button class="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 shadow-lg" onclick="this.closest('dialog').close()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.showModal();
    modal.addEventListener('close', () => document.body.removeChild(modal));
  };

  return (
    <Dialog isOpen={!!task} onClose={onClose} title="Task Details">
      <div className="space-y-4 text-sm text-slate-700">
        <div className="rounded-lg border border-gray-200 p-3 col-span-2">
          <div className="text-xs text-gray-500">Name</div>
          <div className="font-semibold text-gray-900">{task.subject}</div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Description</div>
          {task.description
            ? <div className="prose prose-sm max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: task.description }} />
            : <span className="text-gray-400">-</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Status</div>
            {task.taskStatus ? (
              <span
                className="mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: task.taskStatus.color + '20', color: task.taskStatus.color }}
              >
                {task.taskStatus.name}
              </span>
            ) : (
              <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusCls(task.status as any)}`}>
                {getStatusLabel(task.status as any)}
              </span>
            )}
          </div>

          {/* Priority */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Priority</div>
            <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityCls(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
          </div>

          {/* Dates */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Start Date</div>
            <div className="font-semibold text-gray-900">
              {task.startDate ? moment(task.startDate).format('DD-MM-YYYY') : '-'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">End Date</div>
            <div className="font-semibold text-gray-900">
              {task.endDate ? moment(task.endDate).format('DD-MM-YYYY') : '-'}
            </div>
          </div>

          {/* Assigned Users */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Assigned Users</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {task.assignedUsers?.length
                ? task.assignedUsers.map((u) => (
                  <span key={u._id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{u.fullName}</span>
                ))
                : <span className="text-gray-400">-</span>}
            </div>
          </div>

          {/* Assigned Teams */}
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Assigned Teams</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {task.assignedTeams?.length
                ? task.assignedTeams.map((t) => (
                  <span key={t._id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{t.name}</span>
                ))
                : <span className="text-gray-400">-</span>}
            </div>
          </div>
        </div>
        {/* Attachments */}
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Attachments</div>
          {task.attachments?.length ? (
            <div className="space-y-2">
              {task.attachments.map((a, i) => {
                const fileUrl = a.path?.startsWith('http') ? a.path : `${process.env.NEXT_PUBLIC_IMAGE_URL}${a.path}`;
                const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(a.filename || a.path);

                return (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {isImage ? (
                      <button
                        onClick={() => openImageModal(fileUrl, a.originalName)}
                        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden hover:opacity-80 transition border border-gray-200"
                      >
                        <img src={fileUrl} alt={a.originalName} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-lg text-gray-600">{getFileIcon(a.filename)}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {a.size ? Math.round(a.size / 1024) : 0} KB •{' '}
                        {isImage ? 'Image' : a.filename.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => isImage ? openImageModal(fileUrl, a.originalName) : window.open(fileUrl, '_blank')}
                        className="p-2 cursor-pointer hover:bg-white rounded-lg transition text-gray-600 hover:text-blue-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(fileUrl, a.originalName)}
                        className="p-2 cursor-pointer hover:bg-white rounded-lg transition text-gray-600 hover:text-green-600"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </div>
    </Dialog>
  );
}