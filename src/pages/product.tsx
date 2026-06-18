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
import FormSelect from '@/components/ui/FormSelect';

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

type CategoryType = {
  _id: string;
  name: string;
};

type ProductItem = {
  _id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  createdAt: string;
};

const validationSchema = Yup.object({
  categoryId: Yup.string().required('Category is required'),
  name: Yup.string()
    .required('Product name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
});


export function ProductContent() {
  const [allData, setAllData] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 600);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const formik = useFormik({
    initialValues: {
      _id: '',
      categoryId: '',
      name: '',
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      await saveProduct(values);
    },
    enableReinitialize: true,
  });


  const fetchCategories = async () => {
    try {
      const res = await axios.get(baseUrl.category, { headers });
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(baseUrl.product, {
        headers,
        params: {
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        },
      });

      const data = (res.data?.data as any[]) ?? [];
      const items: ProductItem[] = data.map((i) => ({
        _id: i._id,
        name: i.name || '',
        categoryName: i.categoryId?.name || '-',
        categoryId: i.categoryId?._id || i.categoryId || '',
        createdAt: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-',
      }));

      let filteredItems = items;
      if (debouncedSearch) {
        filteredItems = items.filter(item => 
          item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          item.categoryName.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      setAllData(filteredItems);
      setTotalRecords(filteredItems.length); 
    } catch (err) {
      console.error('Failed to load products', err);
      setAllData([]);
      setTotalRecords(0);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, currentPage, pageSize]);


  const saveProduct = async (values: { _id?: string; categoryId: string; name: string }) => {
    setIsSubmitting(true);
    
    const payload = { 
      categoryId: values.categoryId,
      name: values.name.trim() 
    };

    try {
      if (values._id) {
        await axios.patch(`${baseUrl.product}/${values._id}`, payload, { headers });
      } else {
        await axios.post(baseUrl.product, payload, { headers });
      }

      await fetchData();
      
      setIsDialogOpen(false);
      formik.resetForm();
    } catch (err) {
      console.error('Failed to save product', err);
      alert('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (row: ProductItem) => {
    setProductToDelete(row);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`${baseUrl.product}/${productToDelete._id}`, { headers });
      await fetchData();
      setShowDeleteDialog(false);
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete', err);
      alert('Delete failed');
    }
  };


  const columns: Column<ProductItem>[] = [
    { key: 'categoryName', label: 'CATEGORY' },
    { key: 'name', label: 'PRODUCT NAME' },
    { key: 'createdAt', label: 'DATE' },
  ];


  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
      </div>

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
            categoryId: row.categoryId,
            name: row.name,
          });
          setIsDialogOpen(true);
        }}
        onDelete={handleDeleteClick}
        addButton={{
          label: 'Add Product',
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
          setProductToDelete(null);
        }}
        title="Delete Product"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowDeleteDialog(false);
                setProductToDelete(null);
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
            Are you sure you want to delete the product "{productToDelete?.name}"? 
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
        title={formik.values._id ? 'EDIT PRODUCT' : 'ADD PRODUCT'}
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
              form="product-form"
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
        <form id="product-form" onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
          
          <FormSelect
            label="Category"
            required
            name="categoryId"
            value={formik.values.categoryId}
            onChange={(e) => { formik.setFieldValue('categoryId', e); }}
            onBlur={() => formik.setFieldTouched('categoryId', true)}
            options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
            placeholder="-- Select Category --"
            error={formik.touched.categoryId && formik.errors.categoryId ? formik.errors.categoryId : undefined}
          />

          <FormInput
            label="Product Name"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
            required
            placeholder="Enter product name"
          />
        </form>
      </Dialog>
    </div>
  );
}

export default function ProductPage() {
  return <ProductContent />;
}
