import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[10px] bg-liquid-900/60 border border-white/[0.06] px-4 py-1 text-sm text-white/90 placeholder:text-white/25 transition-all duration-300 outline-none hover:border-white/10 focus-visible:border-[rgba(0,229,160,0.3)] focus-visible:shadow-[0_0_0_3px_rgba(0,229,160,0.15)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
