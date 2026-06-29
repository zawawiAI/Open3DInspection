import { buildChain } from '../lib/escalation';
import type { Person, Report } from '../types';

const STATE_LABEL: Record<string, string> = {
  current: 'Assigned now',
  attempted: 'Tried — passed on',
  available: 'Next in line',
  unavailable: 'Unavailable',
};

export function EscalationChain({
  report,
  people,
}: {
  report: Report;
  people: Person[];
}) {
  const chain = buildChain(report, people);

  return (
    <div className="chain">
      {chain.map((step, i) => (
        <div key={step.person.id} className={`chain__step chain__step--${step.state}`}>
          <div className="chain__node">
            <span className="chain__tier">T{step.person.order}</span>
            {i < chain.length - 1 && <span className="chain__line" />}
          </div>
          <div className="chain__info">
            <span className="chain__name">{step.person.name}</span>
            <span className="chain__role">{step.person.role}</span>
            <span className={`chain__state chain__state--${step.state}`}>
              {STATE_LABEL[step.state]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
