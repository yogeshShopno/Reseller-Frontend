'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X, Upload, FileText, Image, ChevronRight, CheckCircle,
  Zap, Settings, CreditCard, FileCheck
} from 'lucide-react';
import { baseUrl, getAuthToken } from '@/config';
import { ApiLead } from './types';
import FormSelect from '@/components/ui/FormSelect';
import FormInput from '@/components/ui/Input';

interface Props {
  isOpen: boolean;
  lead: ApiLead | null;
  onClose: () => void;
  onSaved?: () => void;
}

type FileOrNull = File | null;

interface FormState {
  leadRefrance: string;
  panelMake: string;
  panelWp: string;
  noOfPanel: string;
  inverterMake: string;
  inverterKw: string;
  inverterPhase: string;
  installationRoof: string;
  discom: string;
  consumerConnectionType: string;
  elcbInstalled: string;
  elcbProvideBy: string;
  wiringType: string;
  homeFloor: string;
  walkway: string;
  walkwayLengthFeet: string;
  ladder: string;
  ladderLengthFeet: string;
  hdgiPipeMake: string;
  hdgiPipe80x40: string;
  hdgiPipe60x40: string;
  hdgiPipe40x40: string;
  hdgiPipe20x40PatiPipe: string;
  paymentMode: string;
  projectAmount: string;
  subsidyLessProject: string;
}

const EMPTY_FORM: FormState = {
  leadRefrance: '', panelMake: '', panelWp: '', noOfPanel: '',
  inverterMake: '', inverterKw: '', inverterPhase: '', installationRoof: '',
  discom: '', consumerConnectionType: '', elcbInstalled: '', elcbProvideBy: '',
  wiringType: '', homeFloor: '', walkway: '', walkwayLengthFeet: '',
  ladder: '', ladderLengthFeet: '', hdgiPipeMake: '',
  hdgiPipe80x40: '0', hdgiPipe60x40: '0', hdgiPipe40x40: '0', hdgiPipe20x40PatiPipe: '0',
  paymentMode: '', projectAmount: '', subsidyLessProject: '',
};

const PHOTO_FIELDS = [
  { key: 'photoTerraceLayout', label: 'Terrace Layout' },
  { key: 'photoPanelLayout', label: 'Panel Layout' },
  { key: 'photoSolarInstallation', label: 'Photos of where Solar will be installed' },
  { key: 'photoInverterLocation', label: 'Location where the inverter is to be installed' },
  { key: 'photoEarthingLocation', label: 'Location where the earthing is to be done' },
  { key: 'photoMeterBox', label: 'Where the meter box and ECB are installed' },
];

const REG_DOC_FIELDS = [
  { key: 'docLatestLightBill', label: 'Latest light bill' },
  { key: 'docLatestTaxBill', label: 'Latest tax bill' },
  { key: 'docCancelCheck', label: 'Cancel check' },
  { key: 'docPanCard', label: 'PAN card' },
  { key: 'docAadhaarCard', label: 'Aadhaar card' },
];

const LOAN_DOC_FIELDS = [
  { key: 'loanDocQuotation', label: 'Quotation' },
  { key: 'loanDocBankStatement', label: 'Six month bank statement' },
  { key: 'loanDocITRReturn', label: 'Three years, ITR return' },
  { key: 'loanDocPanCard', label: 'PAN card (Loan)' },
  { key: 'loanDocAadhaarCard', label: 'Aadhaar card (Loan)' },
];

type SectionKey = 'project' | 'photos' | 'regDocs' | 'payment' | 'loanDocs';

// ─── Option lists ───────────────────────────────────────────────────────────────
const PHASE_OPTS = [{ value: 'single', label: 'Single' }, { value: 'three', label: 'Three' }];
const ROOF_OPTS = [
  { value: 'rcc', label: 'RCC' },
  { value: 'gi sheet', label: 'GI Sheet' },
  { value: 'rcc+gisheet', label: 'RCC + GI Sheet' },
];
const DISCOM_OPTS = [{ value: 'dgvcl', label: 'DGVCL' }, { value: 'torrent', label: 'Torrent' }];
const CONN_TYPE_OPTS = [{ value: 'single', label: 'Single' }, { value: 'three', label: 'Three' }];
const YES_NO_OPTS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const ELCB_BY_OPTS = [{ value: 'greeneable', label: 'Greeneable' }, { value: 'customer', label: 'Customer' }];
const WIRING_OPTS = [{ value: 'open', label: 'Open' }, { value: 'consild', label: 'Consild' }];
const PAYMENT_OPTS = [{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }];

