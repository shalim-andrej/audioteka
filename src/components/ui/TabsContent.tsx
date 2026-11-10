"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTabsContext } from "./TabsContext";

interface TabsContentProps<T extends string> {
  value: T;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent<T extends string>({ value, children, className }: TabsContentProps<T>) {
  const { value: activeValue } = useTabsContext<T>();
  const isActive = activeValue === value;

  if (!isActive) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}