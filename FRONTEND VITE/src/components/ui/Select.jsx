import React, { useState, useEffect, createContext, useContext } from 'react'
import { cn } from '../../lib/utils.js'

const SelectContext = createContext(undefined)

const Select = ({ children, onValueChange, defaultValue = '', value, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(value || defaultValue)

  const handleSelect = (val) => {
    setSelectedValue(val)
    setIsOpen(false)
    if (onValueChange) onValueChange(val)
  }

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  return (
    <SelectContext.Provider value={{ selectedValue, onSelect: handleSelect, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ children, className, ...props }, ref) => {
  const { isOpen, setIsOpen } = useContext(SelectContext)

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
  )
})

const SelectValue = ({ placeholder = "Select..." }) => {
  const { selectedValue } = useContext(SelectContext)

  return (
    <span className={selectedValue ? '' : 'text-slate-500'}>
      {selectedValue || placeholder}
    </span>
  )
}

const SelectContent = ({ children, className }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext)

  if (!isOpen) return null

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
  )
}

const SelectItem = ({ children, value, className }) => {
  const { onSelect } = useContext(SelectContext)
  
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
  )
}
SelectTrigger.displayName = "SelectTrigger"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }