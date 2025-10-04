import { TrashIcon, PencilSquareIcon } from "@/assets/icons";
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
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { getInvoiceTableData } from "./fetch";
import { DownloadIcon, PreviewIcon } from "./icons";

export async function InvoiceTable() {
  const data = await getInvoiceTableData();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "success" as const;
      case "Unpaid":
        return "error" as const;
      case "Pending":
        return "warning" as const;
      default:
        return "neutral" as const;
    }
  };

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Invoices
        </h2>
      </div>

      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[155px]">Package</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <h5 className="font-medium text-dark dark:text-white">{item.name}</h5>
                    <p className="mt-1 text-sm text-dark-6 dark:text-dark-4">
                      ${item.price}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white">
                    {dayjs(item.date).format("MMM DD, YYYY")}
                  </p>
                </TableCell>

                <TableCell>
                  <StatusPill variant={getStatusVariant(item.status)}>
                    {item.status}
                  </StatusPill>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <GhostButton
                      size="sm"
                      variant="primary"
                      aria-label="View Invoice"
                    >
                      <PreviewIcon className="h-4 w-4" />
                    </GhostButton>

                    <GhostButton
                      size="sm"
                      variant="danger"
                      aria-label="Delete Invoice"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </GhostButton>

                    <GhostButton
                      size="sm"
                      variant="primary"
                      aria-label="Download Invoice"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </GhostButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
