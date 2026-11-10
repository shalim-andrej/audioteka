"use client";

import React from "react";
import { TabsProvider, TabsContextValue } from "./TabsContext";

interface TabsProps<T extends string> extends TabsContextValue<T> {
  children: React.ReactNode;
  className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, children, className }: TabsProps<T>) {
  return (
    <TabsProvider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsProvider>
  );
}