// ─── File Input Component ─────────────────────────────────────────────────────
interface FileInputProps {
  fieldKey: string;
  label: string;
  accept?: string;
  isPdf?: boolean;
  existingFiles: Record<string, any>;
  files: Record<string, FileOrNull>;
  onFileChange: (key: string, file: File | null) => void;
  error?: string;
}
const FileInput = ({ fieldKey, label, accept = '*', isPdf = false, existingFiles, files, onFileChange, error }: FileInputProps) => {
  const existing = existingFiles[fieldKey];
  const selected = files[fieldKey];
  const hasError = !!error;
  
  return (
    <div className="space-y-1 mb-4">
      <label className="block text-xs font-bold text-gray-700 mb-1.5">
        {label} <span className="text-red-700">*</span>
      </label>
      <label className={`group flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed bg-gray-50 px-4 py-3 hover:border-orange-300 hover:bg-orange-50/30 transition ${hasError ? 'border-red-700 ring-2 ring-red-300' : 'border-gray-200'}`}>
        <div className="flex-shrink-0 rounded-lg bg-gray-100 p-2 group-hover:bg-orange-100 transition">
          {isPdf
            ? <FileText className="h-4 w-4 text-gray-500 group-hover:text-orange-500" />
            : <Image className="h-4 w-4 text-gray-500 group-hover:text-orange-500" />}
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <p className="text-xs font-medium text-orange-600 truncate">{selected.name}</p>
          ) : existing ? (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> {existing.originalName || 'File uploaded'}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Click to upload {isPdf ? '(PDF)' : '(Image/PDF)'}</p>
          )}
        </div>
        <Upload className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileChange(fieldKey, e.target.files?.[0] || null)}
        />
      </label>
      {hasError && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <X size={14} className="text-red-700 flex-shrink-0" />
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-1 w-6 rounded-full bg-orange-500" />
      <h3 className="text-sm font-bold text-gray-800">{children}</h3>
    </div>
  );
}

