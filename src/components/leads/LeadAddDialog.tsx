import { useEffect, useState, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import Dialog from '@/components/Dialog';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import { ApiLead } from './types';
import FormInput from '../ui/Input';
import { FormSelect } from '../ui/FormSelect';
import { FileText, Download, AlertCircle } from 'lucide-react';
import LeadQuotationDialog from './LeadQuotationDialog';

interface DropdownItem { _id: string; name?: string; fullName?: string; departmentName?: string; }

interface Attachment {
  _id?: string;
  name?: string;
  originalName?: string;
  path: string;
  size?: number;
  mimeType?: string;
  filename?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: ApiLead | null;
  onLeadCreated?: (lead: any) => void;
  onLeadUpdated?: (lead: any) => void;
}

// Static schema removed - moved inside component for dynamic required fields

export default function LeadAddDialog({
  isOpen, onClose, mode, initialData,
  onLeadCreated, onLeadUpdated,
}: Props) {
  const [statuses, setStatuses] = useState<DropdownItem[]>([]);
  const [reseller, setReseller] = useState<DropdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [quotationOpen, setQuotationOpen] = useState(false);

  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  useEffect(() => {
    const loadRequiredFields = () => {
      const saved = localStorage.getItem('leadRequiredFields');
      if (saved) {
        try {
          setRequiredFields(JSON.parse(saved));
        } catch (e) {
          setRequiredFields(['customerName', 'customerContact', 'leadStatus']);
        }
      } else {
        setRequiredFields(['customerName', 'customerContact', 'leadStatus']);
      }
    };

    loadRequiredFields();
    window.addEventListener('fieldSettingsUpdated', loadRequiredFields);
    return () => window.removeEventListener('fieldSettingsUpdated', loadRequiredFields);
  }, []);

  const leadValidationSchema = useMemo(() => {
    let shape: any = {
      customerName: Yup.string()
        .min(2, 'Customer Name must be at least 2 characters')
        .max(100, 'Customer Name must not exceed 100 characters'),
      customerContact: Yup.string()
        .matches(/^\d+$/, 'Only numbers allowed')
        .length(10, 'Mobile number must be exactly 10 digits'),
      customerEmail: Yup.string()
        .email('Invalid email format')
        .max(100, 'Email must not exceed 100 characters'),
      companyName: Yup.string(),
      product: Yup.string(),
      address: Yup.string().max(500, 'Address must not exceed 500 characters'),
      leadStatus: Yup.string(),
      paymentAmount: Yup.number(),
      isActive: Yup.boolean(),
    };

    if (requiredFields.includes('customerName')) shape.customerName = shape.customerName.required('Customer Name is required');
    if (requiredFields.includes('customerContact')) shape.customerContact = shape.customerContact.required('Mobile Number is required');
    if (requiredFields.includes('leadStatus')) shape.leadStatus = Yup.string().required('Please select a stage');

    return Yup.object().shape(shape);
  }, [requiredFields]);

  const token = getAuthToken;

  const formik = useFormik({
    initialValues: {
      customerName: '',
      customerContact: '',
      customerEmail: '',
      companyName: '',
      product: '',
      address: '',
      leadStatus: '',
      paymentAmount: 0,
      isActive: true,
    },
    validationSchema: leadValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      setStatus(null);
      try {
        const payload: any = {
          customerName: values.customerName.trim(),
          customerContact: values.customerContact.trim(),
          customerEmail: values.customerEmail.trim().toLowerCase(),
          companyName: values.companyName?.trim() || "",
          product: values.product?.trim() || "",
          address: values.address?.trim() || "",
          leadStatus: values.leadStatus,
          paymentAmount: values.paymentAmount || 0,
          isActive: values.isActive,
        };

        const formData = new FormData();
        Object.keys(payload).forEach((key) => {
          formData.append(key, payload[key]);
        });
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const headers = {
          Authorization: `Bearer ${token()}`,
        };

        if (mode === 'add') {
          const res = await axios.post(baseUrl.addLead, formData, { headers });
          toast.success('Lead created successfully!');
          onLeadCreated?.(res.data?.data ?? res.data);
        } else {
          if (!initialData?._id) throw new Error('Missing lead ID');
          const res = await axios.put(`${baseUrl.updateLead}/${initialData._id}`, formData, { headers });
          toast.success('Lead updated successfully!');
          onLeadUpdated?.(res.data?.data ?? res.data);
        }
        onClose();
      } catch (error: any) {
        const msg = error.response?.data?.message || `Failed to ${mode} lead`;
        setStatus(msg);
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token()}` };

        let leadData = null;
        if (mode === 'edit' && initialData?._id) {
          const [stRes, resellerRes, deptRes, leadRes] = await Promise.all([
            axios.get(baseUrl.leadStatuses, { headers }),
            axios.get(baseUrl.getAllUsers, { headers }),
            axios.get(baseUrl.department, { headers }),
            axios.get(`${baseUrl.findLeadById}/${initialData._id}`, { headers })
          ]);
          setStatuses(stRes.data?.data || []);
          const depts = deptRes.data?.data || [];
          const users = resellerRes.data?.data || [];
          const usersWithDepts = users.map((u: any) => {
            const d = depts.find((dept: any) => dept._id === u.department);
            return { ...u, departmentName: d ? (d.roleName || d.name) : '' };
          });
          setReseller(usersWithDepts);
          leadData = leadRes.data?.data;
        } else {
          const [stRes, resellerRes, deptRes] = await Promise.all([
            axios.get(baseUrl.leadStatuses, { headers }),
            axios.get(baseUrl.getAllUsers, { headers }),
            axios.get(baseUrl.department, { headers })
          ]);
          setStatuses(stRes.data?.data || []);
          const depts = deptRes.data?.data || [];
          const users = resellerRes.data?.data || [];
          const usersWithDepts = users.map((u: any) => {
            const d = depts.find((dept: any) => dept._id === u.department);
            return { ...u, departmentName: d ? (d.roleName || d.name) : '' };
          });
          setReseller(usersWithDepts);
        }

        if (mode === 'edit') {
          // Fallback to initialData if leadData is somehow missing
          const dataToUse = leadData || initialData;
          if (dataToUse) {
            formik.setValues({
              customerName: dataToUse.customerName || '',
              customerContact: dataToUse.customerContact || '',
              customerEmail: dataToUse.customerEmail || '',
              companyName: dataToUse.companyName || '',
              product: dataToUse.product || '',
              address: dataToUse.address || '',
              leadStatus: typeof dataToUse.leadStatus === 'string' ? dataToUse.leadStatus : (dataToUse.leadStatus?._id || ''),
              paymentAmount: dataToUse.paymentAmount || 0,
              isActive: dataToUse.isActive ?? true,
            });
          }
        } else {
          formik.resetForm();
        }
      } catch {
        formik.setStatus('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    formik.setStatus(null);
  }, [isOpen, mode, initialData]);


  const getFieldError = (fieldName: string) => {
    const isTouched = formik.touched[fieldName as keyof typeof formik.touched];
    const error = formik.errors[fieldName as keyof typeof formik.errors];
    return isTouched && error ? (error as string) : undefined;
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'edit' ? 'Edit Lead' : 'Add New Lead'}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={formik.isSubmitting}
              className="rounded-lg cursor-pointer border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="lead-form"
              disabled={formik.isSubmitting || loading || !formik.isValid}
              className="min-w-[80px] cursor-pointer rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {formik.isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Lead' : 'Save Lead'}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          </div>
        ) : (
          <form id="lead-form" onSubmit={formik.handleSubmit} className="space-y-4">
            {formik.status && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formik.status}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Customer Name"
                name="customerName"
                type="text"
                value={formik.values.customerName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={getFieldError('customerName')}
                required={requiredFields.includes('customerName')}
              />
              <div className="w-full mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Mobile Number
                    {requiredFields.includes('customerContact') && <span className="text-red-700 ml-1">*</span>}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    name="customerContact"
                    inputMode="numeric"
                    maxLength={10}
                    value={formik.values.customerContact}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      formik.setFieldValue('customerContact', numericOnly);
                    }}
                    onKeyDown={(e) => {
                      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                      if (allowed.includes(e.key)) return;
                      if (!/^\d$/.test(e.key)) e.preventDefault();
                    }}
                    onBlur={formik.handleBlur}
                    placeholder="Enter 10-digit number"
                    className={`w-full px-3 py-2.5 pr-52 rounded-xl bg-white/90 text-gray-800 text-sm outline-none transition-all duration-200 border-2 ${formik.touched.customerContact && formik.errors.customerContact
                        ? 'border-red-500 ring-2 ring-red-200'
                        : formik.values.customerContact.length === 10
                          ? 'border-green-500 ring-2 ring-green-200'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                  />
                </div>
                {formik.touched.customerContact && formik.errors.customerContact && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-700 flex-shrink-0" />
                    <p className="text-red-700 text-xs">{formik.errors.customerContact as string}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Email"
                name="customerEmail"
                type="email"
                value={formik.values.customerEmail}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={getFieldError('customerEmail')}
                required={requiredFields.includes('customerEmail')}
              />
              <FormInput
                label="Company Name"
                name="companyName"
                type="text"
                value={formik.values.companyName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={getFieldError('companyName')}
                required={requiredFields.includes('companyName')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Product"
                name="product"
                type="text"
                value={formik.values.product}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={getFieldError('product')}
                required={requiredFields.includes('product')}
              />
              <FormInput
                label="Payment Amount"
                name="paymentAmount"
                type="number"
                value={formik.values.paymentAmount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={getFieldError('paymentAmount')}
                required={requiredFields.includes('paymentAmount')}
              />
            </div>

            <FormInput
              label="Address"
              name="address"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={getFieldError('address')}
              as="textarea"
              required={requiredFields.includes('address')}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormSelect
                label="Stage"
                name="leadStatus"
                value={formik.values.leadStatus}
                onChange={(val) => { formik.setFieldValue('leadStatus', val); }}
                onBlur={() => formik.setFieldTouched('leadStatus')}
                options={statuses.map((s) => ({ value: s._id, label: s.name! }))}
                error={getFieldError('leadStatus')}
                placeholder="Select Stage"
                required={requiredFields.includes('leadStatus')}
              />
            </div>

            {/* Active */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formik.values.isActive}
                onChange={formik.handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Active Lead</span>
            </label>
          </form>
        )}
      </Dialog>


    </>
  );
}