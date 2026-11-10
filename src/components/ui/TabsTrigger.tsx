"use client";

import React from "react";
import { useTabsContext } from "./TabsContext";

interface TabsTriggerProps<T extends string> {
  value: T;
  children: React.ReactNode;
  className: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string; // Опционально, чтобы сохранить совместимость с Next.js Link
}

export function TabsTrigger<T extends string>({ value, children, className, onClick, href }: TabsTriggerProps<T>) {
  const { value: activeValue, onValueChange } = useTabsContext<T>();
  const isActive = activeValue === value;

  // Если передан href, мы рендерим Link (для SEO и URL-навигации),
  // иначе button (для локального стейта).
  // Но чтобы не ломать ваш текущий подход, логику рендера Link/button лучше оставить в BookTabs.
  
  // Для чистоты паттерна этот компонент должен возвращать просто <button>.
  // Но так как вы используете Next.js, я добавлю поддержку asChild или просто оставлю эту логику на совести BookTabs.
  // В рамках обучения давайте сделаем правильно: TabsTrigger - это кнопка.
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onValueChange(value);
      }}
    >
      {children}
    </button>
  );
}