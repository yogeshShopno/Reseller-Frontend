interface TableProps {
  data: Record<string, string | number>[];
  columns: string[];
}

export default function Table({ data, columns }: TableProps) {
  return (
    <div className="table-responsive rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <table className="min-w-[1000px] w-full text-sm text-slate-700 whitespace-nowrap">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {col}
              </th>
            ))} 
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-slate-400"
              >
                No records found. Try adjusting your search.
              </td>
            </tr>
          )}
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-slate-100 last:border-b-0 odd:bg-white even:bg-slate-50 hover:bg-sky-50"
            >
              {columns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-3 text-sm text-slate-700"
                >
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}