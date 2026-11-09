"use client";

import { useState } from "react";

/** A value in monospace with a Copy button next to it. */
export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs break-all">{value}</span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        className="rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:text-text"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard refused: the value is on screen to copy by hand.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
