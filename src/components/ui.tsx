// Small shared building blocks. Large touch targets (≥44px) throughout.

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '../i18n';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet-danger';

const variants: Record<Variant, string> = {
  primary: 'bg-pen text-white hover:bg-pen-strong shadow-sm dark:text-[#1b0f0e]',
  secondary: 'bg-card text-ink border border-line hover:bg-sunk',
  ghost: 'text-ink hover:bg-sunk',
  // Destructive actions stay calm: ink outline, never red (red means "good" in Red Pen).
  'quiet-danger': 'text-ink border border-ink/30 hover:bg-amber-soft',
};

export function buttonClasses(variant: Variant = 'secondary', size: 'md' | 'sm' | 'lg' = 'md', className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
    size === 'sm' && 'min-h-9 px-3 text-sm',
    size === 'md' && 'min-h-11 px-4',
    size === 'lg' && 'min-h-14 px-6 text-lg',
    variants[variant],
    className,
  );
}

/** A link that looks like a button (for navigation). */
export function LinkButton({ to, variant, size, className, children }: { to: string; variant?: Variant; size?: 'md' | 'sm' | 'lg'; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' | 'lg'; icon?: ReactNode }
>(function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function Card({ className, children, as: As = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <As className={cx('rounded-2xl border border-line bg-card p-4 sm:p-5', className)}>{children}</As>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx('mb-3 text-xl font-semibold', className)}>{children}</h2>;
}

const fieldBase =
  'w-full min-h-11 rounded-xl border border-line bg-paper px-3 text-ink placeholder:text-ink-soft/70 focus:border-ink/40 focus:outline-none focus-visible:outline-3 focus-visible:outline-[var(--focus)]';

export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-ink-soft">{hint}</p>}
      {error && <p className="text-sm font-medium text-amber">{error}</p>}
    </div>
  );
}

export function TextInput({ label, hint, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode; error?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} className={cx(fieldBase, className)} aria-invalid={!!error || undefined} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea id={id} className={cx(fieldBase, 'py-2 leading-relaxed', className)} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} className={cx(fieldBase, 'appearance-auto', className)} {...rest}>
        {children}
      </select>
    </Field>
  );
}

/** A bare input/select for use inside tables and grids, where the label is a column heading. */
export const BareInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function BareInput({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldBase, 'min-h-10 px-2', className)} {...rest} />;
});

export function BareSelect({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, 'min-h-10 px-2', className)} {...rest} />;
}

export function Toggle({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-h-11 flex-1 pt-2.5">
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
      </label>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-1.5 h-8 w-14 shrink-0 rounded-full transition-colors', checked ? 'bg-pen' : 'bg-line')}
      >
        <span className={cx('absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-6')} />
      </button>
    </div>
  );
}

/** Segmented control / tabs. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-sunk p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors',
            o.value === value ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Banner({ tone = 'info', children, action }: { tone?: 'info' | 'warn' | 'good'; children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'status'}
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        tone === 'warn' && 'border-amber/40 bg-amber-soft text-ink',
        tone === 'info' && 'border-line bg-sunk text-ink',
        tone === 'good' && 'border-pen/30 bg-pen-soft text-ink',
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-pen">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-ink-soft">{children}</div>}
      {action}
    </div>
  );
}

export function GroupDot({ colour, size = 12 }: { colour: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ background: colour, width: size, height: size }} />;
}

export function GroupChip({ name, colour }: { name: string; colour: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-0.5 text-sm font-semibold">
      <GroupDot colour={colour} size={10} />
      {name}
    </span>
  );
}

/** Modal dialog built on the native <dialog> element (keyboard- and screen-reader-friendly). */
export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'm-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/40',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t.common.close} className="-mr-2 h-11 w-11 !px-0">
              <X size={20} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
