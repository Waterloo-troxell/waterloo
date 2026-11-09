"use client";

import { useState } from "react";
import { Button, Notice } from "@/app/_components/ui";

/** Shows a fresh set of recovery codes exactly once, with ways to keep them. */
export function RecoveryCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = [
    "Waterloo recovery codes",
    `Made ${new Date().toISOString().slice(0, 10)}. Each works once.`,
    "",
    ...codes,
    "",
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: "waterloo-recovery-codes.txt",
    });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-border bg-bg p-4 font-mono text-sm tabular-nums">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" variant="quiet" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="quiet" onClick={download}>
          Download
        </Button>
        <Button type="button" variant="quiet" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <Notice>
        Keep these somewhere that is <strong>not your phone</strong>: printed, or in your{" "}
        <em>personal</em> vault, never the shared one. If you lose your phone and these, the
        other owner cannot let you back in. That is on purpose.
      </Notice>
    </div>
  );
}
