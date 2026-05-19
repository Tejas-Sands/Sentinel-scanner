import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-sm font-medium whitespace-nowrap select-none transition-all duration-300 ease-snap active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#00e5a0] text-[#020202] hover:shadow-[0_0_20px_rgba(0,229,160,0.35)]",
        outline:
          "border-white/[0.06] bg-transparent text-white/90 hover:border-white/[0.12] hover:bg-liquid-800",
        secondary:
          "bg-liquid-800 text-white/90 border border-white/[0.03] hover:bg-liquid-700 hover:border-white/[0.08]",
        ghost:
          "hover:bg-liquid-800/60 hover:text-white",
        destructive:
          "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
        link: "text-[#00e5a0] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 px-6 gap-1.5",
        xs: "h-7 gap-1 px-3 text-xs",
        sm: "h-9 gap-1.5 px-4 text-xs",
        lg: "h-12 gap-2 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
