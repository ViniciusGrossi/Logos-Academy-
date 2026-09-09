import { cva, type VariantProps } from "class-variance-authority";
import React, { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("status-badge-premium", {
  variants: {
    tone: {
      neutral: "status-badge-premium--neutral",
      success: "status-badge-premium--success",
      warning: "status-badge-premium--warning",
      danger: "status-badge-premium--danger",
      explorer: "status-badge-premium--explorer",
      engineer: "status-badge-premium--engineer",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function StatusBadge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof statusBadgeVariants>) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />;
}
