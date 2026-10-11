import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow hover:bg-blue-700",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100",
        destructive:
          "bg-red-500/10 text-red-600 border border-red-200 dark:border-red-900",
        outline: "text-slate-950 border border-slate-200 dark:border-slate-800 dark:text-slate-50",
        vam: "bg-cyan-500/15 text-cyan-600 border border-cyan-500/20 font-bold",
        success: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 font-bold",
        orange: "bg-orange-500/15 text-orange-600 border border-orange-500/20 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
