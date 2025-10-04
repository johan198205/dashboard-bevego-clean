import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { GhostButton } from "@/components/ui/ghost-button";
import { PencilSquareIcon, TrashIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";

// Example data type
type TableData = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending" | "blocked";
  joinDate: string;
  revenue: number;
};

// Mock data
const mockData: TableData[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    status: "active",
    joinDate: "Jan 15, 2025",
    revenue: 12500,
  },
  {
    id: "2", 
    name: "Jane Smith",
    email: "jane.smith@example.com",
    status: "pending",
    joinDate: "Jan 14, 2025",
    revenue: 8900,
  },
  {
    id: "3",
    name: "Bob Johnson", 
    email: "bob.johnson@example.com",
    status: "blocked",
    joinDate: "Jan 10, 2025",
    revenue: 0,
  },
  {
    id: "4",
    name: "Alice Brown",
    email: "alice.brown@example.com", 
    status: "active",
    joinDate: "Jan 12, 2025",
    revenue: 15200,
  },
];

const statusVariantMap = {
  active: "success" as const,
  pending: "warning" as const,
  blocked: "error" as const,
  inactive: "neutral" as const,
};

export function ModernTable() {
  return (
    <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Customer Management
        </h2>
        <p className="text-sm text-dark-6 dark:text-dark-4">
          Manage your customer accounts and their status
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input 
                type="checkbox" 
                className="rounded border-stroke text-primary focus:ring-primary"
                aria-label="Select all customers"
              />
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Join Date</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {mockData.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <input 
                  type="checkbox" 
                  className="rounded border-stroke text-primary focus:ring-primary"
                  aria-label={`Select ${customer.name}`}
                />
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-dark dark:text-white">
                      {customer.name}
                    </div>
                    <div className="text-sm text-dark-6 dark:text-dark-4">
                      {customer.email}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <StatusPill variant={statusVariantMap[customer.status]}>
                  {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                </StatusPill>
              </TableCell>

              <TableCell className="text-dark-6 dark:text-dark-4">
                {customer.joinDate}
              </TableCell>

              <TableCell className="text-right font-medium text-dark dark:text-white">
                ${customer.revenue.toLocaleString('sv-SE')}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  <GhostButton
                    size="sm"
                    variant="primary"
                    aria-label={`Edit ${customer.name}`}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </GhostButton>
                  
                  <GhostButton
                    size="sm"
                    variant="danger"
                    aria-label={`Delete ${customer.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </GhostButton>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
