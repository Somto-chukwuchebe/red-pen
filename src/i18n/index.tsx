import { createContext, useContext, type ReactNode } from 'react';
import { en, type Strings } from './en';
import { ru } from './ru';

export const dictionaries: Record<'en' | 'ru', Strings> = { en, ru };

const Ctx = createContext<Strings>(en);

export function LanguageProvider({ lang, children }: { lang: 'en' | 'ru'; children: ReactNode }) {
  return <Ctx.Provider value={dictionaries[lang] ?? en}>{children}</Ctx.Provider>;
}

/** The current language's strings: `const t = useT(); t.today.title`. */
export function useT(): Strings {
  return useContext(Ctx);
}
