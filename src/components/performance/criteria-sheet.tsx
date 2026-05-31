// Generic picker drawer — used by every Performance criteria knob. Shares the
// app drawer shell (mobile bottom sheet / desktop right panel).

import { AppDrawer } from "@/components/app-drawer";

export interface CriteriaOption<T extends string> {
  tag: T;
  label: string;
  description?: string;
}

interface Props<T extends string> {
  open: boolean;
  title: string;
  options: CriteriaOption<T>[];
  selection: T;
  onSelect: (tag: T) => void;
  onClose: () => void;
}

export function CriteriaSheet<T extends string>({
  open,
  title,
  options,
  selection,
  onSelect,
  onClose,
}: Props<T>) {
  return (
    <AppDrawer
      bodyClassName="py-1"
      maxWidthClass="max-w-md"
      open={open}
      title={title}
      onClose={onClose}
    >
      <ul className="divide-y divide-separator/60">
        {options.map((opt) => {
          const active = opt.tag === selection;

          return (
            <li key={opt.tag}>
              <button
                className="w-full flex items-start gap-3 px-5 md:px-6 py-3 text-left hover:bg-surface/60"
                type="button"
                onClick={() => {
                  onSelect(opt.tag);
                  onClose();
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">{opt.label}</div>
                  {opt.description != null && (
                    <div className="text-sm text-muted mt-0.5">
                      {opt.description}
                    </div>
                  )}
                </div>
                <svg
                  aria-hidden
                  className={active ? "text-[#5a4128]" : "text-transparent"}
                  fill="none"
                  height="18"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </AppDrawer>
  );
}
