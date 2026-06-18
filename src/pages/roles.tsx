'use client';

import { useEffect, useState, useCallback } from 'react';
import DataTable, { Column } from '@/components/DataTable';
import RoleForm from '@/components/RoleForm';
import axios from 'axios';
import { baseUrl } from '@/config';
import { getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import DeleteDialog from '@/components/DeleteDialog';

// ──────────────────────────────────────────────── Types
type CapabilityPartial = Partial<{
  create: boolean;
  readOwn: boolean;
  readAll: boolean;
  update: boolean;
  delete: boolean;
}>;

type BackendRole = {
  _id?: string;
  roleName?: string;
  name?: string;
  permissions?: Record<string, CapabilityPartial> | Array<Record<string, CapabilityPartial>>;
};

interface Role {
  id: string;
  roleName: string;
  permissions?: Record<
    string,
    {
      create?: boolean;
      readOwn?: boolean;
      readAll?: boolean;
      update?: boolean;
      delete?: boolean;
    }
  >;
}

// ──────────────────────────────────────────────── Helper functions
const normalizeCaps = (caps?: CapabilityPartial) => ({
  create: !!caps?.create,
  readOwn: !!caps?.readOwn,
  readAll: !!caps?.readAll,
  update: !!caps?.update,
  delete: !!caps?.delete,
});

// FIXED: Added all 9 features here
const normalizeRole = (r: BackendRole): Role => {
  const features = ['lead', 'task', 'taskStatus', 'staff', 'role', 'leadStatus', 'leadSource', 'leadLabel', 'teams', 'organizations'];
  const rawPerms = r?.permissions;
  const srcPerms = Array.isArray(rawPerms) ? rawPerms[0] : rawPerms || {};

  const normalizedPerms: Record<string, ReturnType<typeof normalizeCaps>> = {};
  for (const f of features) {
    normalizedPerms[f] = normalizeCaps(srcPerms[f]);
  }

  return {
    id: r?._id || '',
    roleName: r?.roleName ?? r?.name ?? '',
    permissions: normalizedPerms,
  };
};

const serializeCaps = (caps?: {
  create?: boolean;
  readOwn?: boolean;
  readAll?: boolean;
  update?: boolean;
  delete?: boolean;
}) => ({
  create: !!caps?.create,
  readOwn: !!caps?.readOwn,
  readAll: !!caps?.readAll,
  update: !!caps?.update,
  delete: !!caps?.delete,
});

// FIXED: Added all 9 features here
const toBackendRole = (r: Role): BackendRole => {
  const lead = serializeCaps(r.permissions?.lead);
  const task = serializeCaps(r.permissions?.task);
  const taskStatus = serializeCaps(r.permissions?.taskStatus);
  const staff = serializeCaps(r.permissions?.staff);
  const role = serializeCaps(r.permissions?.role);
  const leadStatus = serializeCaps(r.permissions?.leadStatus);
  const leadSource = serializeCaps(r.permissions?.leadSource);
  const leadLabel = serializeCaps(r.permissions?.leadLabel);
  const teams = serializeCaps(r.permissions?.teams);
  const organizations = serializeCaps(r.permissions?.organizations);
  
  return {
    roleName: r.roleName,
    permissions: [{ 
      lead, 
      task, 
      taskStatus,
      staff, 
      role, 
      leadStatus, 
      leadSource, 
      leadLabel, 
      teams, 
      organizations 
    }],
  };
};

// ──────────────────────────────────────────────── Debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ──────────────────────────────────────────────── Main component
export function RolesContent() {
  const [rolesData, setRolesData] = useState<Role[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Pagination + search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 500);

  const token = getAuthToken();
  const [setupPermissions, setSetupPermissions] = useState<{
    create?: boolean;
    readAll?: boolean;
    update?: boolean;
    delete?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    axios
      .get(baseUrl.currentStaff, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const role = res.data?.data?.role || {};
        const rawPerms = Array.isArray(role.permissions)
          ? role.permissions[0]
          : role.permissions || {};
        setSetupPermissions(rawPerms.role || null);
      })
      .catch(() => {
        setSetupPermissions(null);
      });
  }, [token]);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim(),
      };

      const res = await axios.get(baseUrl.getAllRoles, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const payload = res.data?.data ?? res.data?.roles ?? [];
      const pagination = res.data?.pagination ?? {};

      const normalized = Array.isArray(payload) ? payload.map(normalizeRole) : [];

      setRolesData(normalized);
      setTotalRecords(pagination.totalRecords || 0);
      setTotalPages(pagination.totalPages || 1);
      // Make sure we stay in valid page range
      if (currentPage > (pagination.totalPages || 1)) {
        setCurrentPage(pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRolesData([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, token]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refreshAfterMutation = () => {
    fetchRoles();
  };

  const columns: Column<Role>[] = [
    {
      key: 'roleName',
      label: 'DEPARTMENT NAME',
      render: (value) => (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ),
    },
  ];

  const handleEdit = async (row: Role) => {
    try {
      const res = await axios.get(`${baseUrl.findRoleById}/${row.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const backendRole = res.data?.data ?? res.data;
      const normalized = normalizeRole(backendRole);

      setEditingRole(normalized);
      setIsFormOpen(true);
    } catch (err) {
      console.error('Error fetching role by ID:', err);
      toast.error('Failed to load role details');
    }
  };

  const handleAdd = () => {
    setEditingRole(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (role: Role) => {
    try {
      const payload = toBackendRole(role);

      if (editingRole) {
        await axios.put(`${baseUrl.updateRole}/${editingRole.id}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        toast.success('Role updated successfully');
      } else {
        await axios.post(baseUrl.addRole, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        toast.success('Role created successfully');
      }

      refreshAfterMutation();
    } catch (err) {
      console.error('Failed to save role:', err);
      toast.error('Failed to save role');
    } finally {
      setIsFormOpen(false);
      setEditingRole(null);
    }
  };

  // Show delete confirmation dialog
  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteDialog(true);
  };

  // Perform actual delete
  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      await axios.delete(`${baseUrl.deleteRole}/${roleToDelete.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      refreshAfterMutation();
      toast.success('Role deleted successfully');
      
      // Close dialog
      setShowDeleteDialog(false);
      setRoleToDelete(null);
    } catch (err) {
      console.error('Failed to delete role:', err);
      toast.error('Failed to delete role');
    }
  };

  const canCreate = !!setupPermissions?.create;
  const canUpdate = !!setupPermissions?.update;
  const canDelete = !!setupPermissions?.delete;

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Department Management</h1>
        </div>

        <DataTable
          data={rolesData}
          columns={columns}
          title=""
          searchable={true}
          pagination={true}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          onSearch={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          onEdit={canUpdate ? handleEdit : undefined}
          onDelete={canDelete ? handleDeleteClick : undefined}
          actions={true}
          addButton={
            canCreate
              ? {
                  label: "Add Department",
                  onClick: handleAdd,
                }
              : undefined
          }
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setRoleToDelete(null);
        }}
        title="Delete Department"
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                setShowDeleteDialog(false);
                setRoleToDelete(null);
              }}
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
            Are you sure you want to delete the department "{roleToDelete?.roleName}"? 
            This action cannot be undone.
          </p>
        </div>
      </DeleteDialog>

      <RoleForm
        key={isFormOpen ? (editingRole ? `edit-${editingRole.id}` : 'add') : 'closed'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRole(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingRole}
      />
    </>
  );
}

export default function Roles() {
  return (
    <>
      <RolesContent />
    </>
  );
}