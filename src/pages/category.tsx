'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from '@/components/Dialog';
import DataTable, { Column } from '@/components/DataTable';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import DeleteDialog from '@/components/DeleteDialog';
import FormInput from '@/components/ui/Input';

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

/* ================= TYPES ================= */

type CategoryItem = {
  _id: string;
  name: string;
  createdAt: string;
};

// Validation schema
const validationSchema = Yup.object({
  name: Yup.string()
    .required('Category name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
});

export function CategoryContent() {
  const [allData, setAllData] = useState<CategoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 600);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  // Initialize formik
  const formik = useFormik({
    initialValues: {
      _id: '',
      name: '',
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      await saveCategory(values);
    },
    enableReinitialize: true,
  });

  const fetchData = async () => {
    try {
      const res = await axios.get(baseUrl.category, {
        headers,
        params: {
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        },
      });

      const data = (res.data?.data as { _id: string; name?: string; createdAt?: string }[]) ?? [];
      const items: CategoryItem[] = data.map((i) => ({
        _id: i._id,
        name: i.name || '',
        createdAt: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-',
      }));

      // Filter locally if search is present (if backend doesn't support search yet)
      let filteredItems = items;
      if (debouncedSearch) {
        filteredItems = items.filter(item => 
          item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      setAllData(filteredItems);
      setTotalRecords(filteredItems.length); // Mock pagination if backend doesn't paginate
    } catch (err) {
      console.error('Failed to load categories', err);
      setAllData([]);
      setTotalRecords(0);
    }
  };

  // initial load & whenever search/page/limit changes
  useEffect(() => {
    fetchData();
  }, [debouncedSearch, currentPage, pageSize]);

  /* ================= SAVE (ADD / EDIT) ================= */

  const saveCategory = async (values: { _id?: string; name: string }) => {
    setIsSubmitting(true);
    
    const payload = { name: values.name.trim() };

    try {
      if (values._id) {
        await axios.patch(`${baseUrl.category}/${values._id}`, payload, { headers });
      } else {
        await axios.post(baseUrl.category, payload, { headers });
      }
      await fetchData();
      
      setIsDialogOpen(false);
      formik.resetForm();
    } catch (err) {
      console.error('Failed to save category', err);
      alert('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (row: CategoryItem) => {
    setCategoryToDelete(row);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await axios.delete(`${baseUrl.category}/${categoryToDelete._id}`, { headers });
      await fetchData();
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Failed to delete', err);
      alert('Delete failed');
    }
  };

  const columns: Column<CategoryItem>[] = [
    { key: 'name', label: 'CATEGORY NAME' },
    { key: 'createdAt', label: 'CREATED DATE' },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={allData}
        columns={columns}
        searchable
        pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalRecords / pageSize)}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onSearch={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
        onEdit={(row) => {
          formik.setValues({
            _id: row._id,
            name: row.name,
          });
          setIsDialogOpen(true);
        }}
        onDelete={handleDeleteClick}
        addButton={{
          label: 'Add Category',
          onClick: () => {
            formik.resetForm();
            setIsDialogOpen(true);
          },
        }}
      />

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowDeleteDialog(false);
                setCategoryToDelete(null);
              }}
              className="px-4 cursor-pointer py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 cursor-pointer py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="py-4 text-slate-700">
          <p>
            Are you sure you want to delete the category "{categoryToDelete?.name}"? 
            This action cannot be undone.
          </p>
        </div>
      </DeleteDialog>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          formik.resetForm();
        }}
        title={formik.values._id ? 'EDIT CATEGORY' : 'ADD CATEGORY'}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                formik.resetForm();
              }}
              className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-blue-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="category-form"
              className="px-6 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !formik.isValid}
            >
              {isSubmitting 
                ? 'Wait...' 
                : formik.values._id 
                  ? 'Update' 
                  : 'Add'
              }
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
          <FormInput
            label="Category Name"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
            required
            placeholder="Enter category name"
          />
        </form>
      </Dialog>
    </div>
  );
}

export default function CategoryPage() {
  return <CategoryContent />;
}
