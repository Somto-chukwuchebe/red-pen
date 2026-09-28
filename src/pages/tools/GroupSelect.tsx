import { useSearchParams } from 'react-router';
import { BareSelect } from '../../components/ui';
import { useStored } from '../../components/ToolFrame';
import { useGroups } from '../../db/hooks';
import type { Group } from '../../domain/types';
import { useT } from '../../i18n';

/** The group a tool is working with: from the address (?group=…), else the last one used. */
export function useToolGroup(): [Group | undefined, Group[] | undefined, (id: string) => void] {
  const groups = useGroups();
  const [params, setParams] = useSearchParams();
  const [last, setLast] = useStored<string>('group', '');
  const id = params.get('group') || last;
  const group = groups?.find((g) => g.id === id) ?? groups?.[0];
  const choose = (next: string) => {
    setLast(next);
    setParams({ group: next }, { replace: true });
  };
  return [group, groups, choose];
}

export function GroupSelect({ group, groups, onChange }: { group?: Group; groups?: Group[]; onChange: (id: string) => void }) {
  const t = useT();
  if (!groups?.length) return null;
  return (
    <BareSelect aria-label={t.common.group} value={group?.id ?? ''} onChange={(e) => onChange(e.target.value)} className="!w-auto min-w-28">
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </BareSelect>
  );
}
