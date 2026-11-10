"use client";

import Link from "next/link";
import { useTabsContext } from "@/components/ui/TabsContext";

interface TabsLinkProps<T extends string> {
  value: T;
  href: string;
  children: React.ReactNode;
  className: (isActive: boolean) => string;
}

export function TabsLink<T extends string>({ value, href, children, className }: TabsLinkProps<T>) {
  const { value: activeValue, onValueChange } = useTabsContext<T>();
  const isActive = activeValue === value;

  return (
    <Link
      href={href}
      prefetch={false}
      role="tab"
      aria-selected={isActive}
      className={className(isActive)}
      onClick={() => onValueChange(value)}
    >
      {children}
    </Link>
  );
}