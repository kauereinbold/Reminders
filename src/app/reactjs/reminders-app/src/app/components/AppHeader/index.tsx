import React from 'react';

import { IS_MOCK_API } from '@/app/api';
import {
  VIEW_ORDER,
  ViewName,
  WeekProgress,
} from '@/app/util/reminderGroups';

import styles from './index.module.css';

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  onCreate: () => void;
  view: ViewName;
  counts: Record<ViewName, number>;
  onSelectView: (view: ViewName) => void;
  progress: WeekProgress;
}

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const shortDateLabel = (): string =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

// Renders the desktop header and, under 760px (CSS media query, no JS
// breakpoint), the mobile shell: filter chips row inside the sticky header,
// compressed progress strip below it, and the New FAB.
export function AppHeader({
  query,
  onQueryChange,
  onCreate,
  view,
  counts,
  onSelectView,
  progress,
}: Props): React.ReactElement {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Reminders</span>
          <span className={styles.date}>{todayLabel()}</span>
          <span className={styles.dateShort}>{shortDateLabel()}</span>
          {IS_MOCK_API && (
            <span
              className={styles.demoBadge}
              title="No backend: data lives in your browser and resets on reload"
            >
              Demo data
            </span>
          )}
        </div>

        <div className={styles.searchPill}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8c8577"
            strokeWidth="2.2"
            className={styles.searchIcon}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            type="text"
            placeholder="Search reminders"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.chips}>
          {VIEW_ORDER.map(name => {
            const active = name === view;
            return (
              <button
                key={name}
                type="button"
                aria-current={active || undefined}
                className={active ? styles.chipActive : styles.chip}
                onClick={() => onSelectView(name)}
              >
                <span>{name}</span>
                <span className={styles.chipCount}>{counts[name]}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={onCreate}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New reminder
        </button>
      </header>

      <div className={styles.progressStrip}>
        <span className={styles.progressPct}>{progress.pct}%</span>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <span className={styles.progressCaption}>{progress.caption}</span>
      </div>

      <button
        type="button"
        aria-label="New reminder"
        className={styles.fab}
        onClick={onCreate}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
    </>
  );
}
