"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

// A custom Check icon component to replace lucide-react
const CheckIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const Checkbox = React.forwardRef(
  ({ className, id, onCheckedChange, ...props }, ref) => {
    const randomId = React.useId();
    const resolvedId = id || randomId;

    return (
      // Add `relative` positioning to the container
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={resolvedId}
          ref={ref}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:text-primary-foreground",
            "appearance-none"
          )}
          onChange={(event) => {
            if (onCheckedChange) {
              onCheckedChange(event.target.checked);
            }
          }}
          {...props}
        />
        <label
          htmlFor={resolvedId}
          className={cn(
            "absolute flex h-4 w-4 items-center justify-center text-current opacity-0 peer-checked:opacity-100 peer-disabled:opacity-50 pointer-events-none"
          )}
        >
          <CheckIcon className="h-4 w-4" />
        </label>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };