import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ScheduleMobileScrollContextValue = {
  /** Called from SchedulePage when mounted on phone layout; clears on unmount or desktop. */
  registerThisWeekScroll: (handler: (() => void) | null, canScroll: boolean) => void;
  invokeThisWeekScroll: () => void;
  /** True when schedule has weeks and a handler is registered (phone schedule view). */
  thisWeekScrollReady: boolean;
};

const ScheduleMobileScrollContext = createContext<ScheduleMobileScrollContextValue | null>(null);

export function ScheduleMobileScrollProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<(() => void) | null>(null);
  const [thisWeekScrollReady, setThisWeekScrollReady] = useState(false);

  const registerThisWeekScroll = useCallback((handler: (() => void) | null, canScroll: boolean) => {
    handlerRef.current = handler;
    setThisWeekScrollReady(Boolean(handler && canScroll));
  }, []);

  const invokeThisWeekScroll = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({
      registerThisWeekScroll,
      invokeThisWeekScroll,
      thisWeekScrollReady,
    }),
    [registerThisWeekScroll, invokeThisWeekScroll, thisWeekScrollReady]
  );

  return (
    <ScheduleMobileScrollContext.Provider value={value}>{children}</ScheduleMobileScrollContext.Provider>
  );
}

export function useScheduleMobileScroll(): ScheduleMobileScrollContextValue {
  const ctx = useContext(ScheduleMobileScrollContext);
  if (!ctx) {
    throw new Error('useScheduleMobileScroll must be used within ScheduleMobileScrollProvider');
  }
  return ctx;
}
