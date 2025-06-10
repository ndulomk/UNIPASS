import React, { useState, forwardRef, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Button Component
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 bg-slate-900 text-white hover:bg-slate-800",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground border-slate-200 hover:bg-slate-50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:bg-slate-100",
        link: "underline-offset-4 hover:underline text-primary text-blue-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Input Component
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200 focus-visible:ring-blue-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200 focus-visible:ring-blue-500 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// Label Component
export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

// Select Components
export interface SelectProps {
  children: ReactNode;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
}

export interface SelectContextType {
  selectedValue: string;
  onSelect: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

export const Select: React.FC<SelectProps> = ({ 
  children, 
  onValueChange, 
  defaultValue = '', 
  value, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue);
  
  const handleSelect = (val: string) => {
    setSelectedValue(val);
    setIsOpen(false);
    if (onValueChange) onValueChange(val);
  };
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);
  
  return (
    <SelectContext.Provider value={{ selectedValue, onSelect: handleSelect, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectTrigger must be used within Select');
    
    const { isOpen, setIsOpen } = context;
    
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200 focus:ring-blue-500",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <svg
          className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = "Select..." }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');
  
  const { selectedValue } = context;
  
  return (
    <span className={selectedValue ? '' : 'text-slate-500'}>
      {selectedValue || placeholder}
    </span>
  );
};

export interface SelectContentProps {
  children: ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');
  
  const { isOpen, setIsOpen } = context;
  
  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      <div className={cn(
        "absolute top-full left-0 z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto",
        className
      )}>
        {children}
      </div>
    </>
  );
};

export interface SelectItemProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ children, value, className }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');
  
  const { onSelect } = context;
  
  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 focus:bg-slate-100",
        className
      )}
      onClick={() => onSelect(value)}
    >
      {children}
    </div>
  );
};

// Card Components
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm bg-white border-slate-200",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground text-slate-600", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

// Toast Types and Implementation
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

class ToastManager {
  private createToast(message: string, type: ToastType, options: ToastOptions = {}) {
    const { duration = 3000, position = 'top-right' } = options;
    
    const toastEl = document.createElement('div');
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    };
    
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    };
    
    toastEl.className = `fixed ${positions[position]} ${colors[type]} text-white px-4 py-2 rounded-md shadow-lg z-50 transform transition-transform duration-300`;
    toastEl.textContent = message;
    
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
      toastEl.style.transform = position.includes('right') ? 'translateX(100%)' : 'translateX(-100%)';
      setTimeout(() => {
        if (document.body.contains(toastEl)) {
          document.body.removeChild(toastEl);
        }
      }, 300);
    }, duration);
  }
  
  success(message: string, options?: ToastOptions) {
    this.createToast(message, 'success', options);
  }
  
  error(message: string, options?: ToastOptions) {
    this.createToast(message, 'error', options);
  }
  
  info(message: string, options?: ToastOptions) {
    this.createToast(message, 'info', options);
  }
  
  warning(message: string, options?: ToastOptions) {
    this.createToast(message, 'warning', options);
  }
}

export const toast = new ToastManager();

// Table Components
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// Badge Component
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 bg-slate-900 text-white",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-100 text-slate-900",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 bg-red-500 text-white",
        outline: "text-foreground border-slate-200 text-slate-900",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

// RadioGroup Components
export interface RadioGroupProps {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextType | undefined>(undefined);

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue = '', onValueChange, children, disabled, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = useState(value || defaultValue);
    
    const handleValueChange = (newValue: string) => {
      if (disabled) return;
      setSelectedValue(newValue);
      if (onValueChange) onValueChange(newValue);
    };
    
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);
    
    return (
      <RadioGroupContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
        <div
          ref={ref}
          className={cn("grid gap-2", className)}
          role="radiogroup"
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');
    
    const { value: selectedValue, onValueChange } = context;
    const isSelected = selectedValue === value;
    
    return (
      <div className="flex items-center space-x-2">
        <button
          type="button"
          role="radio"
          aria-checked={isSelected}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-900",
            isSelected && "bg-slate-900",
            className
          )}
          onClick={() => onValueChange(value)}
        >
          {isSelected && (
            <div className="flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </button>
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={isSelected}
          onChange={() => onValueChange(value)}
          className="sr-only"
          {...props}
        />
        {children}
      </div>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

// Utility function for className merging (you'll need to install clsx and tailwind-merge)
// npm install clsx tailwind-merge
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}
