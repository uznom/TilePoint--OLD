import React, { useState } from "react";
import { Brand, Supplier, User, UserRole } from "../../types/db";
import { Tag, Plus, Edit2, Trash2, Search, Building2 } from "lucide-react";
import { HeroButton } from "../common/ui/HeroButton";
import { HeroTable } from "../common/ui/HeroTable";

export interface BrandsManagementTabProps {
  brands: Brand[];
  suppliers: Supplier[];
  currentUser: User | null;
  onOpenAddBrand: () => void;
  onOpenEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
}

export const BrandsManagementTab: React.FC<BrandsManagementTabProps> = ({
  brands,
  suppliers,
  currentUser,
  onOpenAddBrand,
  onOpenEditBrand,
  onDeleteBrand,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const activeBrands = brands.filter((b) => !b.isDeleted);
  const filteredBrands = activeBrands.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Active Brands</span>
            <div className="text-xl font-black mt-1 text-primary">
              {activeBrands.length} Cataloged
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Suppliers Mapped</span>
            <div className="text-xl font-black mt-1 text-emerald-500">
              {new Set(activeBrands.map((b) => b.supplierId)).size} Vendors
            </div>
          </div>
        </div>
      </div>

      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand name, description..."
            className="w-full bg-content1 border border-divider/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <Search className="h-4 w-4 text-default-400 absolute left-3 top-2.5" />
        </div>

        {isAdmin && (
          <HeroButton
            size="sm"
            color="primary"
            radius="full"
            onClick={onOpenAddBrand}
            startIcon={<Plus className="h-3.5 w-3.5" />}
            className="font-black text-xs uppercase tracking-wider"
          >
            Register Brand
          </HeroButton>
        )}
      </div>

      {/* Brands Table */}
      <HeroTable isStriped className="min-w-full">
        <HeroTable.Header>
          <HeroTable.Column>Brand / Manufacturer</HeroTable.Column>
          <HeroTable.Column>Supplying Vendor</HeroTable.Column>
          <HeroTable.Column>Specifications & Details</HeroTable.Column>
          <HeroTable.Column align="end">Actions</HeroTable.Column>
        </HeroTable.Header>
        <HeroTable.Body>
          {filteredBrands.length === 0 ? (
            <HeroTable.Row isHoverable={false}>
              <HeroTable.Cell colSpan={4} className="p-8 text-center text-default-500 font-medium">
                No brands match your search criteria.
              </HeroTable.Cell>
            </HeroTable.Row>
          ) : (
            filteredBrands.map((b) => {
              const supplier = suppliers.find((s) => s.id === b.supplierId);
              return (
                <HeroTable.Row key={b.id}>
                  <HeroTable.Cell className="font-black text-foreground">{b.name}</HeroTable.Cell>
                  <HeroTable.Cell className="font-bold text-primary">{supplier?.name || "Direct / Unlinked"}</HeroTable.Cell>
                  <HeroTable.Cell className="text-default-500 truncate max-w-[300px]">{b.description || "General catalog line"}</HeroTable.Cell>
                  <HeroTable.Cell align="end">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenEditBrand(b)}
                          className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer active:scale-95"
                          title="Edit Brand"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBrand(b)}
                          className="p-1.5 rounded-xl hover:bg-danger/10 text-default-500 hover:text-danger transition-colors cursor-pointer active:scale-95"
                          title="Delete Brand"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </HeroTable.Cell>
                </HeroTable.Row>
              );
            })
          )}
        </HeroTable.Body>
      </HeroTable>
    </div>
  );
};
