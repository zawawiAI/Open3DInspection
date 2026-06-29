import { useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { timeAgo } from '../lib/format';
import type { Activity, Report } from '../types';

const ICON: Record<Activity['type'], string> = {
  created: '✚',
  assigned: '→',
  started: '▶',
  escalated: '▲',
  resolved: '✓',
  closed: '◼',
  reopened: '↺',
  comment: '💬',
  exhausted: '⚠',
};

export function ActivityFeed({ report }: { report: Report }) {
  const addComment = useCrmStore((s) => s.addComment);
  const [text, setText] = useState('');

  const items = [...report.activity].sort((a, b) => b.at - a.at);

  return (
    <div className="feed">
      <form
        className="feed__compose"
        onSubmit={(e) => {
          e.preventDefault();
          addComment(report.id, text);
          setText('');
        }}
      >
        <input
          placeholder="Add a comment or note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn--primary" type="submit" disabled={!text.trim()}>
          Post
        </button>
      </form>

      <ul className="feed__list">
        {items.map((a) => (
          <li key={a.id} className={`feed__item feed__item--${a.type}`}>
            <span className="feed__icon">{ICON[a.type]}</span>
            <div className="feed__body">
              <span className="feed__message">{a.message}</span>
              <span className="feed__meta">
                {a.by} · {timeAgo(a.at)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
