import React from 'react';

// Alert component with variants and styling
const Alert = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const baseClasses = 'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground';
  
  const variants = {
    default: 'bg-background text-foreground border-border',
    destructive: 'border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 bg-red-50 dark:bg-red-950/10',
    warning: 'border-yellow-500/50 text-yellow-800 dark:border-yellow-500 [&>svg]:text-yellow-600 bg-yellow-50 dark:bg-yellow-950/10',
    success: 'border-green-500/50 text-green-800 dark:border-green-500 [&>svg]:text-green-600 bg-green-50 dark:bg-green-950/10',
    info: 'border-blue-500/50 text-blue-800 dark:border-blue-500 [&>svg]:text-blue-600 bg-blue-50 dark:bg-blue-950/10'
  };

  const variantClasses = variants[variant] || variants.default;

  return (
    <div
      ref={ref}
      role="alert"
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    />
  );
});

Alert.displayName = 'Alert';

// AlertTitle component for the alert heading
const AlertTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  />
));

AlertTitle.displayName = 'AlertTitle';

// AlertDescription component for the alert content
const AlertDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  />
));

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };