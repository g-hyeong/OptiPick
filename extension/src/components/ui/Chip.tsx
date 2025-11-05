import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-2 rounded-full text-sm font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        primary: "bg-primary-100 text-primary-700 hover:bg-primary-200",
        accent: "bg-accent-100 text-accent-700 hover:bg-accent-200",
        selected: "bg-primary-500 text-white hover:bg-primary-600",
        outline:
          "border-2 border-primary-400 text-primary-700 hover:bg-primary-50",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-base",
      },
      clickable: {
        true: "cursor-pointer",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      clickable: false,
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant, size, clickable, onRemove, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(chipVariants({ variant, size, clickable, className }))}
        {...props}
      >
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 rounded-full hover:bg-black/10 p-0.5 transition-colors"
            aria-label="Remove"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = "Chip";

export { Chip, chipVariants };
