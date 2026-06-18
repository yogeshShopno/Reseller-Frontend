'use client';

import { useEffect, useState, useCallback } from 'react';
import DataTable, { Column } from '@/components/DataTable';
import ResellerForm from '@/components/ResellerManagement';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import DeleteDialog from '@/components/DeleteDialog';

interface Reseller {
  id: string;
  image?: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  role?: any;
  teams?: any[];
  organizations?: any[];
}

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function UserContent() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const debouncedSearch = useDebounce(search, 500);
  const token = typeof window !== 'undefined' ? getAuthToken() : null;

  const [setupPermissions, setSetupPermissions] = useState<{
    create?: boolean;
    readAll?: boolean;
    update?: boolean;
    delete?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    axios
      .get(baseUrl.currentReseller, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const role = res.data?.data?.role || {};
        // Admin has full access by default
        if (role.roleName === 'admin') {
          setSetupPermissions({ create: true, readAll: true, update: true, delete: true });
        } else {
          const rawPerms = Array.isArray(role.permissions) ? role.permissions[0] : role.permissions || {};
          setSetupPermissions(rawPerms.setup || rawPerms.reseller || null);
        }
      })
      .catch(() => setSetupPermissions(null));
  }, [token]);

  const fetchResellers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(baseUrl.getAllUsers, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: { page, limit, search: debouncedSearch.trim() },
      });

      const payload = (res.data?.data as any[]) || [];
      const pagination = res.data?.pagination || {};

      const formatted: Reseller[] = payload.map((item: any) => ({
        id: item._id,
        image: item.profileImage || '',
        fullName: item.fullName || '',
        phone: item.phone || '',
        email: item.email || '',
        status: item.status || 'active',
        role: item.role,
        teams: item.teams || [],
        organizations: item.organizations || [],
      }));

      setResellers(formatted);
      setTotalPages(pagination.totalPages || 1);
      setTotalRecords(pagination.totalRecords || 0);

      if (page > (pagination.totalPages || 1)) {
        setPage(pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch resellers:', error);
      setResellers([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, token]);

  useEffect(() => {
    fetchResellers();
  }, [fetchResellers]);

  const columns: Column<Reseller>[] = [
    {
      key: 'image',
      label: 'IMAGE',
      render: (value, row) => (
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-100">
          {value ? (
            <img
              src={value.startsWith('http') ? value : `${process.env.NEXT_PUBLIC_IMAGE_URL}/images/ResellerProfileImages/${value}`}
              alt={row.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {row.fullName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'fullName',
      label: 'FULL NAME',
      render: (value) => <span className="font-semibold text-gray-800">{value}</span>,
    },
    { key: 'phone', label: 'PHONE' },
    {
      key: 'email',
      label: 'EMAIL',
      render: (value) => (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-sm">
          {value}
        </a>
      ),
    },
    {
      key: 'role',
      label: 'ROLE',
      render: (value) => <span className="text-sm font-medium text-gray-600">{value?.roleName || 'N/A'}</span>,
    },
    {
      key: 'teams',
      label: 'TEAMS',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value?.length > 0 ? value.map((t: any) => t.name || t.teamName).join(', ') : 'None'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (value) => (
        <span className="text-sm font-medium text-gray-700">{value ? `${value}%` : '—'}</span>
      ),
    },
    {
      key: 'city',
      label: 'CITY',
      render: (value) => <span className="text-sm text-gray-600">{value || '—'}</span>,
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (value) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value?.toLowerCase() === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {value?.charAt(0)?.toUpperCase() + value?.slice(1) || '—'}
        </span>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingReseller(null);
    setIsFormOpen(true);
  };

  const handleEdit = async (row: Reseller) => {
    try {
      const res = await axios.get(`${baseUrl.findUserById}/${row.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const item = res.data?.data;
      if (!item) throw new Error('Reseller not found');

      setEditingReseller({
        id: item._id,
        image: item.profileImage || '',
        fullName: item.fullName || '',
        phone: item.phone || '',
        email: item.email || '',
        status: item.status || 'active',
        role: item.role,
        teams: item.teams || [],
        organizations: item.organizations || [],
      });
      setIsFormOpen(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load reseller details');
    }
  };

  const handleDeleteClick = (row: Reseller) => {
    setResellerToDelete(row);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!resellerToDelete) return;
    try {
      await axios.delete(`${baseUrl.deleteUser}/${resellerToDelete.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      fetchResellers();
      toast.success('Reseller deleted successfully');
      setShowDeleteDialog(false);
      setResellerToDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete reseller');
    }
  };

  const handleSubmit = () => {
    fetchResellers();
    setIsFormOpen(false);
    setEditingReseller(null);
  };

  const canCreate = !!setupPermissions?.create;
  const canUpdate = !!setupPermissions?.update;
  const canDelete = !!setupPermissions?.delete;

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Resellers</h1>
          <p className="text-sm text-gray-500">Manage all reseller partners and their details.</p>
        </div>

        <DataTable
          data={resellers}
          columns={columns}
          searchable
          pagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setLimit(size);
            setPage(1);
          }}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onEdit={canUpdate ? handleEdit : undefined}
          onDelete={canDelete ? handleDeleteClick : undefined}
          actions
          addButton={
            canCreate
              ? { label: 'Add Reseller', onClick: handleAdd }
              : undefined
          }
        />
      </div>

      {/* Delete Confirmation */}
      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setResellerToDelete(null);
        }}
        title="Delete Reseller"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setShowDeleteDialog(false); setResellerToDelete(null); }}
              className="rounded-lg cursor-pointer border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        <div className="py-4">
          <p className="text-gray-700">
            Are you sure you want to delete reseller <strong>"{resellerToDelete?.fullName}"</strong>?
            This action cannot be undone.
          </p>
        </div>
      </DeleteDialog>

      {/* Add / Edit Reseller Form */}
      <ResellerForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingReseller(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingReseller}
      />
    </>
  );
}

export default function ResellerList() {
  return <UserContent />;
}
