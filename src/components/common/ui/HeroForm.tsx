import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children?: React.ReactNode;
  validationBehavior?: 'native' | 'aria';
  validationErrors?: Record<string, string | string[]>;
  className?: string;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ children, className = '', onSubmit, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={`flex flex-col gap-4 w-full ${className}`}
        onSubmit={onSubmit}
        {...props}
      >
        {children}
      </form>
    );
  }
);
Form.displayName = 'Form';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children?: React.ReactNode;
  isRequired?: boolean;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  isRequired = false,
  className = '',
  ...props
}) => {
  if (!children) return null;
  return (
    <label
      className={`text-xs font-bold text-default-700 dark:text-default-300 select-none flex items-center gap-1 leading-snug ${className}`}
      {...props}
    >
      <span>{children}</span>
      {isRequired && <span className="text-danger">*</span>}
    </label>
  );
};
Label.displayName = 'Label';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  errorMessage?: string;
  showIcon?: boolean;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  children,
  errorMessage,
  showIcon = true,
  className = '',
  ...props
}) => {
  const content = errorMessage || children;
  if (!content) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-1.5 text-[11px] font-semibold text-danger animate-fade-in pl-1 ${className}`}
      {...props}
    >
      {showIcon && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="leading-tight">{content}</span>
    </div>
  );
};
FieldError.displayName = 'FieldError';

export default Form;
