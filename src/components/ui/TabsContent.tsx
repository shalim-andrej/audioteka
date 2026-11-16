"use client";

import React from "react";
import { useTabsContext } from "./TabsContext";

interface TabsContentProps<T extends string> {
  value: T;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent<T extends string>({ value, children, className }: TabsContentProps<T>) {
  const { value: activeValue } = useTabsContext<T>();
  if (activeValue !== value) return null;
  return <div className={className}>{children}</div>;
}
