import { useEffect, useRef } from 'react';

/**
 * Calls `callback` on a fixed interval and whenever the browser tab becomes visible.
 * The callback is always the latest version (stored in a ref), so it's safe to pass
 * functions that close over changing state without adding them to deps.
 *
 * @param {Function} callback  - async or sync function to call on each refresh
 * @param {number}   intervalMs - polling interval in milliseconds (default: 30 000)
 */
const useAutoRefresh = (callback, intervalMs = 30000) => {
  const callbackRef = useRef(callback);

  // Keep the ref pointing at the latest callback without restarting the interval
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => callbackRef.current();

    // Poll on a fixed interval
    const intervalId = setInterval(tick, intervalMs);

    // Also refresh the moment the user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs]);
};

export default useAutoRefresh;
