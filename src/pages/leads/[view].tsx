// pages/leads/[view].tsx
// Unified Leads Page - handles both 'list' and 'kanban' views
// View is persisted in localStorage AND reflected in the URL

import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { ListCollapse, Plus, Filter, Kanban, Search, Download, Upload } from 'lucide-react';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';

// ── Sub-components ──────────────────────────────────────────────────────────
import LeadsListView from '@/components/leads/LeadsListView';
import LeadsKanbanView from '@/components/leads/LeadsKanbanView';
import LeadAddDialog from '@/components/leads/LeadAddDialog';
import LeadViewDialog from '@/components/leads/LeadViewDialog';
import LeadBulkImportDialog from '@/components/leads/LeadBulkImportDialog';
import { PageSkeleton, KanbanColumnSkeleton } from '@/components/ui/Skeleton';

// ── Types ────────────────────────────────────────────────────────────────────
import {
  ApiLead,
} from '@/components/leads/types';

// ── Hooks / Config ───────────────────────────────────────────────────────────
import { useLeadsData } from '@/components/leads/useLeadsData';
import FormInput from '@/components/ui/Input';
import { FormMultiSelect } from '@/components/ui/FormSelect';

export type ViewMode = 'list' | 'kanban';
export type KanbanSubView = 'board' | 'lost' | 'won';

