/**
 * The handful of building blocks every screen uses. Styling follows the
 * brief's tokens (app/globals.css): gold only on the primary button, focus
 * rings and the approval badge.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/"
      className={`font-display font-light tracking-[0.15em] uppercase ${
        small ? "text-xl" : "text-4xl sm:text-5xl"
      }`}
    >
      Waterloo
    </Link>
  );
}

/** A narrow centred page for the sign-in screens. */
export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Wordmark />
      </div>
      <section className="rounded-md border border-border bg-panel p-6 sm:p-7">
        <h1 className="text-lg font-semibold">{title}</h1>
        {lead ? <div className="mt-2 text-sm text-text-muted">{lead}</div> : null}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

/** The page frame once someone is fully signed in. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4 sm:px-8">
          <Wordmark small />
          <div className="ml-auto flex items-center gap-5 text-sm text-text-muted">
            <Link href="/" className="hover:text-text">
              Home
            </Link>
            <Link href="/settings" className="hover:text-text">
              Settings
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-panel p-5 sm:p-6">
      {title ? (
        <h2 className="mb-4 font-mono text-xs tracking-[0.14em] text-text-muted uppercase">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const look =
    variant === "primary"
      ? "bg-gold text-bg hover:bg-gold-hover active:bg-gold-pressed font-semibold"
      : "border border-border bg-raised text-text hover:border-text-muted";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        className={`mt-1.5 block w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm placeholder:text-text-muted/60 ${
          props.className ?? ""
        }`}
      />
      {hint ? <span className="mt-1.5 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

/** A 6-digit code box that phones fill from the keypad. */
export function CodeField(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <Field
      label="6-digit code from your authenticator app"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      placeholder="123456"
      className="font-mono text-lg tracking-[0.4em]"
      {...props}
    />
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "ok";
  children: ReactNode;
}) {
  const look = {
    info: "border-border bg-raised text-text",
    error: "border-[#7a4141] bg-[#2a1b1b] text-[#e8c4c4]",
    ok: "border-[#41644b] bg-[#1b2a20] text-[#c4e3cc]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3.5 py-2.5 text-sm ${look}`}>
      {children}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs break-all">{children}</span>;
}
