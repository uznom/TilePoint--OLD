/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeroNumberInput, HeroNumberInputProps } from './HeroNumberInput';

export interface HeroNumberFieldProps extends HeroNumberInputProps {
  description?: string;
}

export const HeroNumberField = React.forwardRef<HTMLInputElement, HeroNumberFieldProps>(
  (props, ref) => {
    return <HeroNumberInput ref={ref} {...props} />;
  }
);

HeroNumberField.displayName = 'HeroNumberField';
