'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Dialog from './Dialog';
import axios from 'axios';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import FormInput from './ui/Input';
import FormSelect, { FormMultiSelect } from './ui/FormSelect';
import { FiCamera } from 'react-icons/fi';

interface Staff {
  id?: string;
  image?: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  role?: string;
  teams?: string[];
  organizations?: string[];
  status?: string;
}

interface StaffManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any | null;
}

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
  password: Yup.string().when('$isUpdate', {
    is: false,
    then: (schema) => schema.required('Password is required').min(6, 'Password must be at least 6 characters'),
    otherwise: (schema) => schema.notRequired(),
  }),
  role: Yup.string().required('Role is required'),
});

export default function StaffManagement({
  isOpen,
  onClose,
  onSubmit: parentOnSubmit,
  initialData,
}: StaffManagementProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [teams, setTeams] = useState<{ value: string; label: string }[]>([]);
  const [organizations, setOrganizations] = useState<{ value: string; label: string }[]>([]);

  const isUpdate = !!initialData?.id;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = getAuthToken();
      setToken(t);
      if (t) {
        axios.get(baseUrl.getAllRoles, { headers: { Authorization: `Bearer ${t}` } }).then(res => {
          setRoles((res.data?.data || []).map((r: any) => ({ value: r._id, label: r.roleName })));
        }).catch(err => console.error(err));
        
        axios.get(baseUrl.teams, { headers: { Authorization: `Bearer ${t}` } }).then(res => {
          setTeams((res.data?.data || []).map((t: any) => ({ value: t._id, label: t.name || t.teamName })));
        }).catch(err => console.error(err));

        axios.get(baseUrl.organizations, { headers: { Authorization: `Bearer ${t}` } }).then(res => {
          setOrganizations((res.data?.data || []).map((o: any) => ({ value: o._id, label: o.name || o.organizationName })));
        }).catch(err => console.error(err));
      }
    }
  }, []);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      role: '',
      teams: [] as string[],
      organizations: [] as string[],
      status: 'active',
      id: undefined as string | undefined,
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
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        password: '',
        role: initialData.role?._id || initialData.role || '',
        teams: (initialData.teams || []).map((t: any) => t._id || t),
        organizations: (initialData.organizations || []).map((o: any) => o._id || o),
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
      payload.append('role', values.role);
      payload.append('status', values.status || 'active');
      
      values.teams.forEach((t: string) => payload.append('teams', t));
      values.organizations.forEach((o: string) => payload.append('organizations', o));

      if (values.password && values.password.trim()) {
        payload.append('password', values.password);
      }

      if (selectedFile) {
        payload.append('profileImage', selectedFile);
      }

      const headers = { Authorization: `Bearer ${token}` };

      const response = isUpdate
        ? await axios.put(`${baseUrl.updateStaff}/${values.id}`, payload, { headers })
        : await axios.post(baseUrl.addStaff, payload, { headers });

      parentOnSubmit?.(response.data);
      toast.success(isUpdate ? 'Staff updated successfully' : 'Staff created successfully');

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
      title={isUpdate ? 'Edit Staff' : 'Add Staff'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 cursor-pointer rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={loading}>
            Cancel
          </button>
          <button type="submit" form="staff-form" className="px-4 py-2 cursor-pointer rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={loading || !formik.isValid}>
            {loading ? 'Saving...' : isUpdate ? 'Update' : 'Add'}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={formik.handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* Profile Image */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <FiCamera className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-1.5 text-white shadow-lg hover:bg-blue-700">
              <FiCamera className="h-4 w-4" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Full Name"
            name="fullName"
            value={formik.values.fullName}
            onChange={formik.handleChange}
            error={formik.touched.fullName && formik.errors.fullName ? formik.errors.fullName : undefined}
            required
          />
          <FormInput
            label="Mobile Number"
            name="phone"
            value={formik.values.phone}
            onChange={formik.handleChange}
            error={formik.touched.phone && formik.errors.phone ? formik.errors.phone : undefined}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Email"
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
            required
          />
          <FormInput
            label={isUpdate ? 'New Password (optional)' : 'Password'}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
            required={!isUpdate}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormSelect
            label="Role"
            name="role"
            value={formik.values.role}
            onChange={(val) => formik.setFieldValue('role', val)}
            options={roles}
            required
          />
          <FormSelect
            label="Status"
            name="status"
            value={formik.values.status}
            onChange={(val) => formik.setFieldValue('status', val)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormMultiSelect
            label="Teams"
            name="teams"
            value={formik.values.teams}
            onChange={(val) => formik.setFieldValue('teams', val)}
            options={teams}
          />
          <FormMultiSelect
            label="Organizations"
            name="organizations"
            value={formik.values.organizations}
            onChange={(val) => formik.setFieldValue('organizations', val)}
            options={organizations}
          />
        </div>
      </form>
    </Dialog>
  );
}
