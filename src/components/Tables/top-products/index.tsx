import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { getTopProducts } from "../fetch";

export async function TopProducts() {
  const data = await getTopProducts();

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
          Top Products
        </h2>
      </div>

      <div className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((product) => (
              <TableRow key={product.name + product.profit}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={product.image}
                      className="aspect-[6/5] w-15 rounded-[5px] object-cover"
                      width={60}
                      height={50}
                      alt={"Image for product " + product.name}
                      role="presentation"
                    />
                    <span className="font-medium">{product.name}</span>
                  </div>
                </TableCell>

                <TableCell>{product.category}</TableCell>

                <TableCell>${product.price}</TableCell>

                <TableCell>{product.sold}</TableCell>

                <TableCell className="text-right text-green font-medium">
                  ${product.profit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
