"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so Waterloo is installable and so web push
 * (M2) has somewhere to live. The worker deliberately caches nothing: the
 * brief rules out offline mode, and a stale governance screen would be
 * worse than no screen.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing costs us installability, not the app. Stay quiet.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
