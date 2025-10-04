import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CwvUrlGroupRow, CwvStatus } from '@/lib/types';

type CwvTableProps = {
  data: CwvUrlGroupRow[];
  className?: string;
};

function getStatusBadge(status: CwvStatus): string {
  switch (status) {
    case 'Pass':
      return 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'Needs Improvement':
      return 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'Fail':
      return 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  }
}

function getStatusText(status: CwvStatus): string {
  switch (status) {
    case 'Pass':
      return 'Pass';
    case 'Needs Improvement':
      return 'Behöver förbättring';
    case 'Fail':
      return 'Misslyckad';
  }
}

export default function CwvTable({ data, className }: CwvTableProps) {
  return (
    <div className={`card ${className}`}>
      <h3 className="title mb-4">Detalj per sida</h3>
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[200px] xl:pl-7.5">URL</TableHead>
            <TableHead className="text-center">LCP p75</TableHead>
            <TableHead className="text-center">INP p75</TableHead>
            <TableHead className="text-center">CLS p75</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Sessions</TableHead>
            <TableHead className="text-center">Senast testad</TableHead>
            <TableHead className="text-center xl:pr-7.5">Källa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-dark-2">
              <TableCell className="font-medium text-primary dark:text-white">
                <div className="max-w-[200px] truncate" title={row.url}>
                  {row.url}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-medium">{row.lcp.p75} ms</span>
                  <span className={getStatusBadge(row.lcp.status)}>
                    {getStatusText(row.lcp.status)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-medium">{row.inp.p75} ms</span>
                  <span className={getStatusBadge(row.inp.status)}>
                    {getStatusText(row.inp.status)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-medium">{row.cls.p75}</span>
                  <span className={getStatusBadge(row.cls.status)}>
                    {getStatusText(row.cls.status)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={getStatusBadge(row.overallStatus)}>
                  {getStatusText(row.overallStatus)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {row.sessions ? row.sessions.toLocaleString('sv-SE') : '-'}
              </TableCell>
              <TableCell className="text-center text-sm text-gray-600">
                {row.lastTested}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {row.source}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
