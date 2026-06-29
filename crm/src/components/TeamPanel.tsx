import { useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import type { Person } from '../types';

export function TeamPanel() {
  const people = useCrmStore((s) => s.people);
  const reports = useCrmStore((s) => s.reports);
  const addPerson = useCrmStore((s) => s.addPerson);
  const updatePerson = useCrmStore((s) => s.updatePerson);
  const removePerson = useCrmStore((s) => s.removePerson);
  const toggleAvailability = useCrmStore((s) => s.toggleAvailability);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Field Technician');
  const [order, setOrder] = useState(1);

  const sorted = [...people].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );

  const activeCount = (id: string) =>
    reports.filter(
      (r) =>
        r.assigneeId === id &&
        (r.status === 'assigned' || r.status === 'in_progress'),
    ).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPerson({
      name: name.trim(),
      role,
      order,
      available: true,
      skills: [],
    });
    setName('');
  };

  return (
    <div className="team">
      <div className="team__intro">
        <h2>Team &amp; escalation order</h2>
        <p>
          Reports route to the available person with the <strong>lowest tier</strong>{' '}
          first. When they decline, can&apos;t repair, or miss the SLA, the next
          available person in the chain is assigned automatically. Turn someone{' '}
          <em>off</em> to skip them while they&apos;re unavailable.
        </p>
      </div>

      <form className="team__add" onSubmit={submit}>
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <label className="team__tier">
          Tier
          <input
            type="number"
            min={1}
            max={9}
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 1)}
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Add person
        </button>
      </form>

      <table className="team__table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Name</th>
            <th>Role</th>
            <th>Active jobs</th>
            <th>Available</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p: Person) => (
            <tr key={p.id} className={p.available ? '' : 'row--off'}>
              <td>
                <input
                  className="tier-input"
                  type="number"
                  min={1}
                  max={9}
                  value={p.order}
                  onChange={(e) =>
                    updatePerson(p.id, {
                      order: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </td>
              <td>{p.name}</td>
              <td>{p.role}</td>
              <td className="center">{activeCount(p.id)}</td>
              <td className="center">
                <button
                  className={`toggle ${p.available ? 'toggle--on' : ''}`}
                  onClick={() => toggleAvailability(p.id)}
                  aria-label="toggle availability"
                >
                  <span className="toggle__knob" />
                </button>
              </td>
              <td className="center">
                <button
                  className="link-danger"
                  onClick={() => removePerson(p.id)}
                  title="Remove"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
