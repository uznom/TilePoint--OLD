/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Custom React Hook to compute page size dynamically based on available screen height.
 * This guarantees tables and lists maximize their size to fit any resolution (Tablet, Desktop, 4K)
 * without requiring vertical scrolling of the main page viewport.
 */
export function useResponsivePageSize(rowHeight = 48, offsetHeight = 360, defaultPageSize = 8) {
 const [pageSize, setPageSize] = useState(() => {
 if (typeof window === "undefined") return defaultPageSize;
 const available = window.innerHeight - offsetHeight;
 return Math.max(Math.floor(available / rowHeight), 4);
 });

 useEffect(() => {
 const handleResize = () => {
 const available = window.innerHeight - offsetHeight;
 setPageSize(Math.max(Math.floor(available / rowHeight), 4));
 };
 window.addEventListener("resize", handleResize);
 return () => window.removeEventListener("resize", handleResize);
 }, [rowHeight, offsetHeight]);

 return pageSize;
}

interface TablePaginationProps {
 currentPage: number;
 totalItems: number;
 pageSize: number;
 onPageChange: (page: number) => void;
 itemName?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
 currentPage,
 totalItems,
 pageSize,
 onPageChange,
 itemName = "entries",
}) => {
 const totalPages = Math.ceil(totalItems / pageSize);
 if (totalPages <= 1) return null;

 const startItem = (currentPage - 1) * pageSize + 1;
 const endItem = Math.min(currentPage * pageSize, totalItems);

 const getPageNumbers = () => {
 const pages: number[] = [];
 if (totalPages <= 5) {
 for (let i = 1; i <= totalPages; i++) pages.push(i);
 } else {
 if (currentPage <= 3) {
 pages.push(1, 2, 3, 4, totalPages);
 } else if (currentPage >= totalPages - 2) {
 pages.push(1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
 } else {
 pages.push(1, currentPage - 1, currentPage, currentPage + 1, totalPages);
 }
 }
 return pages;
 };

 return (
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-m3-outline-variant/10 text-[11px] font-medium text-zinc-400">
 <div className="font-mono">
 Showing <span className="text-m3-primary font-bold">{startItem}</span> to{" "}
 <span className="text-m3-primary font-bold">{endItem}</span> of{" "}
 <span className="text-m3-primary font-bold">{totalItems}</span> {itemName}
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={() => onPageChange(currentPage - 1)}
 disabled={currentPage === 1}
 className="p-1.5 rounded-lg border border-m3-outline-variant/15 bg-zinc-950/20 hover:bg-m3-primary/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
 title="Previous Page"
 >
 <ChevronLeft className="h-4 w-4" />
 </button>

 {getPageNumbers().map((p, idx, arr) => {
 const isGap = idx > 0 && p - arr[idx - 1] > 1;
 return (
 <React.Fragment key={p}>
 {isGap && <span className="px-1 text-zinc-600">...</span>}
 <button
 onClick={() => onPageChange(p)}
 className={`min-w-7 h-7 rounded-lg text-center font-bold font-mono transition-all cursor-pointer ${
 currentPage === p
 ? "bg-m3-primary text-m3-on-primary shadow-sm scale-105"
 : "border border-m3-outline-variant/10 bg-zinc-950/10 hover:bg-m3-primary/10 text-zinc-400 hover:text-white"
 }`}
 >
 {p}
 </button>
 </React.Fragment>
 );
 })}

 <button
 onClick={() => onPageChange(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="p-1.5 rounded-lg border border-m3-outline-variant/15 bg-zinc-950/20 hover:bg-m3-primary/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
 title="Next Page"
 >
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </div>
 );
};
