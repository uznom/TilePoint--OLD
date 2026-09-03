/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeroErrorMessage, HeroErrorMessageProps } from './HeroErrorMessage';

export type HeroFieldErrorProps = HeroErrorMessageProps;

export const HeroFieldError: React.FC<HeroFieldErrorProps> = (props) => {
  return <HeroErrorMessage {...props} />;
};

export { HeroErrorMessage };
