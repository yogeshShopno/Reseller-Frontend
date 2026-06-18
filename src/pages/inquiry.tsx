'use client';

import DataTable, { Column } from '@/components/DataTable';
import { FiChevronDown } from 'react-icons/fi';

interface Inquiry {
  fullName: string;
  number: string;
  email: string;
  bookDate: string;
  bookTime: string;
  status: 'Pending' | 'Completed';
  completedDate?: string;
  createdDate: string;
}

const inquiryData: Inquiry[] = [
  {
    fullName: 'Rehaan Ali',
    number: '9251982609',
    email: 'Rehaanalis08@Gmail.Com',
    bookDate: '09-02-2026',
    bookTime: '12:00 PM',
    status: 'Pending',
    createdDate: '03-02-2026 05:28 PM',
  },
  {
    fullName: 'Samiksha Shetty',
    number: '7083217722',
    email: 'Samikshashetty234@Gmail.Com',
    bookDate: '03-02-2026',
    bookTime: '03:00 PM',
    status: 'Completed',
    completedDate: '03-02-2026 05:43 PM',
    createdDate: '03-02-2026 06:56 AM',
  },
  {
    fullName: 'Manish Poddar',
    number: '9939686489',
    email: 'Camanishpoddar@Gmail.Com',
    bookDate: '02-02-2026',
    bookTime: '09:45 AM',
    status: 'Pending',
    createdDate: '01-02-2026 07:44 AM',
  },
  {
    fullName: 'MANISH PODDAR',
    number: '9939686489',
    email: 'Camanishpoddar@Gmail.Com',
    bookDate: '02-02-2026',
    bookTime: '09:45 AM',
    status: 'Pending',
    createdDate: '30-01-2026 03:55 PM',
  },
  {
    fullName: 'Bhavik Vala',
    number: '08866779008',
    email: 'Vbi04061996@Yahoo.Com',
    bookDate: '20-01-2026',
    bookTime: '09:00 AM',
    status: 'Pending',
    createdDate: '16-01-2026 11:10 AM',
  },
  {
    fullName: 'Demo',
    number: '09909929293',
    email: 'Projectmanagement.Shopno@Gmail.Com',
    bookDate: '16-01-2026',
    bookTime: '11:15 AM',
    status: 'Completed',
    completedDate: '15-01-2026 04:00 PM',
    createdDate: '15-01-2026 10:03 AM',
  },
  {
    fullName: 'Bharat',
    number: '07600670789',
    email: 'Projectmanagement.Shopno@Gmail.Com',
    bookDate: '15-01-2026',
    bookTime: '09:00 AM',
    status: 'Completed',
    completedDate: '15-01-2026 04:02 PM',
    createdDate: '15-01-2026 09:55 AM',
  },
];

export default function Inquiry() {
  const columns: Column<Inquiry>[] = [
    { key: 'fullName', label: 'FULL NAME', sortable: true },
    { key: 'number', label: 'NUMBER', sortable: true },
    { key: 'email', label: 'EMAIL', sortable: true },
    { key: 'bookDate', label: 'BOOK DATE', sortable: true },
    { key: 'bookTime', label: 'BOOK TIME', sortable: true },
    {
      key: 'status',
      label: 'STATUS',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                value === 'Completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {value}
            </span>
            <FiChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          {value === 'Completed' && row.completedDate && (
            <div className="mt-1 text-xs text-green-600">{row.completedDate}</div>
          )}
        </div>
      ),
    },
    { key: 'createdDate', label: 'CREATED DATE', sortable: true },
  ];

  return (
    <>
      <DataTable
        data={inquiryData}
        columns={columns}
        title="Inquery"
        searchable={true}
        pagination={true}
        pageSize={10}
        actions={false}
      />
    </>
  );
}
