import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { Button, Dialog } from './ui';

/** A temporary address for showing a stored photo; released when no longer shown. */
function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/** A square thumbnail: tap to open, × to remove. */
export function PhotoThumb({ blob, label, onOpen, onRemove }: { blob: Blob; label: string; onOpen: () => void; onRemove?: () => void }) {
  const t = useT();
  const url = useObjectUrl(blob);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <button type="button" onClick={onOpen} aria-label={`${t.log.viewPhoto}: ${label}`} className="h-full w-full overflow-hidden rounded-xl border border-line bg-sunk">
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${t.log.removePhoto}: ${label}`}
          className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-ink shadow-sm"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** A photo at full size. */
export function PhotoViewer({ blob, label, onClose }: { blob: Blob; label: string; onClose: () => void }) {
  const t = useT();
  const url = useObjectUrl(blob);
  return (
    <Dialog open wide onClose={onClose} title={label} footer={<Button onClick={onClose}>{t.common.close}</Button>}>
      {url && <img src={url} alt={label} className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />}
    </Dialog>
  );
}
