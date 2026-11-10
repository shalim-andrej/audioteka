// src/lib/redux/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

/**
 * Типизированные версии useDispatch и useSelector.
 * TypeScript знает типы state и actions — меньше ошибок.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();