import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  separator?: React.ReactNode;
  children: React.ReactNode;
}

export interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  isCurrentPage?: boolean;
  children: React.ReactNode;
}

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  href?: string;
  children: React.ReactNode;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, separator = <ChevronRight className="h-4 w-4" />, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const childrenWithSeparators = childrenArray.reduce<React.ReactNode[]>(
      (acc, child, index) => {
        if (index !== 0) {
          acc.push(
            <li key={`separator-${index}`} aria-hidden="true" className="mx-1 flex items-center">
              {separator}
            </li>
          );
        }
        acc.push(child);
        return acc;
      },
      []
    );

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn("flex flex-wrap", className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {childrenWithSeparators}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, isCurrentPage, children, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("inline-flex items-center text-sm", className)}
        aria-current={isCurrentPage ? "page" : undefined}
        {...props}
      >
        {children}
      </li>
    );
  }
);

BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild = false, href, children, ...props }, ref) => {
    const Component = asChild ? React.Fragment : href ? Link : "span";
    const componentProps = href && !asChild ? { href } : {};
    
    return (
      <Component
        {...componentProps}
        ref={ref}
        className={cn(
          "transition-colors hover:text-gray-900",
          href ? "text-gray-500 hover:underline" : "text-gray-700 font-medium",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

BreadcrumbLink.displayName = "BreadcrumbLink";

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink }; 