// ── Utils ──────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function LeadsPage() {
  const router = useRouter();
  const { view: viewParam } = router.query;

  // ── Active view (list | kanban) ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // ── Kanban sub-view — lifted here so hook knows which data to fetch ───────
  const [kanbanSubView, setKanbanSubView] = useState<KanbanSubView>('board');

  // ── Search & Filters ─────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [staffFilter, setStaffFilter] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  // ── Dialogs ──────────────────────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<ApiLead | null>(null);
  const [viewingLead, setViewingLead] = useState<ApiLead | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

  // ── Permissions ──────────────────────────────────────────────────────────
  const [leadPermissions, setLeadPermissions] = useState<{
    create?: boolean;
    readAll?: boolean;
    readOwn?: boolean;
    update?: boolean;
    delete?: boolean;
    assign?: boolean;
    transfer?: boolean;
    convert?: boolean;
  } | null>(null);

  const token = typeof window !== 'undefined' ? getAuthToken() : null;

  // ── Fetch permissions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchPermissions = async () => {
      try {
        const res = await axios.get(baseUrl.currentStaff, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const role = res.data?.data?.role || {};
        const rawPerms = Array.isArray(role.permissions)
          ? role.permissions[0]
          : role.permissions || {};

        const lp = rawPerms.lead || {};
        setLeadPermissions(lp);
        if (!lp.readAll && lp.readOwn) setActiveTab('my');
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setLeadPermissions(null);
      }
    };

    fetchPermissions();
  }, [token]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter.length > 0 ? statusFilter.join(',') : '',
      source: sourceFilter.length > 0 ? sourceFilter.join(',') : '',
      staff: staffFilter.length > 0 ? staffFilter.join(',') : '',
      from: fromDate,
      to: toDate,
    }),
    [debouncedSearch, statusFilter, sourceFilter, staffFilter, fromDate, toDate]
  );

  // ── Data — pass kanbanSubView so hook fetches only what's needed ──────────
  const {
    leads,
    leadsList,
    lostLeads,
    wonLeads,
    sources,
    statuses,
    staffMembers,
    counts,
    loading,
    refetchAll,
    fetchLeadsList,
    findLeadById,
    listPagination,
    lostPagination,
    wonPagination,
  } = useLeadsData(activeTab, filters, viewMode, kanbanSubView);

  // ── Sync URL → state ─────────────────────────────────────────────────────
  useEffect(() => {
    if (viewParam === 'kanban' || viewParam === 'list') {
      setViewMode(viewParam as ViewMode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('leadsView', viewParam);
      }
    }
  }, [viewParam]);

  const switchView = (mode: ViewMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leadsView', mode);
    }
    router.push(`/leads/${mode}`, undefined, { shallow: true });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingLead(null);
    setShowAddDialog(true);
  };

  const handleEdit = (lead: ApiLead) => {
    if (!leadPermissions?.update) return;
    setEditingLead(lead);
    setShowAddDialog(true);
  };

  const handleView = (lead: ApiLead) => {
    if (!canRead) return;
    setViewingLead(lead);
  };

  const handleDialogClose = () => {
    setShowAddDialog(false);
    setEditingLead(null);
  };

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const token = getAuthToken();
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.staff) params.staff = filters.staff;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (activeTab === 'my') params.my = 'true';

      const res = await axios.get(baseUrl.exportLeads, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Permission flags ──────────────────────────────────────────────────────
  const canCreate = !!leadPermissions?.create;
  const canRead = !!(leadPermissions?.readAll || leadPermissions?.readOwn);
  const canReadAll = !!leadPermissions?.readAll;
  const canReadOwn = !!leadPermissions?.readOwn;
  const canUpdate = !!leadPermissions?.update;
  const canDelete = !!leadPermissions?.delete;
  const canAssign = !!leadPermissions?.assign;
  const canTransfer = !!leadPermissions?.transfer;
  const canConvert = !!leadPermissions?.convert;

  const clearFilters = () => {
    setStatusFilter([]);
    setSourceFilter([]);
    setStaffFilter([]);
    setFromDate('');
    setToDate('');
    setSearch('');
  };

  const hasActiveFilters = !!(
    statusFilter.length > 0 ||
    sourceFilter.length > 0 ||
    staffFilter.length > 0 ||
    fromDate ||
    toDate ||
    search
  );

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!canRead && !loading && leadPermissions !== null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-md bg-red-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-red-800">Access Denied</h2>
          <p className="mt-2 text-red-600">You don't have permission to view leads.</p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 relative overflow-hidden">
        <div className="rounded-md border border-gray-200 bg-white px-6 py-4 transition-all duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse" />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-10 w-20 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col gap-4 relative">

      {/* ── Page Header & Unified Toolbar ───────────────────────────────── */}
      <div className="rounded-md border border-gray-200 bg-white px-4 md:px-6 py-4 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leads</h1>
            
            {/* Mobile View Toggle */}
            <div className="md:hidden relative flex items-center bg-gray-100 p-1 rounded-md w-fit">
              <button
                onClick={() => switchView('list')}
                className={`relative z-10 cursor-pointer flex items-center justify-center w-8 h-8 rounded-md transition-colors ${viewMode === 'list' ? 'bg-secondary text-white shadow-sm' : 'text-gray-700'}`}
              >
                <ListCollapse className="h-4 w-4" />
              </button>
              <button
                onClick={() => switchView('kanban')}
                className={`relative z-10 cursor-pointer flex items-center justify-center w-8 h-8 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-secondary text-white shadow-sm' : 'text-gray-700'}`}
              >
                <Kanban className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="w-full md:flex-1 md:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 md:ml-auto">
            {/* Tab Toggle (All/My) */}
            {canReadAll && canReadOwn && (
              <div className="flex items-center bg-gray-100 p-1 rounded-md">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${activeTab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  My
                </button>
              </div>
            )}

            {/* Advanced Filter Button */}
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-medium transition-all cursor-pointer ${
                showFilterDrawer || hasActiveFilters
                  ? 'bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100'
                  : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="h-2 w-2 bg-primary-500 rounded-full"></span>
              )}
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Export to Excel"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{exporting ? '...' : 'Export'}</span>
            </button>

            {/* Bulk Import Button */}
            {canCreate && (
              <button
                onClick={() => setShowBulkImport(true)}
                title="Bulk Import Leads"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* Desktop View toggle */}
            <div className="hidden md:flex relative items-center bg-gray-100 p-1 rounded-md w-fit">
              <button
                onClick={() => switchView('list')}
                className={`relative z-10 cursor-pointer flex items-center justify-center w-10 h-10 rounded-md transition-colors ${viewMode === 'list' ? 'bg-secondary text-white shadow-sm' : 'text-gray-700'}`}
                title="List View"
              >
                <ListCollapse className="h-5 w-5" />
              </button>
              <button
                onClick={() => switchView('kanban')}
                className={`relative z-10 cursor-pointer flex items-center justify-center w-10 h-10 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-secondary text-white shadow-sm' : 'text-gray-700'}`}
                title="Kanban View"
              >
                <Kanban className="h-5 w-5" />
              </button>
            </div>

            {/* Add Lead button */}
            {canCreate && (
              <button
                onClick={handleOpenAdd}
                className="flex cursor-pointer items-center gap-2 rounded-md bg-[#F28522] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#E67E22] hover:shadow-lg active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Lead
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Section (Inline Expandable) ────────────────────────────── */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showFilterDrawer
              ? 'grid-rows-[1fr] opacity-100 mt-4 pt-4 border-t border-gray-100'
              : 'grid-rows-[0fr] opacity-0 overflow-hidden'
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <FormMultiSelect
                  label="Lead Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e)}
                  options={statuses.map((s) => ({ value: s._id, label: s.name }))}
                />
              </div>

              <div className="space-y-2">
                <FormMultiSelect
                  label="Lead Source"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e)}
                  options={sources.map((s) => ({ value: s._id, label: s.name }))}
                />
              </div>

              <div className="space-y-2">
                <FormMultiSelect
                  label="Assigned Staff"
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e)}
                  options={staffMembers.map((s) => ({ value: s._id, label: s.fullName }))}
                />
              </div>

              <div className="space-y-2">
                <FormInput
                  label="From Date"
                  name="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <FormInput
                  label="To Date"
                  name="toDate"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="px-4 py-1.5 text-xs font-bold text-secondary bg-blue-50 hover:bg-blue-100 rounded-md transition-all cursor-pointer"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1">
        {viewMode === 'list' ? (
          <LeadsListView
            statuses={statuses}
            sources={sources}
            staffMembers={staffMembers}
            onEdit={canUpdate ? handleEdit : undefined}
            onView={handleView}
            onRefresh={refetchAll}
            scope={activeTab}
            filters={filters}
            externalLeads={leadsList}
            fetchLeadsList={fetchLeadsList}
            loading={loading}
            permissions={{
              create: canCreate,
              readAll: canReadAll,
              readOwn: canReadOwn,
              update: canUpdate,
              delete: canDelete,
              assign: canAssign,
              transfer: canTransfer,
              convert: canConvert,
            }}
            pagination={listPagination}
          />
        ) : (
          <LeadsKanbanView
            leads={leads}
            lostLeads={lostLeads}
            wonLeads={wonLeads}
            statuses={statuses}
            counts={counts?.statusCounts}
            onEdit={canUpdate ? handleEdit : undefined}
            onView={handleView}
            onRefresh={refetchAll}
            scope={activeTab}
            filters={filters}
            // Pass separate paginations for lost/won
            lostPagination={lostPagination}
            wonPagination={wonPagination}
            // Notify parent when sub-view changes so hook fetches correct data
            onSubViewChange={setKanbanSubView}
            refreshKey={boardRefreshKey}
            permissions={{
              create: canCreate,
              readAll: canReadAll,
              readOwn: canReadOwn,
              update: canUpdate,
              delete: canDelete,
              assign: canAssign,
              transfer: canTransfer,
              convert: canConvert,
            }}
          />
        )}
      </div>

      {/* ── Add / Edit Dialog ────────────────────────────────────────────── */}
      <LeadAddDialog
        isOpen={showAddDialog}
        onClose={handleDialogClose}
        mode={editingLead ? 'edit' : 'add'}
        initialData={editingLead}
        onLeadCreated={() => {
          refetchAll();
          setBoardRefreshKey((k) => k + 1);
          handleDialogClose();
        }}
        onLeadUpdated={() => {
          refetchAll();
          setBoardRefreshKey((k) => k + 1);
          handleDialogClose();
        }}
      />

      {/* ── View Dialog ──────────────────────────────────────────────────── */}
      <LeadViewDialog
        lead={viewingLead}
        statuses={statuses}
        onClose={() => setViewingLead(null)}
        onRefresh={() => {
          refetchAll();
          setBoardRefreshKey((k) => k + 1);
        }}
      />

      {/* ── Bulk Import Dialog ─────────────────────────────────────────── */}
      <LeadBulkImportDialog
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImported={() => {
          refetchAll();
          setShowBulkImport(false);
        }}
      />
    </div>
  );
}