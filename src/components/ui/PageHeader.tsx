import React from "react";

/** The top of every page: what it is, one line on what it's for, and its main actions. */
export const PageHeader: React.FC<{
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, description, actions, eyebrow, children }) => (
  <header className="flex flex-col gap-3">
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1 basis-72">
        {eyebrow && <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-ink-3">{eyebrow}</div>}
        <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </header>
);

/** Standard page frame: scrolls, keeps a readable max width and consistent gutters. */
export const Page: React.FC<{ children: React.ReactNode; wide?: boolean; className?: string }> = ({ children, wide, className }) => (
  <div className="flex-1 min-h-0 overflow-y-auto">
    <div className={`mx-auto w-full ${wide ? "max-w-[1600px]" : "max-w-6xl"} px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5 ${className || ""}`}>{children}</div>
  </div>
);
