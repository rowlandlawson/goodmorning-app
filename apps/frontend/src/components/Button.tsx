"use client"

import React from "react"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = "", type = "button", ...props }, ref) => {
    const base = "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    return (
      <button ref={ref} type={type} className={`${base} ${className}`.trim()} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"