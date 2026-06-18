'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from './Dialog';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import FormInput from './ui/Input';
import FormSelect from './ui/FormSelect';
import { FiCamera } from 'react-icons/fi';

interface Reseller {
  image?: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  commissionRate?: string;
  Notes?: string;
  status?: string;
  id?: string;
}

interface ResellerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Reseller | null;
}

// Validation schema
const validationSchema = Yup.object({
  fullName: Yup.string()
    .required('Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),

  phone: Yup.string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),

  email: Yup.string()
    .required('Email is required')
    .email('Invalid email format'),

  password: Yup.string()
    .when('$isUpdate', {
      is: false,
      then: (schema) => schema.required('Password is required').min(6, 'Password must be at least 6 characters'),
      otherwise: (schema) => schema.notRequired(),
    }),

  commissionRate: Yup.string().optional(),
  address: Yup.string().optional(),
  city: Yup.string().optional(),
  state: Yup.string().optional(),
  pincode: Yup.string().optional(),
  Notes: Yup.string().optional(),
});

export default function ResellerForm({
  isOpen,
  onClose,
  onSubmit: parentOnSubmit,
  initialData,
}: ResellerFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const isUpdate = !!initialData?.id;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(getAuthToken());
    }
  }, []);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      commissionRate: '',
      Notes: '',
      status: 'active',
      id: undefined as string | undefined,
      image: undefined as string | undefined,
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    // @ts-ignore
    context: { isUpdate },
    onSubmit: async (values) => {
      await handleSubmit(values);
    },
    enableReinitialize: true,
  });

  const resetForm = () => {
    formik.resetForm();
    setSelectedFile(null);
    setPreviewImage(null);
    setShowPassword(false);
    setError(null);
  };

  useEffect(() => {
    if (initialData?.id) {
      formik.setValues({
        id: initialData.id,
        image: initialData.image,
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        password: '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        commissionRate: initialData.commissionRate || '',
        Notes: initialData.Notes || '',
        status: initialData.status || 'active',
      });

      if (initialData.image) {
        setPreviewImage(
          initialData.image.startsWith('http')
            ? initialData.image
            : `${process.env.NEXT_PUBLIC_IMAGE_URL}/images/ResellerProfileImages/${initialData.image}`
        );
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, JPG, and GIF images are allowed');
      toast.error('Only JPEG, PNG, JPG, and GIF images are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('fullName', values.fullName);
      payload.append('phone', values.phone);
      payload.append('email', values.email);
      if (values.address) payload.append('address', values.address);
      if (values.city) payload.append('city', values.city);
      if (values.state) payload.append('state', values.state);
      if (values.pincode) payload.append('pincode', values.pincode);
      if (values.commissionRate) payload.append('commissionRate', values.commissionRate);
      if (values.Notes) payload.append('Notes', values.Notes);
      payload.append('status', values.status || 'active');

      if (values.password && values.password.trim()) {
        payload.append('password', values.password);
      }

      if (selectedFile) {
        payload.append('profileImage', selectedFile);
      }

      const headers = { Authorization: `Bearer ${token}` };

      const response = isUpdate
        ? await axios.put(`${baseUrl.userUpdate}/${values.id}`, payload, { headers })
        : await axios.post(baseUrl.userAdd, payload, { headers });

      parentOnSubmit?.(response.data);
      toast.success(isUpdate ? 'Reseller updated successfully' : 'Reseller created successfully');

      if (!isUpdate) resetForm();
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Something went wrong';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isUpdate ? 'Edit Reseller' : 'Add Reseller'}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 cursor-pointer rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reseller-form"
            className="px-4 py-2 cursor-pointer rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !formik.isValid}
          >
            {loading ? 'Saving...' : isUpdate ? 'Update' : 'Add'}
          </button>
        </>
      }
    >
      <form id="reseller-form" onSubmit={formik.handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Profile Image */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <FiCamera className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <label
              htmlFor="reseller-profile-image"
              className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-1.5 text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <FiCamera className="h-4 w-4" />
              <input
                id="reseller-profile-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          {!isUpdate && 'Upload a profile image (JPEG, PNG, JPG, GIF, max 5MB)'}
          {isUpdate && previewImage && 'Click camera icon to change image'}
          {isUpdate && !previewImage && 'Upload a profile image'}
        </p>

        {/* Full Name + Phone */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Full Name"
            name="fullName"
            type="text"
            value={formik.values.fullName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.fullName && formik.errors.fullName ? formik.errors.fullName : undefined}
            required
            placeholder="Enter full name"
          />
          <FormInput
            label="Mobile Number"
            name="phone"
            type="tel"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.phone && formik.errors.phone ? formik.errors.phone : undefined}
            required
            placeholder="Enter mobile number"
          />
        </div>

        {/* Email + Password */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
            required
            placeholder="Enter email"
          />
          <FormInput
            label={isUpdate ? 'New Password (optional)' : 'Password'}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
            required={!isUpdate}
            placeholder={isUpdate ? 'Leave blank to keep current' : 'Enter password'}
          />
        </div>

        {/* Commission Rate + Status */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Commission Rate (%)"
            name="commissionRate"
            type="text"
            value={formik.values.commissionRate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. 10"
          />
          <FormSelect
            label="Status"
            name="status"
            value={formik.values.status}
            onChange={(val) => formik.setFieldValue('status', val)}
            onBlur={() => formik.setFieldTouched('status', true)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="— Select Status —"
          />
        </div>

        {/* Address */}
        <FormInput
          label="Address"
          name="address"
          type="text"
          value={formik.values.address}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="Enter address"
        />

        {/* City + State + Pincode */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormInput
            label="City"
            name="city"
            type="text"
            value={formik.values.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="City"
          />
          <FormInput
            label="State"
            name="state"
            type="text"
            value={formik.values.state}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="State"
          />
          <FormInput
            label="Pincode"
            name="pincode"
            type="text"
            value={formik.values.pincode}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Pincode"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="Notes"
            value={formik.values.Notes}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Additional notes about this reseller..."
          />
        </div>
      </form>
    </Dialog>
  );
}