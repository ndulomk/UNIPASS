import React, { useState, useEffect, createContext, useContext } from 'react'
import { cn } from '../../lib/utils.js'

const RadioGroupContext = createContext(undefined)

const RadioGroup = React.forwardRef(({ className, value, defaultValue = '', onValueChange, children, disabled, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = useState(value || defaultValue)

  const handleValueChange = (newValue) => {
    if (disabled) return
    setSelectedValue(newValue)
    if (onValueChange) onValueChange(newValue)
  }

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

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
  )
})

RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useContext(RadioGroupContext)
  const isSelected = selectedValue === value

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
  )
})


RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }