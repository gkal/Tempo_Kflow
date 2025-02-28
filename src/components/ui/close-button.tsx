import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { closeButtonStyles } from "@/lib/styles/close-button";

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
  className = "",
}: CloseButtonProps) {
  const sizeConfig = closeButtonStyles.size[size];

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`${closeButtonStyles.baseClasses} ${sizeConfig.height} ${sizeConfig.width} bg-[${closeButtonStyles.bg}] text-[${closeButtonStyles.text}] hover:bg-[${closeButtonStyles.hoverBg}] ${
        withBorder ? `border border-[${closeButtonStyles.border}]` : ""
      } ${className}`}
    >
      <X className={sizeConfig.iconSize} />
    </Button>
  );
}
