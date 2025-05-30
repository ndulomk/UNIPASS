import { forwardRef, ReactElement, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
  error?: string;
  icon?: ReactElement;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  className = "",
  error,
  disabled = false,
  type = "text",
  min,
  max,
  step = type === "number" ? "any" : undefined,
  icon,
  ...rest
}, ref) => {
  const containerClass = `
    flex items-center gap-2 p-2 rounded-lg border bg-gray-50 transition
    focus-within:ring-2 focus-within:ring-sky-400
    ${error ? "border-red-600" : "border-zinc-200"}
    ${disabled ? "opacity-50 pointer-events-none" : ""}
  `.trim().replace(/\s+/g, " ");

  return (
    <div className={className}>
      {label && (
        <label className="block mb-1 text-sm font-medium text-blue-100">
          {label}
        </label>
      )}

      <div className={containerClass}>
        {icon && <span className="text-zinc-500 size-4">{icon}</span>}

        <input
          ref={ref}
          type={type}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="bg-transparent w-full outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
          {...rest}
        />
      </div>

      {error && (
        <span className="text-sm text-red-600 font-medium mt-1 block">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";
