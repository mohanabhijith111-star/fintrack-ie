// src/utils/storage.js
// localStorage quota monitoring and safe write utilities for FinTrack IE.

import { useState, useEffect } from 'react';

const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB in bytes
const WARN_PCT = 80;
const CRITICAL_PCT = 95;

/**
 * Measure current FinTrack localStorage usage.
 * Only counts keys prefixed with 'ft_'.
 * @returns {{ used: number, limit: number, percentage: number }}
 */
export function getStorageUsage() {
  try {
    let used = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("ft_") || key === "_savedAt") {
        const val = localStorage.getItem(key) || "";
        used += (key.length + val.length) * 2; // UTF-16: 2 bytes per char
      }
    }
    const percentage = Math.round((used / STORAGE_LIMIT) * 100);
    return { used, limit: STORAGE_LIMIT, percentage };
  } catch {
    return { used: 0, limit: STORAGE_LIMIT, percentage: 0 };
  }
}

/**
 * Write to localStorage, throwing a descriptive error on quota exceeded.
 * @param {string} key
 * @param {string} value
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
      throw new Error(
        "Storage quota exceeded — please export and archive old data to free space."
      );
    }
    throw e;
  }
}

/**
 * Custom React hook that monitors localStorage usage and warns the user.
 * @returns {{ used: number, limit: number, percentage: number }}
 */
export function useStorageMonitor() {
  const [usage, setUsage] = useState(() => getStorageUsage());

  useEffect(() => {
    const check = () => {
      const u = getStorageUsage();
      setUsage(u);
      if (u.percentage >= CRITICAL_PCT) {
        console.warn(`\u26a0\ufe0f Storage ${u.percentage}% full — export transactions now!`);
        alert(
          `\u26a0\ufe0f Storage nearly full (${u.percentage}%)!\n\nExport your transactions to free space before data loss occurs.`
        );
      } else if (u.percentage >= WARN_PCT) {
        console.warn(`\u26a0\ufe0f Storage ${u.percentage}% full`);
      }
    };

    check(); // run on mount

    // Cross-tab updates
    window.addEventListener("storage", check);
    // Internal updates triggered by safeSetItem callers
    window.addEventListener("ft:storage-changed", check);

    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("ft:storage-changed", check);
    };
  }, []);

  return usage;
}
