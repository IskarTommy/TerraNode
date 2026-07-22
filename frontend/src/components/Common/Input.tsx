import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type LabelHTMLAttributes,
} from 'react';
import { cn } from '../../utils/cn';

// ─── Input Component ──────────────────────────────────────────────────────
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className,
      id: providedId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'absolute left-3 top-3 text-fg-muted pointer-events-none',
              'transition-all duration-fast origin-left',
              'peer-placeholder-shown:text-body-sm peer-placeholder-shown:text-fg-muted',
              'peer-focus:text-primary peer-focus:scale-85 peer-focus:-translate-y-2.5',
              'peer-focus-within:text-primary peer-focus-within:scale-85 peer-focus-within:-translate-y-2.5',
              'peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:scale-85 peer-[:not(:placeholder-shown)]:-translate-y-2.5',
              'peer-data-[has-value]:text-primary peer-data-[has-value]:scale-85 peer-data-[has-value]:-translate-y-2.5',
              hasError && 'peer-focus:text-error peer-focus-within:text-error'
            )}
          >
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-input-bg border-input-border text-input-fg placeholder-transparent',
              'rounded-input transition-all duration-fast',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
              'disabled:bg-input-disabled-bg disabled:text-input-disabled-fg disabled:cursor-not-allowed',
              'input-padding',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              hasError
                ? 'border-input-error-border focus-visible:ring-input-error-ring'
                : '',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            data-has-value={props.value || props.defaultValue ? 'true' : 'false'}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>
        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-body-xs text-error-fg flex items-center gap-1"
            role="alert"
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="mt-1.5 text-body-xs text-fg-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ─── Textarea Component ───────────────────────────────────────────────────
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  minRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      minRows = 3,
      className,
      id: providedId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'absolute left-3 top-3 text-fg-muted pointer-events-none',
              'transition-all duration-fast origin-left',
              'peer-placeholder-shown:text-body-sm peer-placeholder-shown:text-fg-muted',
              'peer-focus:text-primary peer-focus:scale-85 peer-focus:-translate-y-2.5',
              'peer-focus-within:text-primary peer-focus-within:scale-85 peer-focus-within:-translate-y-2.5',
              'peer-[:not(:placeholder-shown)]:text-primary peer-[:not(:placeholder-shown)]:scale-85 peer-[:not(:placeholder-shown)]:-translate-y-2.5',
              'peer-data-[has-value]:text-primary peer-data-[has-value]:scale-85 peer-data-[has-value]:-translate-y-2.5',
              hasError && 'peer-focus:text-error peer-focus-within:text-error'
            )}
          >
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-input-bg border-input-border text-input-fg placeholder-transparent',
            'rounded-input transition-all duration-fast resize-y',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
            'disabled:bg-input-disabled-bg disabled:text-input-disabled-fg disabled:cursor-not-allowed',
            'p-3 text-body-sm',
            'min-h-[8rem]',
            hasError
              ? 'border-input-error-border focus-visible:ring-input-error-ring'
              : '',
            className
          )}
          disabled={disabled}
          required={required}
          rows={minRows}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          data-has-value={props.value || props.defaultValue ? 'true' : 'false'}
          {...props}
        />
        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-body-xs text-error-fg flex items-center gap-1"
            role="alert"
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="mt-1.5 text-body-xs text-fg-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ─── Label Component ──────────────────────────────────────────────────────
export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  size?: 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ size = 'base', weight = 'medium', className, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-body-xs',
      base: 'text-body-sm',
      lg: 'text-body',
    };
    const weightClasses = {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    };

    return (
      <label
        ref={ref}
        className={cn(
          'block text-fg-secondary',
          sizeClasses[size],
          weightClasses[weight],
          className
        )}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';

// ─── Select Component ─────────────────────────────────────────────────────
export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      placeholder,
      options,
      className,
      id: providedId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = !!error;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'absolute left-3 top-3 text-fg-muted pointer-events-none',
              'transition-all duration-fast origin-left',
              'peer-focus:text-primary peer-focus:scale-85 peer-focus:-translate-y-2.5',
              'peer-focus-within:text-primary peer-focus-within:scale-85 peer-focus-within:-translate-y-2.5',
              'peer-[:not([value=""])]:text-primary peer-[:not([value=""])]:scale-85 peer-[:not([value=""])]:-translate-y-2.5',
              hasError && 'peer-focus:text-error peer-focus-within:text-error'
            )}
          >
            {label}
            {required && <span className="text-error ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-input-bg border-input-border text-input-fg',
              'rounded-input transition-all duration-fast appearance-none',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
              'disabled:bg-input-disabled-bg disabled:text-input-disabled-fg disabled:cursor-not-allowed',
              'input-padding pr-10',
              hasError
                ? 'border-input-error-border focus-visible:ring-input-error-ring'
                : '',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-body-xs text-error-fg flex items-center gap-1"
            role="alert"
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="mt-1.5 text-body-xs text-fg-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ─── Checkbox Component ───────────────────────────────────────────────────
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, indeterminate, className, id: providedId, disabled, required, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descId = `${id}-desc`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              'peer h-5 w-5 rounded-sm border-checkbox-border bg-checkbox-bg',
              'text-checkbox-checked-fg appearance-none cursor-pointer',
              'transition-all duration-fast',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
              'checked:bg-checkbox-checked-bg checked:border-checkbox-checked-bg',
              'indeterminate:bg-checkbox-checked-bg indeterminate:border-checkbox-checked-bg',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            disabled={disabled}
            required={required}
            aria-describedby={description ? descId : undefined}
            aria-controls={props['aria-controls']}
            {...props}
          />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="h-3.5 w-3.5 text-checkbox-checked-fg peer-checked:opacity-100 peer-checked:scale-100 opacity-0 scale-50 transition-all duration-fast"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            <svg
              className="h-3.5 w-3.5 text-checkbox-checked-fg peer-indeterminate:opacity-100 peer-indeterminate:scale-100 opacity-0 scale-50 transition-all duration-fast"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v5a1 1 0 00.293.707l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        {(label || description) && (
          <div className="min-w-0 flex-1 pt-0.5">
            {label && (
              <label htmlFor={id} className="text-body-sm text-fg-primary cursor-pointer select-none">
                {label}
              </label>
            )}
            {description && (
              <p id={descId} className="mt-0.5 text-body-xs text-fg-muted">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ─── Switch Component ─────────────────────────────────────────────────────
export type SwitchProps = {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, size = 'md', className, id: providedId, disabled, required, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descId = `${id}-desc`;

    const sizeClasses = {
      sm: 'w-7 h-4 thumb-size-sm',
      md: 'w-10 h-5 thumb-size-md',
      lg: 'w-12 h-6 thumb-size-lg',
    };

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            role="switch"
            className={cn(
              'peer appearance-none cursor-pointer transition-all duration-fast',
              'rounded-switch border-2 border-switch-bg-off bg-switch-bg-off',
              'checked:bg-switch-bg-on checked:border-switch-bg-on',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeClasses[size],
              className
            )}
            disabled={disabled}
            required={required}
            aria-describedby={description ? descId : undefined}
            {...props}
          />
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0.5 left-0.5 bg-switch-thumb-bg rounded-full shadow-md',
              'transition-transform duration-fast ease-spring',
              'peer-checked:translate-x-full',
              {
                'thumb-size-sm': size === 'sm',
                'thumb-size-md': size === 'md',
                'thumb-size-lg': size === 'lg',
              }
            )}
            aria-hidden="true"
          />
        </div>
        {(label || description) && (
          <div className="min-w-0 flex-1 pt-0.5">
            {label && (
              <label htmlFor={id} className="text-body-sm text-fg-primary cursor-pointer select-none">
                {label}
              </label>
            )}
            {description && (
              <p id={descId} className="mt-0.5 text-body-xs text-fg-muted">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';