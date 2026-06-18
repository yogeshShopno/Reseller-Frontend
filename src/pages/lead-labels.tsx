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
import { toast } from 'react-toastify';

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

type LeadLabel = {
    _id: string;
    name: string;
    color: string;
    order: number;
    count?: number;
    createdAt?: string;
    updatedAt?: string;
};

// Validation schema
const validationSchema = Yup.object({
    name: Yup.string()
        .required('Label name is required')
        .min(2, 'Label name must be at least 2 characters')
        .max(50, 'Label name must be at most 50 characters')
        .matches(/^[a-zA-Z0-9\s&-]+$/, 'Label name can only contain letters, numbers, spaces, &, and -'),
    
    color: Yup.string()
        .required('Color is required')
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color code. Use format: #RRGGBB or #RGB'),
    
    order: Yup.number()
        .required('Order is required')
        .integer('Order must be a whole number')
        .min(1, 'Order must be at least 1')
        .max(9999, 'Order must be at most 9999'),
});

/* ================= CONTENT ================= */

export function LeadLabelsContent() {
    const [allData, setAllData] = useState<LeadLabel[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 600);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [labelToDelete, setLabelToDelete] = useState<LeadLabel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const token = typeof window !== 'undefined' ? getAuthToken() : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    // Initialize formik
    const formik = useFormik({
        initialValues: {
            _id: '',
            name: '',
            color: '#3B82F6',
            order: 1,
        },
        validationSchema,
        validateOnChange: true,
        validateOnBlur: true,
        onSubmit: async (values) => {
            await saveLeadLabel(values);
        },
        enableReinitialize: true,
    });

    /* ================= LOAD DATA ================= */

    const fetchData = async () => {
        try {
            const res = await axios.get(`${baseUrl.leadLabels}`, {
                headers,
                params: {
                    search: debouncedSearch || undefined,
                    page: currentPage,
                    limit: pageSize,
                },
            });

            const data = (res.data?.data as LeadLabel[]) ?? [];
            setAllData(data);
            setTotalRecords(res.data.pagination?.totalRecords || data.length);
        } catch (err: any) {
            console.error('Failed to load lead labels', err);
            setAllData([]);
            setTotalRecords(0);
            toast.error(err?.response?.data?.message || 'Failed to load lead labels');
        }
    };

    // initial load & whenever search/page/limit changes
    useEffect(() => {
        fetchData();
    }, [debouncedSearch, currentPage, pageSize]);

    /* ================= SAVE (ADD / EDIT) ================= */

    const saveLeadLabel = async (values: { _id?: string; name: string; color: string; order: number }) => {
        setIsSubmitting(true);

        const payload = {
            name: values.name.trim(),
            color: values.color,
            order: values.order
        };

        try {
            if (values._id) {
                // EDIT - use existing ID from formData
                await axios.put(`${baseUrl.leadLabels}/${values._id}`, payload, { headers });
                toast.success('Lead label updated successfully');
            } else {
                // ADD
                await axios.post(`${baseUrl.leadLabels}`, payload, { headers });
                toast.success('Lead label created successfully');
            }

            // refresh data after add/edit
            await fetchData();
            setIsDialogOpen(false);
            formik.resetForm();
        } catch (err: any) {
            console.error('Failed to save lead label', err);
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================= DELETE ================= */

    const handleDeleteClick = (row: LeadLabel) => {
        setLabelToDelete(row);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!labelToDelete) return;

        setIsDeleting(true);

        try {
            await axios.delete(`${baseUrl.leadLabels}/${labelToDelete._id}`, { headers });
            await fetchData();
            toast.success(`Lead label "${labelToDelete.name}" deleted successfully`);
            setShowDeleteDialog(false);
            setLabelToDelete(null);
        } catch (err: any) {
            console.error('Failed to delete', err);
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ================= RESET FORM ================= */

    const resetForm = () => {
        formik.resetForm();
        formik.setFieldValue('order', allData.length + 1);
        formik.setFieldValue('color', '#3B82F6');
    };

    /* ================= HANDLE EDIT ================= */

    const handleEdit = (row: LeadLabel) => {
        formik.setValues({
            _id: row._id,
            name: row.name,
            color: row.color,
            order: row.order
        });
        setIsDialogOpen(true);
    };

    /* ================= CUSTOM COLOR CELL RENDERER ================= */

    const renderColorCell = (value: string) => (
        <div className="flex items-center gap-2">
            <div
                className="w-6 h-6 rounded border border-gray-300 shadow-sm"
                style={{ backgroundColor: value }}
                title={value}
            />
            <span className="text-sm font-mono text-gray-600">{value}</span>
        </div>
    );

    /* ================= COLUMNS ================= */

    const columns: Column<LeadLabel>[] = [
        { key: 'name', label: 'Name' },
        {
            key: 'color',
            label: 'Color',
            render: renderColorCell
        },
        { key: 'order', label: 'Order' },
        {
            key: 'count',
            label: 'Used Count',
            render: (value: number) => (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {value || 0} {value === 1 ? 'lead' : 'leads'}
                </span>
            )
        },
    ];

    /* ================= UI ================= */

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Labels</h1>
                <p className="text-gray-600">
                    Manage labels to categorize your leads with different colors
                </p>
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
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                addButton={{
                    label: 'Add Label',
                    onClick: () => {
                        resetForm();
                        setIsDialogOpen(true);
                    },
                }}
            />

            {/* DELETE CONFIRMATION DIALOG */}
            <DeleteDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setLabelToDelete(null);
                }}
                title="Delete Lead Label"
                size="md"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setLabelToDelete(null);
                            }}
                            disabled={isDeleting}
                            className="px-4 cursor-pointer py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="px-4 cursor-pointer py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </button>
                    </>
                }
            >
                <div className="py-4 text-slate-700">
                    <p>
                        Are you sure you want to delete the lead label "{labelToDelete?.name}"?
                        This action cannot be undone.
                    </p>

                    {labelToDelete?.count && labelToDelete.count > 0 && (
                        <div className="mt-3 rounded-md bg-amber-50 p-3">
                            <p className="text-sm text-amber-800">
                                ⚠️ Warning: This label is currently used by <strong>{labelToDelete.count}</strong> {labelToDelete.count === 1 ? 'lead' : 'leads'}.
                                Deleting it may affect those leads.
                            </p>
                        </div>
                    )}
                </div>
            </DeleteDialog>

            {/* ADD / EDIT DIALOG */}
            <Dialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    resetForm();
                }}
                title={formik.values._id ? 'Edit Lead Label' : 'Add Lead Label'}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDialogOpen(false);
                                resetForm();
                            }}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="lead-label-form"
                            disabled={isSubmitting || !formik.isValid}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                                    {formik.values._id ? 'Updating...' : 'Saving...'}
                                </>
                            ) : (
                                formik.values._id ? 'Update' : 'Save'
                            )}
                        </button>
                    </>
                }
            >
                <form id="lead-label-form" onSubmit={formik.handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <FormInput
                        label="Label Name"
                        name="name"
                        type="text"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.name && formik.errors.name ? formik.errors.name : undefined}
                        required
                        placeholder="e.g., Hot Lead, Cold Lead, Qualified"
                        helperText="Unique name for the label"
                        disabled={isSubmitting}
                    />

                    {/* Color Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Color <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="color"
                                name="color"
                                className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formik.values.color}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={isSubmitting}
                            />
                            <input
                                type="text"
                                name="color"
                                className={`flex-1 border rounded-lg px-3 py-2 font-mono shadow-sm focus:outline-none focus:ring-2 ${
                                    formik.touched.color && formik.errors.color
                                        ? 'border-red-500 focus:ring-red-200'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                                }`}
                                placeholder="#3B82F6"
                                value={formik.values.color}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={isSubmitting}
                            />
                        </div>
                        {formik.touched.color && formik.errors.color && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.color}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Enter hex color code (e.g., #FF0000 for red, #00FF00 for green)
                        </p>
                    </div>

                    {/* Order Field */}
                    <FormInput
                        label="Display Order"
                        name="order"
                        type="number"
                        value={formik.values.order}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.order && formik.errors.order ? formik.errors.order : undefined}
                        required
                        placeholder="Enter display order"
                        helperText="Lower numbers appear first"
                        disabled={isSubmitting}
                    />

                    {/* Preview */}
                    {formik.values.name && formik.values.color && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-5 h-5 rounded-md shadow-sm"
                                    style={{ backgroundColor: formik.values.color }}
                                />
                                <span 
                                    className="text-sm font-medium px-2 py-1 rounded-md"
                                    style={{ 
                                        backgroundColor: formik.values.color + '20',
                                        color: formik.values.color
                                    }}
                                >
                                    {formik.values.name}
                                </span>
                                <span className="text-xs text-gray-400">Example label</span>
                            </div>
                        </div>
                    )}
                </form>
            </Dialog>
        </div>
    );
}

/* ================= PAGE ================= */

export default function LeadLabelsPage() {
    return (
        <>
            <LeadLabelsContent />
        </>
    );
}