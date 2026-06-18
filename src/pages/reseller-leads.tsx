'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from '@/components/Dialog';
import DeleteDialog from '@/components/DeleteDialog';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Filter,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResellerLead {
  _id: string;
  leadId: string;
  customerName: string;
  customerEmail: string;
  product: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';
  reseller?: { _id: string; fullName: string; email: string };
  createdAt: string;
}

const STATUSES = ['Pending', 'Approved', 'Paid', 'Rejected', 'Cancelled'] as const;
type Status = typeof STATUSES[number];

const STATUS_META: Record<Status, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  Pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  Approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2 },
  Paid: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: DollarSign },
  Rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  Cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', icon: AlertCircle },
};

// ── Validation ─────────────────────────────────────────────────────────────────

const leadSchema = Yup.object({
  customerName: Yup.string().required('Customer name is required').min(2, 'At least 2 characters'),
  customerEmail: Yup.string().required('Email is required').email('Invalid email'),
  product: Yup.string().required('Product is required'),
  amount: Yup.number().typeError('Amount must be a number').min(0, 'Cannot be negative').required('Amount is required'),
  status: Yup.string().oneOf([...STATUSES]).required('Status is required'),
  resellerId: Yup.string().optional(),
});

// ── Debounce ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ResellerLeadsPage() {
  const token = typeof window !== 'undefined' ? getAuthToken() : null;

  const [leads, setLeads] = useState<ResellerLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const debouncedSearch = useDebounce(search, 500);

  // Summary counts
  const [summary, setSummary] = useState<Record<Status, number>>({
    Pending: 0, Approved: 0, Paid: 0, Rejected: 0, Cancelled: 0,
  });

  // Resellers list for dropdown (admin sees all)
  const [resellers, setResellers] = useState<{ _id: string; fullName: string }[]>([]);

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ResellerLead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResellerLead | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // ── Fetch resellers for dropdown ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    axios
      .get(baseUrl.getAllUsers, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 100 } })
      .then((res) => setResellers(res.data?.data || []))
      .catch(() => setResellers([]));
  }, [token]);

  // ── Fetch leads ─────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = { page, limit, search: debouncedSearch.trim() };
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get(baseUrl.resellerLeads, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data: ResellerLead[] = res.data?.data || [];
      const pagination = res.data?.pagination || {};
      setLeads(data);
      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.totalRecords || 0);

      // Compute summary counts from the full data (or use pagination counts)
      const counts: Record<Status, number> = { Pending: 0, Approved: 0, Paid: 0, Rejected: 0, Cancelled: 0 };
      data.forEach((l) => { if (l.status in counts) counts[l.status as Status]++; });
      setSummary(counts);
    } catch (err) {
      console.error('Failed to fetch reseller leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, debouncedSearch, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Form ────────────────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: {
      customerName: '',
      customerEmail: '',
      product: '',
      amount: '' as any,
      status: 'Pending' as Status,
      resellerId: '',
    },
    validationSchema: leadSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const payload: any = {
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          product: values.product,
          amount: Number(values.amount),
          status: values.status,
        };

        if (editingLead) {
          await axios.put(`${baseUrl.resellerLeads}/${editingLead._id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Reseller lead updated successfully');
        } else {
          await axios.post(baseUrl.createResellerLead, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Reseller lead created successfully');
        }

        setIsFormOpen(false);
        setEditingLead(null);
        formik.resetForm();
        fetchLeads();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const openAdd = () => {
    setEditingLead(null);
    formik.resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (lead: ResellerLead) => {
    setEditingLead(lead);
    formik.setValues({
      customerName: lead.customerName,
      customerEmail: lead.customerEmail,
      product: lead.product,
      amount: lead.amount,
      status: lead.status,
      resellerId: lead.reseller?._id || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${baseUrl.resellerLeads}/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Lead deleted successfully');
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete lead');
    }
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reseller Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all leads submitted by resellers.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                statusFilter === s ? `${meta.bg} ${meta.border} border-2 shadow-sm` : 'bg-white border-gray-200'
              }`}
            >
              <div className={`p-2 rounded-lg w-fit ${meta.bg}`}>
                <Icon className={`h-4 w-4 ${meta.text}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s}</p>
                <p className="text-2xl font-bold text-gray-900">{summary[s]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by customer name, email, product..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reseller</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Users className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No reseller leads found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const meta = STATUS_META[lead.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={lead._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {lead.leadId || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{lead.customerName}</p>
                          <p className="text-xs text-gray-500">{lead.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{lead.product || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-900">
                          {lead.amount ? formatAmount(lead.amount) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {lead.reseller ? (
                          <div>
                            <p className="text-sm font-medium text-gray-800">{lead.reseller.fullName}</p>
                            <p className="text-xs text-gray-400">{lead.reseller.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.text} ${meta.border}`}>
                          <Icon className="h-3 w-3" />
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(lead); setIsDeleteOpen(true); }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {Math.min((page - 1) * limit + 1, totalRecords)}–{Math.min(page * limit, totalRecords)} of {totalRecords} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingLead(null); formik.resetForm(); }}
        title={editingLead ? 'Edit Reseller Lead' : 'Add Reseller Lead'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => { setIsFormOpen(false); setEditingLead(null); formik.resetForm(); }}
              className="px-4 py-2 cursor-pointer rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
              disabled={formik.isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reseller-lead-form"
              className="px-5 py-2 cursor-pointer rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              disabled={formik.isSubmitting || !formik.isValid}
            >
              {formik.isSubmitting ? 'Saving...' : editingLead ? 'Update' : 'Create Lead'}
            </button>
          </>
        }
      >
        <form id="reseller-lead-form" onSubmit={formik.handleSubmit} className="space-y-5">
          {/* Customer Name + Email */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                name="customerName"
                value={formik.values.customerName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter customer name"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 transition-colors ${
                  formik.touched.customerName && formik.errors.customerName
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {formik.touched.customerName && formik.errors.customerName && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email <span className="text-red-500">*</span>
              </label>
              <input
                name="customerEmail"
                type="email"
                value={formik.values.customerEmail}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Enter customer email"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 transition-colors ${
                  formik.touched.customerEmail && formik.errors.customerEmail
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {formik.touched.customerEmail && formik.errors.customerEmail && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.customerEmail}</p>
              )}
            </div>
          </div>

          {/* Product + Amount */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <input
                name="product"
                value={formik.values.product}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Product or service name"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 transition-colors ${
                  formik.touched.product && formik.errors.product
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {formik.touched.product && formik.errors.product && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.product}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                name="amount"
                type="number"
                min={0}
                value={formik.values.amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="0"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 transition-colors ${
                  formik.touched.amount && formik.errors.amount
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
              {formik.touched.amount && formik.errors.amount && (
                <p className="mt-1 text-xs text-red-500">{String(formik.errors.amount)}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => formik.setFieldValue('status', s)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      formik.values.status === s
                        ? `${meta.bg} ${meta.border} ${meta.text} border-2 shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
        title="Delete Reseller Lead"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
              className="rounded-lg cursor-pointer border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg cursor-pointer bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-700">
            Are you sure you want to delete lead <strong>"{deleteTarget?.leadId}"</strong> for{' '}
            <strong>{deleteTarget?.customerName}</strong>? This action cannot be undone.
          </p>
        </div>
      </DeleteDialog>
    </div>
  );
}
