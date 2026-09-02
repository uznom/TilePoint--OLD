import React, { useState } from "react";
import { Supplier, User, UserRole } from "../../types/db";
import { Building2, Plus, Edit2, Trash2, Mail, Phone, Search } from "lucide-react";
import { HeroButton } from "../common/ui/HeroButton";
import { HeroTable } from "../common/ui/HeroTable";

export interface SuppliersManagementTabProps {
  suppliers: Supplier[];
  currentUser: User | null;
  onOpenAddSupplier: () => void;
  onOpenEditSupplier: (sup: Supplier) => void;
  onDeleteSupplier: (sup: Supplier) => void;
  onViewSupplierProfile: (sup: Supplier) => void;
}

export const SuppliersManagementTab: React.FC<SuppliersManagementTabProps> = ({
  suppliers,
  currentUser,
  onOpenAddSupplier,
  onOpenEditSupplier,
  onDeleteSupplier,
  onViewSupplierProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const activeSuppliers = suppliers.filter((s) => !s.isDeleted);
  const filteredSuppliers = activeSuppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Active Vendors</span>
            <div className="text-xl font-black mt-1 text-primary">
              {activeSuppliers.length} Registered
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Invoicing Linked</span>
            <div className="text-xl font-black mt-1 text-emerald-500">
              {activeSuppliers.filter((s) => s.email).length} Digital
            </div>
          </div>
        </div>

        <div className="bg-content1 p-4 rounded-2xl border border-divider/20 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-extrabold text-default-500 uppercase tracking-widest">Direct Contact</span>
            <div className="text-xl font-black mt-1 text-sky-500">
              {activeSuppliers.filter((s) => s.phone).length} Direct Lines
            </div>
          </div>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor name, contact person..."
            className="w-full bg-content1 border border-divider/40 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <Search className="h-4 w-4 text-default-400 absolute left-3 top-2.5" />
        </div>

        {isAdmin && (
          <HeroButton
            size="sm"
            color="primary"
            radius="full"
            onClick={onOpenAddSupplier}
            startIcon={<Plus className="h-3.5 w-3.5" />}
            className="font-black text-xs uppercase tracking-wider"
          >
            Register Supplier
          </HeroButton>
        )}
      </div>

      {/* Suppliers Table */}
      <HeroTable isStriped className="min-w-full">
        <HeroTable.Header>
          <HeroTable.Column>Enterprise Vendor</HeroTable.Column>
          <HeroTable.Column>Contact Representative</HeroTable.Column>
          <HeroTable.Column>Direct Phone</HeroTable.Column>
          <HeroTable.Column>Invoicing Email</HeroTable.Column>
          <HeroTable.Column>Depot Location</HeroTable.Column>
          <HeroTable.Column align="end">Actions</HeroTable.Column>
        </HeroTable.Header>
        <HeroTable.Body>
          {filteredSuppliers.length === 0 ? (
            <HeroTable.Row isHoverable={false}>
              <HeroTable.Cell colSpan={6} className="p-8 text-center text-default-500 font-medium">
                No suppliers match your search criteria.
              </HeroTable.Cell>
            </HeroTable.Row>
          ) : (
            filteredSuppliers.map((sup) => (
              <HeroTable.Row key={sup.id}>
                <HeroTable.Cell>
                  <button
                    type="button"
                    onClick={() => onViewSupplierProfile(sup)}
                    className="font-black text-primary hover:underline cursor-pointer block text-left"
                  >
                    {sup.name}
                  </button>
                </HeroTable.Cell>
                <HeroTable.Cell className="font-bold text-foreground">{sup.contactPerson}</HeroTable.Cell>
                <HeroTable.Cell className="font-mono text-default-500">{sup.phone || "N/A"}</HeroTable.Cell>
                <HeroTable.Cell className="font-mono text-default-500 truncate max-w-[180px]">{sup.email || "N/A"}</HeroTable.Cell>
                <HeroTable.Cell className="text-default-500 truncate max-w-[200px]">{sup.address || "N/A"}</HeroTable.Cell>
                <HeroTable.Cell align="end">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewSupplierProfile(sup)}
                      className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-primary transition-colors cursor-pointer active:scale-95"
                      title="View Profile & Products"
                    >
                      <Building2 className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenEditSupplier(sup)}
                          className="p-1.5 rounded-xl hover:bg-content2 text-default-500 hover:text-foreground transition-colors cursor-pointer active:scale-95"
                          title="Edit Vendor"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSupplier(sup)}
                          className="p-1.5 rounded-xl hover:bg-danger/10 text-default-500 hover:text-danger transition-colors cursor-pointer active:scale-95"
                          title="Delete Vendor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </HeroTable.Cell>
              </HeroTable.Row>
            ))
          )}
        </HeroTable.Body>
      </HeroTable>
    </div>
  );
};
