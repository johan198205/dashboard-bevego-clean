import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactFormat, standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getTopChannels } from "../fetch";

export async function TopChannels({ className }: { className?: string }) {
  const data = await getTopChannels();

  return (
    <div
      className={cn(
        "rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark",
        className,
      )}
    >
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Top Channels
        </h2>
      </div>

      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Source</TableHead>
              <TableHead className="text-center">Visitors</TableHead>
              <TableHead className="text-right">Revenues</TableHead>
              <TableHead className="text-center">Sales</TableHead>
              <TableHead className="text-center">Conversion</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((channel, i) => (
              <TableRow key={channel.name + i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={channel.logo}
                      className="size-8 rounded-full object-cover"
                      width={40}
                      height={40}
                      alt={channel.name + " Logo"}
                      role="presentation"
                    />
                    <span className="font-medium">{channel.name}</span>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  {compactFormat(channel.visitors)}
                </TableCell>

                <TableCell className="text-right text-green font-medium">
                  ${standardFormat(channel.revenues)}
                </TableCell>

                <TableCell className="text-center">{channel.sales}</TableCell>

                <TableCell className="text-center">{channel.conversion}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
