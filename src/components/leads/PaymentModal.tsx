'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { baseUrl, getAuthToken } from '@/config';
import { ApiLead } from './types';

interface Payment {
  _id: string;
  amount: number;
  date: string;
  mode: 'Cash' | 'GPay' | 'Bank Transfer';
  proof?: {
    originalName: string;
    filename: string;
    path: string;
  };
  createdAt: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  lead: ApiLead | null;
  onClose: () => void;
  onPaymentAdded?: () => void;
}

export default function PaymentModal({ isOpen, lead, onClose, onPaymentAdded }: PaymentModalProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Cash' as const,
    proof: null as File | null,
  });

  useEffect(() => {
    if (isOpen && lead) {
      fetchPayments();
    }
  }, [isOpen, lead]);

  const fetchPayments = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await axios.get(`${baseUrl.leadPayments}/${lead._id}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(res.data?.data?.payments || []);
      setTotalReceived(res.data?.data?.totalReceived || 0);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    
    setSaving(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('amount', form.amount);
      formData.append('date', form.date);
      formData.append('mode', form.mode);
      if (form.proof) {
        formData.append('proof', form.proof);
      }

      await axios.post(`${baseUrl.leadPayments}/${lead._id}/payments`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Payment added successfully!');
      setShowAddPayment(false);
      setForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        mode: 'Cash',
        proof: null,
      });
      await fetchPayments();
      onPaymentAdded?.();
    } catch (err) {
      console.error('Failed to add payment:', err);
      toast.error('Failed to add payment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {showAddPayment ? 'Add Payment' : 'Payment History'}
          </h2>
          <button
            onClick={() => {
              if (showAddPayment) {
                setShowAddPayment(false);
              } else {
                onClose();
              }
            }}
            className="p-2 hover:bg-white/20 rounded-lg text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddPayment ? (
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-orange-600">₹</span> Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">📅</span> Payment Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-purple-600">💳</span> Payment Mode <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Cash', 'GPay', 'Bank Transfer'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, mode })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${
                        form.mode === mode
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="text-green-600">📷</span> Payment Proof (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setForm({ ...form, proof: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {form.proof && (
                  <p className="text-sm text-gray-600 mt-1">{form.proof.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP — Max 2MB</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Payment
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Total Received */}
              <div className="bg-blue-900 text-white px-4 py-3 rounded-lg flex items-center justify-between">
                <span className="font-bold">Total Received</span>
                <span className="text-lg font-bold flex items-center gap-2">
                  <span className="text-blue-300">₹</span>
                  {totalReceived.toLocaleString()}
                </span>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No payments yet</p>
                  <p className="text-sm mt-1">Add your first payment above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-orange-600">₹</span>
                            {payment.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.date).toLocaleDateString('en-IN')} • {payment.mode}
                          </p>
                        </div>
                        {payment.proof && (
                          <a
                            href={payment.proof.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View Proof
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAddPayment && (
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
