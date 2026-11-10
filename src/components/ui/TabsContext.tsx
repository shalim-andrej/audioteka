"use client";

import React, { createContext, useContext } from "react";

// Обобщенный тип для ключа вкладки
export type TabsContextValue<T extends string = string> = {
  value: T;
  onValueChange: (value: T) => void;
};

const TabsContext = createContext<TabsContextValue<any> | null>(null);

export function useTabsContext<T extends string>() {
  const context = useContext(TabsContext) as TabsContextValue<T> | null;
  if (!context) {
    throw new Error("Компоненты Tabs должны использоваться внутри <Tabs>");
  }
  return context;
}

export const TabsProvider = TabsContext.Provider;