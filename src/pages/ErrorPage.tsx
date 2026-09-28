import { useRouteError } from 'react-router';
import { Button, Card } from '../components/ui';
import { useT } from '../i18n';

/** Shown instead of a blank screen if something breaks. Your data is untouched. */
export function ErrorPage() {
  const t = useT();
  const error = useRouteError() as Error | undefined;
  return (
    <div className="mx-auto max-w-lg p-6 safe-top">
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t.errors.generic}</h1>
        <p className="mb-4 text-ink-soft">{t.errors.dataSafe}</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => location.reload()}>
            {t.errors.reload}
          </Button>
          <Button onClick={() => { location.hash = '#/today'; location.reload(); }}>{t.nav.today}</Button>
        </div>
        {error?.message && <pre className="mt-4 overflow-x-auto rounded-lg bg-sunk p-3 text-xs text-ink-soft">{error.message}</pre>}
      </Card>
    </div>
  );
}
