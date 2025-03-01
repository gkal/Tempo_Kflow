import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseButtonProps {
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  withBorder?: boolean;
  className?: string;
}

export function CloseButton({
  onClick,
  size = "md",
  withBorder = true,
  className,
}: CloseButtonProps) {
  // Define sizes directly in the component
  const sizes = {
    sm: { height: "h-8", width: "w-8", iconSize: "h-5 w-5" },
    md: { height: "h-10", width: "w-10", iconSize: "h-6 w-6" },
    lg: { height: "h-12", width: "w-12", iconSize: "h-7 w-7" },
  };

  const sizeClasses = sizes[size];

  // Define styles with inline style to ensure they're applied
  const style = {
    backgroundColor: "#2f3e46",
    color: "#cad2c5",
    borderColor: withBorder ? "#52796f" : "transparent",
    borderWidth: withBorder ? "1px" : "0",
    borderStyle: "solid",
  };

  // Define hover styles
  const hoverStyle = {
    backgroundColor: "#354f52",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-0 rounded-full flex items-center justify-center transition-colors",
        sizeClasses.height,
        sizeClasses.width,
        className,
      )}
      style={style}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = style.backgroundColor;
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ transform: "scale(0.7)" }}
      >
        <X className={sizeClasses.iconSize} style={{ color: "#84a98c" }} />
      </div>
      <span className="sr-only">Close</span>
    </button>
  );
}
