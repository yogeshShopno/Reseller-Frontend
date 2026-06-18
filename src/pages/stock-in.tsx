'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from '@/components/Dialog';
import DataTable, { Column } from '@/components/DataTable';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import DeleteDialog from '@/components/DeleteDialog';
import FormInput from '@/components/ui/Input';
import FormSelect from '@/components/ui/FormSelect';
import { PackageOpen } from 'lucide-react';

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type CategoryType = { _id: string; name: string };
type ProductType = { _id: string; name: string; categoryId: any; currentStock: number };
type TransactionType = {
  _id: string;
  categoryId: string;
  categoryName: string;
  productId: string;
  productName: string;
  type: string;
  quantity: number;
  note: string;
  createdAt: string;
};

// Validation schema for Stock In
const validationSchema = Yup.object({
  categoryId: Yup.string().required('Category is required'),
  productId: Yup.string().required('Product is required'),
  quantity: Yup.number()
    .typeError('Quantity must be a number')
    .required('Quantity is required')
    .min(1, 'Quantity must be greater than 0'),
  note: Yup.string().max(200, 'Note must be at most 200 characters'),
});

export function StockInContent() {
  const [allData, setAllData] = useState<TransactionType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 600);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const formik = useFormik({
    initialValues: { _id: '', categoryId: '', productId: '', quantity: '' as any, note: '' },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => { await saveTransaction(values); },
    enableReinitialize: true,
  });

  const fetchCategoriesAndProducts = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get(baseUrl.category, { headers }),
        axios.get(baseUrl.product, { headers })
      ]);
      setCategories(catRes.data?.data || []);
      setProducts(prodRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load filters', err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${baseUrl.stock}?type=IN`, { headers });
      const data = (res.data?.data as any[]) ?? [];
      const items: TransactionType[] = data.map((i) => ({
        _id: i._id,
        categoryId: i.categoryId?._id || '',
        categoryName: i.categoryId?.name || '-',
        productId: i.productId?._id || '',
        productName: i.productId?.name || '-',
        type: i.type,
        quantity: i.quantity,
        note: i.note || '-',
        createdAt: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-',
      }));

      let filteredItems = items;
      if (debouncedSearch) {
        filteredItems = items.filter(item => 
          item.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          item.categoryName.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }
      setAllData(filteredItems);
      setTotalRecords(filteredItems.length); 
    } catch (err) {
      console.error('Failed to load transactions', err);
      setAllData([]);
    }
  };

  useEffect(() => { fetchCategoriesAndProducts(); }, []);
  useEffect(() => { fetchData(); }, [debouncedSearch, currentPage, pageSize]);

  const saveTransaction = async (values: any) => {
    setIsSubmitting(true);
    const payload = { 
      categoryId: values.categoryId, 
      productId: values.productId, 
      type: 'IN', 
      quantity: Number(values.quantity), 
      note: values.note 
    };

    try {
      if (values._id) {
        await axios.patch(`${baseUrl.stock}/${values._id}`, payload, { headers });
      } else {
        await axios.post(baseUrl.stock, payload, { headers });
      }
      await fetchData();
      await fetchCategoriesAndProducts(); // refresh product currentStock
      setIsDialogOpen(false);
      formik.resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (row: TransactionType) => {
    setTransactionToDelete(row);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await axios.delete(`${baseUrl.stock}/${transactionToDelete._id}`, { headers });
      await fetchData();
      await fetchCategoriesAndProducts();
      setShowDeleteDialog(false);
      setTransactionToDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // UI Derived state
  const availableProducts = useMemo(() => {
    if (!formik.values.categoryId) return [];
    return products.filter((p) => {
      const cId = p.categoryId?._id || p.categoryId;
      return cId === formik.values.categoryId;
    });
  }, [products, formik.values.categoryId]);

  const selectedProductCurrentStock = useMemo(() => {
    if (!formik.values.productId) return 0;
    const prod = products.find(p => p._id === formik.values.productId);
    return prod?.currentStock || 0;
  }, [products, formik.values.productId]);

  const columns: Column<TransactionType>[] = [
    { key: 'categoryName', label: 'CATEGORY' },
    { key: 'productName', label: 'PRODUCT NAME' },
    { key: 'quantity', label: 'QUANTITY' },
    { key: 'note', label: 'NOTE' },
    { key: 'createdAt', label: 'DATE' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Stock In Management</h1>
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
        onSearch={(v) => { setSearch(v); setCurrentPage(1); }}
        onPageChange={setCurrentPage}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        onEdit={(row) => {
          formik.setValues({
            _id: row._id,
            categoryId: row.categoryId,
            productId: row.productId,
            quantity: row.quantity,
            note: row.note === '-' ? '' : row.note,
          });
          setIsDialogOpen(true);
        }}
        onDelete={handleDeleteClick}
        addButton={{
          label: 'Add Stock In',
          onClick: () => { formik.resetForm(); setIsDialogOpen(true); },
        }}
      />

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setTransactionToDelete(null); }}
        title="Delete Stock In"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setShowDeleteDialog(false); setTransactionToDelete(null); }}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="py-4 text-slate-700">Are you sure you want to delete this transaction?</p>
      </DeleteDialog>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); formik.resetForm(); }}
        title="ADD STOCK IN"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setIsDialogOpen(false); formik.resetForm(); }}
              className="px-6 py-2 rounded-lg border border-slate-300 bg-white text-blue-600 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="stock-in-form"
              className="px-6 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
              disabled={isSubmitting || !formik.isValid}
            >
              Add Stock In
            </button>
          </>
        }
      >
        <form id="stock-in-form" onSubmit={formik.handleSubmit} className="space-y-4 pt-6">
          <FormSelect
            label="Category"
            required
            name="categoryId"
            value={formik.values.categoryId}
            onChange={(e) => { 
              formik.setValues({ ...formik.values, categoryId: e, productId: '' });
            }}
            onBlur={() => formik.setFieldTouched('categoryId', true)}
            options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
            placeholder="-- Select Category --"
            error={formik.touched.categoryId && formik.errors.categoryId ? formik.errors.categoryId : undefined}
          />

          <FormSelect
            label="Product"
            required
            name="productId"
            value={formik.values.productId}
            onChange={(e) => { formik.setFieldValue('productId', e); }}
            onBlur={() => formik.setFieldTouched('productId', true)}
            options={availableProducts.map((prod) => ({ value: prod._id, label: prod.name }))}
            placeholder="-- Select Product --"
            error={formik.touched.productId && formik.errors.productId ? formik.errors.productId : undefined}
          />

          {formik.values.productId && (
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Current Stock</label>
              <div className="flex items-center rounded border border-green-200 bg-green-50 overflow-hidden">
                <div className="bg-[#16A34A] text-white p-3">
                  <PackageOpen size={20} />
                </div>
                <div className="px-4 font-bold text-lg text-green-700">
                  {selectedProductCurrentStock}
                </div>
              </div>
            </div>
          )}

          <FormInput
            label="Quantity"
            required
            name="quantity"
            type="number"
            value={formik.values.quantity}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.quantity && formik.errors.quantity ? String(formik.errors.quantity) : undefined}
            placeholder="Enter quantity to add"
          />

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              name="note"
              value={formik.values.note}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Optional (e.g. Supplier name, Invoice no.)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              rows={3}
            />
            {formik.touched.note && formik.errors.note && (
              <p className="text-sm text-red-600">{formik.errors.note}</p>
            )}
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function StockInPage() {
  return <StockInContent />;
}
