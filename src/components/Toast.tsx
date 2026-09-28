import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

/** A short confirmation message at the bottom of the screen ("Saved"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const show = useCallback((text: string) => {
    const id = Date.now();
    setMsg({ text, id });
    setTimeout(() => setMsg((m) => (m?.id === id ? null : m)), 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        {msg && (
          <div className="rounded-full bg-ink px-5 py-2.5 text-paper shadow-lg" key={msg.id}>
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
