import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Branch, Product } from '../../types/db';
import { formatCurrency } from '../../utils/formatters';
import { HeroTable } from '../common/ui/HeroTable';
import { useMultiSort } from '../../hooks/useMultiSort';

interface BranchPricesSubTabProps {
  branches: Branch[];
  isAdminUser: boolean;
  activeBranchId: string;
  getBranchOptionLabel: (b: Branch) => string;
  branchProducts: Product[];
  branchStock: any[];
}

export const BranchPricesSubTab: React.FC<BranchPricesSubTabProps> = ({
  branches,
  isAdminUser,
  activeBranchId,
  getBranchOptionLabel,
  branchProducts,
  branchStock,
}) => {
  const visibleBranches = useMemo(() => 
    branches.filter(b => !b.isDeleted && (isAdminUser || b.id === activeBranchId)),
    [branches, isAdminUser, activeBranchId]
  );

  // Multi-column sorting for branch pricing
  const {
    sortDescriptors: priceSortDescriptors,
    handleSort: handlePriceSort,
    getSortDirection: getPriceSortDir,
    getSortRank: getPriceSortRank,
    sortData: sortPriceData
  } = useMultiSort<Product>({
    customGetters: {
      productName: (p) => p.productName || '',
      category: (p) => p.category || '',
      sellingPrice: (p) => Number(p.sellingPrice) || 0,
    }
  });

  const sortedProducts = useMemo(() => {
    if (priceSortDescriptors.length > 0) {
      return sortPriceData(branchProducts);
    }
    return branchProducts;
  }, [branchProducts, priceSortDescriptors, sortPriceData]);

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Branch MSRP &amp; SRP Pricing Overrides</span>
          </h2>
          <p className="text-xs text-default-500 font-medium mt-0.5">
            Compare base retail pricing with branch-specific regional price adjustments.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-elevation-soft">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-divider/20 font-bold text-default-600 dark:text-default-400">
              <HeroTable.Column
                allowsSorting
                sortDirection={getPriceSortDir('productName')}
                sortRank={getPriceSortRank('productName')}
                onSort={(e) => handlePriceSort('productName', e)}
                className="py-3.5 px-4"
              >
                Product Code / Name
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getPriceSortDir('category')}
                sortRank={getPriceSortRank('category')}
                onSort={(e) => handlePriceSort('category', e)}
                className="py-3.5 px-4"
              >
                Category
              </HeroTable.Column>
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getPriceSortDir('sellingPrice')}
                sortRank={getPriceSortRank('sellingPrice')}
                onSort={(e) => handlePriceSort('sellingPrice', e)}
                className="py-3.5 px-4 text-right"
              >
                Central Base SRP
              </HeroTable.Column>
              {visibleBranches.map(b => (
                <th key={b.id} className="py-3.5 px-4 text-center font-bold text-primary">
                  {b.name ? getBranchOptionLabel(b) : ''}
                </th>
              ))}
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedProducts.slice(0, 50).map((p) => {
              return (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-foreground">{p.productName}</div>
                    <div className="text-[10px] text-default-500 font-mono">{p.productCode}</div>
                  </td>
                  <td className="py-3.5 px-4 text-default-500 font-medium">
                    {p.category}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-foreground font-mono">
                    {formatCurrency(p.sellingPrice)}
                  </td>
                  {visibleBranches.map(b => {
                    const bsRec = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id);
                    const overridePrice = bsRec?.sellingPriceOverride ?? p.sellingPrice;

                    return (
                      <td key={b.id} className="py-3.5 px-4 text-center font-bold">
                        <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5 text-primary font-mono text-[11px]">
                          {formatCurrency(overridePrice)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </HeroTable.Body>
        </HeroTable>
      </div>
    </div>
  );
};

export default BranchPricesSubTab;
