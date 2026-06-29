import { useEffect } from 'react';
import { useCrmStore } from '../crm/store/useCrmStore';

interface TeamMemberSelectProps {
  value: string;
  onChange: (name: string) => void;
  label?: string;
  className?: string;
}

export function TeamMemberSelect({
  value,
  onChange,
  label = 'Author',
  className = 'author',
}: TeamMemberSelectProps) {
  const people = useCrmStore((s) => s.people);
  const sorted = [...people].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );

  if (sorted.length === 0) {
    return (
      <label className={className}>
        <span>{label}</span>
        <select disabled value="">
          <option value="">Add team members first</option>
        </select>
      </label>
    );
  }

  const selected = sorted.some((p) => p.name === value) ? value : sorted[0].name;

  useEffect(() => {
    if (sorted.length > 0 && value !== selected) onChange(selected);
  }, [sorted, value, selected, onChange]);

  return (
    <label className={className}>
      <span>{label}</span>
      <select value={selected} onChange={(e) => onChange(e.target.value)}>
        {sorted.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name} · {p.role}
          </option>
        ))}
      </select>
    </label>
  );
}