export default function ProjectDetailDrawer({ isOpen, lead, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<Record<string, FileOrNull>>({});
  const [existingFiles, setExistingFiles] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('project');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch existing data when drawer opens
  useEffect(() => {
    if (!isOpen || !lead) return;
    setForm(EMPTY_FORM);
    setFiles({});
    setExistingFiles({});
    setActiveSection('project');
    setErrors({});

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const res = await axios.get(`${baseUrl.projectDetail}/${lead._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = res.data?.data;
        if (d) {
          setForm({
            leadRefrance: d.leadRefrance || '',
            panelMake: d.panelMake || '',
            panelWp: d.panelWp?.toString() || '',
            noOfPanel: d.noOfPanel?.toString() || '',
            inverterMake: d.inverterMake || '',
            inverterKw: d.inverterKw?.toString() || '',
            inverterPhase: d.inverterPhase || '',
            installationRoof: d.installationRoof || '',
            discom: d.discom || '',
            consumerConnectionType: d.consumerConnectionType || '',
            elcbInstalled: d.elcbInstalled || '',
            elcbProvideBy: d.elcbProvideBy || '',
            wiringType: d.wiringType || '',
            homeFloor: d.homeFloor || '',
            walkway: d.walkway || '',
            walkwayLengthFeet: d.walkwayLengthFeet?.toString() || '',
            ladder: d.ladder || '',
            ladderLengthFeet: d.ladderLengthFeet?.toString() || '',
            hdgiPipeMake: d.hdgiPipeMake || '',
            hdgiPipe80x40: d.hdgiPipe80x40?.toString() || '0',
            hdgiPipe60x40: d.hdgiPipe60x40?.toString() || '0',
            hdgiPipe40x40: d.hdgiPipe40x40?.toString() || '0',
            hdgiPipe20x40PatiPipe: d.hdgiPipe20x40PatiPipe?.toString() || '0',
            paymentMode: d.paymentMode || '',
            projectAmount: d.projectAmount?.toString() || '',
            subsidyLessProject: d.subsidyLessProject || '',
          });
          const ef: Record<string, any> = {};
          [...PHOTO_FIELDS, ...REG_DOC_FIELDS, ...LOAN_DOC_FIELDS].forEach(({ key }) => {
            if (d[key]) ef[key] = d[key];
          });
          setExistingFiles(ef);
        }
      } catch {
        // 404 = no existing data, fine
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, lead]);

  // Close on outside click (but not if click is inside a portal dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // If any portal dropdown is open, don't close
      const portals = document.querySelectorAll('[id^="portal-"]');
      for (const p of Array.from(portals)) {
        if (p.contains(e.target as Node)) return;
      }
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const handleFormChange = (key: keyof FormState, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const handleFileChange = (key: string, file: File | null) => {
    setFiles((p) => ({ ...p, [key]: file }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields: (keyof FormState)[] = [
      'leadRefrance', 'panelMake', 'panelWp', 'noOfPanel',
      'inverterMake', 'inverterKw', 'inverterPhase', 'installationRoof',
      'discom', 'consumerConnectionType', 'elcbInstalled', 'elcbProvideBy',
      'wiringType', 'homeFloor', 'walkway', 'ladder', 'hdgiPipeMake',
      'paymentMode', 'projectAmount', 'subsidyLessProject'
    ];

    requiredFields.forEach(field => {
      if (!form[field]) {
        const fieldNames: Record<string, string> = {
          leadRefrance: 'Lead Reference',
          panelMake: 'Panel Make',
          panelWp: 'Panel WP',
          noOfPanel: 'No. of Panels',
          inverterMake: 'Inverter Make',
          inverterKw: 'Inverter KW',
          inverterPhase: 'Inverter Phase',
          installationRoof: 'Installation Roof',
          discom: 'DISCOM',
          consumerConnectionType: 'Consumer Connection Type',
          elcbInstalled: 'ELCB / RCCB Installed',
          elcbProvideBy: 'ELCB / RCCB Provide By',
          wiringType: 'Wiring Type',
          homeFloor: 'Home Floor',
          walkway: 'Walkway',
          ladder: 'Ladder',
          hdgiPipeMake: 'HDGI Pipe Make',
          paymentMode: 'Payment Mode',
          projectAmount: 'Project Amount',
          subsidyLessProject: 'Subsidy Less Project'
        };
        newErrors[field] = `${fieldNames[field] || field} is required`;
      }
    });

    if (form.walkway === 'yes' && !form.walkwayLengthFeet) {
      newErrors.walkwayLengthFeet = 'Walkway Length is required';
    }
    if (form.ladder === 'yes' && !form.ladderLengthFeet) {
      newErrors.ladderLengthFeet = 'Ladder Length is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!lead) return;
    
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      setActiveSection('project');
      return;
    }

    setSaving(true);
    try {
      const token = getAuthToken();
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });

      await axios.post(`${baseUrl.projectDetail}/${lead._id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Project details saved!');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save project details');
    } finally {
      setSaving(false);
    }
  };

  const sections: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: 'project', label: 'Project Info', icon: <Settings className="h-4 w-4" /> },
    { key: 'photos', label: 'Site Photos', icon: <Image className="h-4 w-4" /> },
    { key: 'regDocs', label: 'Reg. Docs', icon: <FileCheck className="h-4 w-4" /> },
    { key: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'loanDocs', label: 'Loan Docs', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Project Details</h2>
            <p className="text-xs text-white/80 truncate">{lead?.fullName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex flex-1 min-w-[80px] flex-col items-center gap-1 px-3 py-3 text-xs font-medium transition whitespace-nowrap ${
                activeSection === s.key
                  ? 'border-b-2 border-orange-500 text-orange-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            </div>
          ) : (
            <>
              {/* ─── Project Info ───────────────────────────────────────────────── */}
              {activeSection === 'project' && (
                <div>
                  <SectionTitle>Add Details After Project Done</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormInput
                      label="Lead Reference"
                      name="leadRefrance"
                      placeholder="Lead ref..."
                      value={form.leadRefrance}
                      onChange={(e) => handleFormChange('leadRefrance', e.target.value)}
                      error={errors.leadRefrance}
                      required
                    />
                    <FormInput
                      label="Panel Make"
                      name="panelMake"
                      placeholder="e.g. Adani"
                      value={form.panelMake}
                      onChange={(e) => handleFormChange('panelMake', e.target.value)}
                      error={errors.panelMake}
                      required
                    />
                    <FormInput
                      label="Panel WP"
                      name="panelWp"
                      type="number"
                      placeholder="e.g. 540"
                      value={form.panelWp}
                      onChange={(e) => handleFormChange('panelWp', e.target.value)}
                      error={errors.panelWp}
                      required
                    />
                    <FormInput
                      label="No. of Panels"
                      name="noOfPanel"
                      type="number"
                      placeholder="e.g. 10"
                      value={form.noOfPanel}
                      onChange={(e) => handleFormChange('noOfPanel', e.target.value)}
                      error={errors.noOfPanel}
                      required
                    />
                    <FormInput
                      label="Inverter Make"
                      name="inverterMake"
                      placeholder="e.g. Growatt"
                      value={form.inverterMake}
                      onChange={(e) => handleFormChange('inverterMake', e.target.value)}
                      error={errors.inverterMake}
                      required
                    />
                    <FormInput
                      label="Inverter KW"
                      name="inverterKw"
                      type="number"
                      placeholder="e.g. 5"
                      value={form.inverterKw}
                      onChange={(e) => handleFormChange('inverterKw', e.target.value)}
                      error={errors.inverterKw}
                      required
                    />
                    <div>
                      <FormSelect
                        label="Inverter Phase"
                        name="inverterPhase"
                        value={form.inverterPhase}
                        onChange={(val) => handleFormChange('inverterPhase', val)}
                        options={PHASE_OPTS}
                        placeholder="Select..."
                        error={errors.inverterPhase}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="Installation Roof"
                        name="installationRoof"
                        value={form.installationRoof}
                        onChange={(val) => handleFormChange('installationRoof', val)}
                        options={ROOF_OPTS}
                        placeholder="Select..."
                        error={errors.installationRoof}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="DISCOM"
                        name="discom"
                        value={form.discom}
                        onChange={(val) => handleFormChange('discom', val)}
                        options={DISCOM_OPTS}
                        placeholder="Select..."
                        error={errors.discom}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="Consumer Connection Type"
                        name="consumerConnectionType"
                        value={form.consumerConnectionType}
                        onChange={(val) => handleFormChange('consumerConnectionType', val)}
                        options={CONN_TYPE_OPTS}
                        placeholder="Select..."
                        error={errors.consumerConnectionType}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="ELCB / RCCB Installed"
                        name="elcbInstalled"
                        value={form.elcbInstalled}
                        onChange={(val) => handleFormChange('elcbInstalled', val)}
                        options={YES_NO_OPTS}
                        placeholder="Select..."
                        error={errors.elcbInstalled}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="ELCB / RCCB Provide By"
                        name="elcbProvideBy"
                        value={form.elcbProvideBy}
                        onChange={(val) => handleFormChange('elcbProvideBy', val)}
                        options={ELCB_BY_OPTS}
                        placeholder="Select..."
                        error={errors.elcbProvideBy}
                        required
                      />
                    </div>
                    <div>
                      <FormSelect
                        label="Wiring Type"
                        name="wiringType"
                        value={form.wiringType}
                        onChange={(val) => handleFormChange('wiringType', val)}
                        options={WIRING_OPTS}
                        placeholder="Select..."
                        error={errors.wiringType}
                        required
                      />
                    </div>
                    <FormInput
                      label="Home Floor"
                      name="homeFloor"
                      placeholder="e.g. G+2"
                      value={form.homeFloor}
                      onChange={(e) => handleFormChange('homeFloor', e.target.value)}
                      error={errors.homeFloor}
                      required
                    />
                    <div>
                      <FormSelect
                        label="Walkway"
                        name="walkway"
                        value={form.walkway}
                        onChange={(val) => handleFormChange('walkway', val)}
                        options={YES_NO_OPTS}
                        placeholder="Select..."
                        error={errors.walkway}
                        required
                      />
                    </div>
                    {form.walkway === 'yes' && (
                      <FormInput
                        label="Walkway Length (feet)"
                        name="walkwayLengthFeet"
                        type="number"
                        value={form.walkwayLengthFeet}
                        onChange={(e) => handleFormChange('walkwayLengthFeet', e.target.value)}
                        error={errors.walkwayLengthFeet}
                        required
                      />
                    )}
                    <div>
                      <FormSelect
                        label="Ladder"
                        name="ladder"
                        value={form.ladder}
                        onChange={(val) => handleFormChange('ladder', val)}
                        options={YES_NO_OPTS}
                        placeholder="Select..."
                        error={errors.ladder}
                        required
                      />
                    </div>
                    {form.ladder === 'yes' && (
                      <FormInput
                        label="Ladder Length (feet)"
                        name="ladderLengthFeet"
                        type="number"
                        value={form.ladderLengthFeet}
                        onChange={(e) => handleFormChange('ladderLengthFeet', e.target.value)}
                        error={errors.ladderLengthFeet}
                        required
                      />
                    )}
                    <FormInput
                      label="HDGI Pipe Make"
                      name="hdgiPipeMake"
                      placeholder="e.g. Tata"
                      value={form.hdgiPipeMake}
                      onChange={(e) => handleFormChange('hdgiPipeMake', e.target.value)}
                      error={errors.hdgiPipeMake}
                      required
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mt-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">HDGI Pipe in Feet</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormInput
                        label="80 × 40"
                        name="hdgiPipe80x40"
                        type="number"
                        placeholder="0 = acceptable"
                        value={form.hdgiPipe80x40}
                        onChange={(e) => handleFormChange('hdgiPipe80x40', e.target.value)}
                      />
                      <FormInput
                        label="60 × 40"
                        name="hdgiPipe60x40"
                        type="number"
                        placeholder="0 = acceptable"
                        value={form.hdgiPipe60x40}
                        onChange={(e) => handleFormChange('hdgiPipe60x40', e.target.value)}
                      />
                      <FormInput
                        label="40 × 40"
                        name="hdgiPipe40x40"
                        type="number"
                        placeholder="0 = acceptable"
                        value={form.hdgiPipe40x40}
                        onChange={(e) => handleFormChange('hdgiPipe40x40', e.target.value)}
                      />
                      <FormInput
                        label="20 × 40 Pati Pipe"
                        name="hdgiPipe20x40PatiPipe"
                        type="number"
                        placeholder="0 = acceptable"
                        value={form.hdgiPipe20x40PatiPipe}
                        onChange={(e) => handleFormChange('hdgiPipe20x40PatiPipe', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Site Photos ─────────────────────────────────────────────────── */}
              {activeSection === 'photos' && (
                <div>
                  <SectionTitle>Required Photos for Installation</SectionTitle>
                  {PHOTO_FIELDS.map((f) => (
                    <FileInput
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      accept="image/*,application/pdf"
                      existingFiles={existingFiles}
                      files={files}
                      onFileChange={handleFileChange}
                      error={errors[f.key]}
                    />
                  ))}
                </div>
              )}

              {/* ─── Registration Docs ───────────────────────────────────────────── */}
              {activeSection === 'regDocs' && (
                <div>
                  <SectionTitle>Required Documents for Registration</SectionTitle>
                  {REG_DOC_FIELDS.map((f) => (
                    <FileInput
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      accept="image/*,application/pdf"
                      isPdf
                      existingFiles={existingFiles}
                      files={files}
                      onFileChange={handleFileChange}
                      error={errors[f.key]}
                    />
                  ))}
                </div>
              )}

              {/* ─── Payment ─────────────────────────────────────────────────────── */}
              {activeSection === 'payment' && (
                <div>
                  <SectionTitle>Payment Details</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <FormSelect
                        label="Payment Mode"
                        name="paymentMode"
                        value={form.paymentMode}
                        onChange={(val) => handleFormChange('paymentMode', val)}
                        options={PAYMENT_OPTS}
                        placeholder="Select..."
                        error={errors.paymentMode}
                        required
                      />
                    </div>
                    <FormInput
                      label="Project Amount"
                      name="projectAmount"
                      type="number"
                      placeholder="e.g. 150000"
                      value={form.projectAmount}
                      onChange={(e) => handleFormChange('projectAmount', e.target.value)}
                      error={errors.projectAmount}
                      required
                    />
                    <div>
                      <FormSelect
                        label="Subsidy Less Project"
                        name="subsidyLessProject"
                        value={form.subsidyLessProject}
                        onChange={(val) => handleFormChange('subsidyLessProject', val)}
                        options={YES_NO_OPTS}
                        placeholder="Select..."
                        error={errors.subsidyLessProject}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Loan Docs ───────────────────────────────────────────────────── */}
              {activeSection === 'loanDocs' && (
                <div>
                  <SectionTitle>Required Documents for Loan</SectionTitle>
                  {LOAN_DOC_FIELDS.map((f) => (
                    <FileInput
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      accept="image/*,application/pdf"
                      isPdf
                      existingFiles={existingFiles}
                      files={files}
                      onFileChange={handleFileChange}
                      error={errors[f.key]}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          {/* Section dot nav */}
          <div className="flex items-center gap-2">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`h-2 rounded-full transition-all ${activeSection === s.key ? 'bg-orange-500 w-5' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 active:scale-95 transition disabled:opacity-60"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
