import { useState, useEffect } from 'react';
import axios from 'axios';
import Dialog from '@/components/Dialog';
import { baseUrl, getAuthToken } from '@/config';
import { toast } from 'react-toastify';
import { ApiLead } from './types';
import FormInput from '../ui/Input';
import { Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: ApiLead;
  onRefresh: () => void;
}

export default function LeadQuotationDialog({ isOpen, onClose, lead, onRefresh }: Props) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [solarModule, setSolarModule] = useState('');
  const [inverter, setInverter] = useState('');
  const [options, setOptions] = useState<string[]>(['OPTION 1']);
  const [rows, setRows] = useState([
    { title: 'SOLAR MODULE MAKE', values: [''] },
    { title: 'SYSTEM CAPACITY', values: [''] },
    { title: 'METER CHARGES REGISTRATION', values: [''] },
    { title: 'CUSTOMER PAYABLE AMOUNT', values: [''] },
    { title: 'SUBSIDY', values: [''] },
    { title: 'EFFECTIVE PRICE', values: [''] },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && lead?._id) {
      // First populate with whatever we have in the prop
      if (lead.quotation) {
        setDate(lead.quotation.date ? new Date(lead.quotation.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
        setSolarModule(lead.quotation.solarModule || '');
        setInverter(lead.quotation.inverter || '');
        if (lead.quotation.options && lead.quotation.options.length > 0) {
          setOptions(lead.quotation.options);
        }
        if (lead.quotation.rows && lead.quotation.rows.length > 0) {
          setRows(lead.quotation.rows);
        }
      }

      // Then fetch the latest from server in case the prop is stale
      axios.get(`${baseUrl.findLeadById}/${lead._id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      }).then(res => {
        const latestLead = res.data.data;
        if (latestLead?.quotation && (latestLead.quotation.solarModule || latestLead.quotation.inverter || (latestLead.quotation.options && latestLead.quotation.options.length > 0) || (latestLead.quotation.rows && latestLead.quotation.rows.length > 0))) {
          setDate(latestLead.quotation.date ? new Date(latestLead.quotation.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
          setSolarModule(latestLead.quotation.solarModule || '');
          setInverter(latestLead.quotation.inverter || '');
          if (latestLead.quotation.options && latestLead.quotation.options.length > 0) {
            setOptions(latestLead.quotation.options);
          }
          if (latestLead.quotation.rows && latestLead.quotation.rows.length > 0) {
            setRows(latestLead.quotation.rows);
          }
        }
      }).catch(err => {
        console.error("Failed to fetch latest quotation data", err);
      });
    } else if (isOpen) {
      // Reset
      setDate(new Date().toISOString().substring(0, 10));
      setSolarModule('');
      setInverter('');
      setOptions(['OPTION 1']);
      setRows([
        { title: 'SOLAR MODULE MAKE', values: [''] },
        { title: 'SYSTEM CAPACITY', values: [''] },
        { title: 'METER CHARGES REGISTRATION', values: [''] },
        { title: 'CUSTOMER PAYABLE AMOUNT', values: [''] },
        { title: 'SUBSIDY', values: [''] },
        { title: 'EFFECTIVE PRICE', values: [''] },
      ]);
    }
  }, [isOpen, lead]);

  const handleAddOption = () => {
    if (options.length >= 5) {
      toast.warning('Max 5 options allowed');
      return;
    }
    const newOptions = [...options, `OPTION ${options.length + 1}`];
    setOptions(newOptions);
    setRows(rows.map(row => ({ ...row, values: [...row.values, ''] })));
  };

  const handleAddRow = () => {
    setRows([...rows, { title: '', values: Array(options.length).fill('') }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        quotation: {
          date,
          solarModule,
          inverter,
          options,
          rows
        }
      };

      await axios.put(
        `${baseUrl.updateLead}/${lead._id}`,
        payload,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      toast.success('Quotation saved successfully');
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  const handleRowTitleChange = (index: number, val: string) => {
    const newRows = [...rows];
    newRows[index].title = val;
    setRows(newRows);
  };

  const handleRowValueChange = (rowIndex: number, colIndex: number, val: string) => {
    const newRows = [...rows];
    newRows[rowIndex].values[colIndex] = val;
    setRows(newRows);
  };

  const handleOptionNameChange = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      toast.warning('At least one option is required');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    const newRows = rows.map(row => ({
      ...row,
      values: row.values.filter((_, i) => i !== index)
    }));
    setRows(newRows);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      toast.warning('At least one row is required');
      return;
    }
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={lead?.quotation && (lead.quotation.solarModule || lead.quotation.inverter || (lead.quotation.options && lead.quotation.options.length > 0) || (lead.quotation.rows && lead.quotation.rows.length > 0)) ? 'Edit Quotation' : 'Add Quotation'}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="Date *"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <FormInput
            label="Solar Module *"
            name="solarModule"
            type="text"
            value={solarModule}
            onChange={(e) => setSolarModule(e.target.value)}
          />
          <FormInput
            label="Inverter *"
            name="inverter"
            type="text"
            value={inverter}
            onChange={(e) => setInverter(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium text-gray-700">Options (Columns):</span>
            <button
              onClick={handleAddOption}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded px-2 py-1 bg-blue-50"
            >
              + Add Option
            </button>
            <span className="text-xs text-gray-400">Max 5 options</span>
          </div>
          
          <div className="overflow-x-auto border border-gray-300 rounded">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-secondary text-white">
                  <th className="p-2 border border-secondary w-64 uppercase text-xs font-bold">ROW TITLE</th>
                  {options.map((opt, i) => (
                    <th key={i} className="p-2 border border-secondary font-bold uppercase text-xs text-center relative group">
                      <div className="flex items-center justify-between gap-1">
                        <input 
                          type="text" 
                          value={opt} 
                          onChange={(e) => handleOptionNameChange(i, e.target.value)}
                          className="bg-transparent border-none text-white font-bold uppercase text-xs outline-none w-full placeholder-orange-200"
                          placeholder={`OPTION ${i+1}`}
                        />
                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="text-white hover:text-red-200 p-0.5 rounded transition-colors"
                            title="Remove Column"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 border border-secondary w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="bg-white hover:bg-gray-50 border-b border-gray-200">
                    <td className="p-1 border-r border-gray-200">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => handleRowTitleChange(rIdx, e.target.value)}
                        className="w-full uppercase text-xs font-semibold text-gray-700 px-2 py-1 outline-none border border-transparent focus:border-gray-300 focus:bg-white bg-gray-50 rounded"
                        placeholder="Row Title"
                      />
                    </td>
                    {row.values.map((val, cIdx) => (
                      <td key={cIdx} className="p-1 border-r border-gray-200">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleRowValueChange(rIdx, cIdx, e.target.value)}
                          className="w-full text-sm px-2 py-1 outline-none border border-transparent focus:border-gray-300 focus:bg-white bg-gray-50 rounded"
                          placeholder="Value"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(rIdx)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete Row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 bg-gray-50">
              <button
                onClick={handleAddRow}
                className="text-xs font-medium text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1"
              >
                + Add Row
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
