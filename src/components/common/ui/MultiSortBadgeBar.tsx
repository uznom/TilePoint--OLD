/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SortDescriptor } from '../../../lib/multiSortHelper';

export interface MultiSortBadgeBarProps {
  sortDescriptors?: SortDescriptor[];
  onRemoveSort?: (column: string) => void;
  onClearSort?: () => void;
  columnLabels?: Record<string, string>;
  className?: string;
}

/**
 * MultiSortBadgeBar is disabled to keep tables clean, uncluttered, and free of extraneous popup bars.
 * Sorting is managed seamlessly and directly through table column headers.
 */
export const MultiSortBadgeBar: React.FC<MultiSortBadgeBarProps> = () => {
  return null;
};
