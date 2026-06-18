import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dialog from '@/components/Dialog';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import { FormSelect } from '../ui/FormSelect';

interface ApiLead {
  _id: string;
  fullName?: string;
  followUps?: any[];
  leadStatus?: any;
  [key: string]: any;
}

interface ApiStatus {
  _id: string;
  name?: string;
  color?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: ApiLead | null;
  onSuccess: () => void;
}

export default function DashboardLeadUpdateDialog({ isOpen, onClose, lead, onSuccess }: Props) {
  const [actionType, setActionType] = useState<'done' | 'stage' | 'followup'>('stage');
  const [statuses, setStatuses] = useState<ApiStatus[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffId, setStaffId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    setActionType('stage');
    setSelectedStage(lead?.leadStatus?._id || lead?.leadStatus || '');
    setNextDate('');
    setNextTime('');
    setNote('');

    const fetchMeta = async () => {
      try {
        const headers = { Authorization: `Bearer ${getAuthToken()}` };
        const [statusRes, staffRes] = await Promise.all([
          axios.get(baseUrl.leadStatuses, { headers }),
          axios.get(baseUrl.currentStaff, { headers }).catch(() => null),
        ]);
        setStatuses(statusRes.data?.data || []);
        if (staffRes?.data?.data?._id) {
          setStaffId(staffRes.data.data._id);
        }
      } catch (error) {
        console.error('Failed to fetch statuses or staff', error);
      }
    };
    fetchMeta();
  }, [isOpen, lead]);

  const handleSubmit = async () => {
    if (!lead) return;
    setLoading(true);

    try {
      const payload: any = {};
      const leadId = lead._id;

      if (actionType === 'done') {
        // Find the "Won" status and set it
        const wonStatus = statuses.find(s => s.name?.toLowerCase() === 'won');
        if (!wonStatus) {
          toast.error('Won status not found. Please check lead statuses.');
          setLoading(false);
          return;
        }
        payload.leadStatus = wonStatus._id;
        payload.nextFollowupDate = null;
        payload.nextFollowupTime = null;

      } else if (actionType === 'stage') {
        if (!selectedStage) {
          toast.error('Please select a stage.');
          setLoading(false);
          return;
        }
        payload.leadStatus = selectedStage;

      } else if (actionType === 'followup') {
        if (!nextDate || !note) {
          toast.error('Date and Note are required for Next Follow Up.');
          setLoading(false);
          return;
        }

        const newFollowup: any = {
          date: nextDate,
          time: nextTime || '',
          note: note,
          createdAt: new Date().toISOString(),
        };
        if (staffId) newFollowup.staff = staffId;

        const existingFollowUps = lead.followUps || [];
        payload.followUps = [...existingFollowUps, newFollowup];
        payload.nextFollowupDate = nextDate;
        payload.nextFollowupTime = nextTime || '';
      }

      await axios.put(
        `${baseUrl.updateLead}/${leadId}`,
        payload,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );

      toast.success('Lead updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="UPDATE LEAD STAGE"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Action Type Radio Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="actionType"
              value="done"
              checked={actionType === 'done'}
              onChange={() => setActionType('done')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Follow Up Done</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="actionType"
              value="stage"
              checked={actionType === 'stage'}
              onChange={() => setActionType('stage')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Stage</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="actionType"
              value="followup"
              checked={actionType === 'followup'}
              onChange={() => setActionType('followup')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Next Follow up</span>
          </label>
        </div>

        {/* Dynamic Fields */}
        <div className="pt-2 border-t border-gray-100">
          {actionType === 'done' && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              This will mark the lead as <strong>Won</strong> and clear the upcoming follow-up.
            </div>
          )}

          {actionType === 'stage' && (
            <FormSelect
              label="Select Stage"
              name="stage"
              value={selectedStage}
              onChange={(val) => setSelectedStage(val)}
              options={statuses.map(s => ({ value: s._id, label: s.name || '' }))}
              placeholder="Select Stage"
            />
          )}

          {actionType === 'followup' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Next Followup Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Next Followup Time</label>
                  <input
                    type="time"
                    value={nextTime}
                    onChange={(e) => setNextTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Note <span className="text-red-500">*</span></label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter note..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
