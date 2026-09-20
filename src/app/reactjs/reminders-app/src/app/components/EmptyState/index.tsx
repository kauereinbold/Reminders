import React from 'react';

import { ViewName } from '@/app/util/reminderGroups';

import styles from './index.module.css';

interface Props {
  view: ViewName;
  query: string;
  onCreate: () => void;
}

type Copy = { title: string; body: string };

// Copy per view, from the design handoff prototype. A search with no match
// wins over the view copy: the query is what the user last acted on.
const EMPTY_BY_VIEW: Record<ViewName, Copy> = {
  All: {
    title: 'Nothing on the list',
    body: 'Everything is clear. Add a reminder when something needs to come back to you.',
  },
  Today: {
    title: 'Today is clear',
    body: 'No reminders due today, check Upcoming to get ahead.',
  },
  Upcoming: {
    title: 'Nothing scheduled',
    body: 'No future reminders yet.',
  },
  Done: {
    title: 'Nothing completed yet',
    body: 'Tick something off and it will land here.',
  },
};

export function EmptyState({ view, query, onCreate }: Props): React.ReactElement {
  const search = query.trim();

  const { title, body } = search
    ? { title: 'No matches', body: `No reminder matches "${search}".` }
    : EMPTY_BY_VIEW[view];

  return (
    <div className={styles.panel} data-testid="empty-state">
      <span className={styles.title}>{title}</span>
      <span className={styles.body}>{body}</span>
      <button type="button" className={styles.button} onClick={onCreate}>
        Add a reminder
      </button>
    </div>
  );
}
