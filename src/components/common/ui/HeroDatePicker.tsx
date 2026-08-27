import React from 'react';
import { HeroInput, HeroInputProps } from './HeroInput';

export interface HeroDatePickerProps extends Omit<HeroInputProps, 'type'> {
  mode?: 'date' | 'datetime-local' | 'time' | 'month';
}

export const HeroDatePicker = React.forwardRef<HTMLInputElement, HeroDatePickerProps>(
  ({ mode = 'date', startContent, ...props }, ref) => {
    const calendarIcon = (
      <svg className="w-4 h-4 text-default-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );

    return (
      <HeroInput
        ref={ref}
        type={mode}
        startContent={startContent || calendarIcon}
        {...props}
      />
    );
  }
);

HeroDatePicker.displayName = 'HeroDatePicker';

export default HeroDatePicker;
