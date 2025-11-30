import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "py-4 px-2" : "py-8 px-4",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "text-primary-400 mb-3",
            size === "sm" ? "scale-75" : ""
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          "font-medium text-primary-700",
          size === "sm" ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-primary-500 mt-1",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="mt-3"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
