"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
