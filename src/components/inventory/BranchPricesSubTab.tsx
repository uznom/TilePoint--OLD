import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Branch, Product } from '../../types/db';
import { HeroTable } from '../common/ui/HeroTable';
import { useMultiSort } from '../../hooks/useMultiSort';
import { MultiSortBadgeBar } from '../common/ui/MultiSortBadgeBar';

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
    removeSort: removePriceSort,
    clearSort: clearPriceSort,
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
    <div className="space-y-6 text-left animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-content1 p-5 rounded-2xl border border-divider shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Branch MSRP &amp; SRP Pricing Overrides</span>
          </h2>
        </div>
      </div>

      {/* Multi-Sort Active Badge Bar */}
      <MultiSortBadgeBar
        sortDescriptors={priceSortDescriptors}
        onRemoveSort={removePriceSort}
        onClearSort={clearPriceSort}
        columnLabels={{
          productName: 'Product Code / Name',
          category: 'Category',
          sellingPrice: 'Central Base SRP',
        }}
      />

      <div className="overflow-x-auto rounded-2xl border border-divider bg-content1 shadow-xs">
        <HeroTable isStriped className="min-w-full text-xs">
          <HeroTable.Header>
            <tr className="bg-content2 border-b border-divider font-black text-foreground">
              <HeroTable.Column
                allowsSorting
                sortDirection={getPriceSortDir('productName')}
                sortRank={getPriceSortRank('productName')}
                onSort={(e) => handlePriceSort('productName', e)}
                className="py-3 px-4"
              >
                Product Code / Name
              </HeroTable.Column>
              <HeroTable.Column
                allowsSorting
                sortDirection={getPriceSortDir('category')}
                sortRank={getPriceSortRank('category')}
                onSort={(e) => handlePriceSort('category', e)}
                className="py-3 px-4"
              >
                Category
              </HeroTable.Column>
              <HeroTable.Column
                align="end"
                allowsSorting
                sortDirection={getPriceSortDir('sellingPrice')}
                sortRank={getPriceSortRank('sellingPrice')}
                onSort={(e) => handlePriceSort('sellingPrice', e)}
                className="py-3 px-4 text-right"
              >
                Central Base SRP
              </HeroTable.Column>
              {visibleBranches.map(b => (
                <th key={b.id} className="py-3 px-4 text-center font-black text-primary">
                  {b.name ? getBranchOptionLabel(b) : ''}
                </th>
              ))}
            </tr>
          </HeroTable.Header>
          <HeroTable.Body>
            {sortedProducts.slice(0, 50).map((p) => {
              return (
                <tr key={p.id} className="hover:bg-content2/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-foreground">{p.productName}</div>
                    <div className="text-[10.5px] text-default-500">{p.productCode}</div>
                  </td>
                  <td className="py-3 px-4 text-default-500 font-medium">
                    {p.category}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-foreground">
                    ₱{(Number(p.sellingPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  {visibleBranches.map(b => {
                    const bsRec = branchStock.find(bs => bs.productId === p.id && bs.branchId === b.id);
                    const overridePrice = bsRec?.sellingPriceOverride ?? p.sellingPrice;

                    return (
                      <td key={b.id} className="py-3 px-4 text-center font-bold">
                        <span className="px-2.5 py-1 rounded-medium bg-content2 border border-divider text-primary">
                          ₱{(Number(overridePrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
