import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useScheduleMobileScroll } from '../contexts/ScheduleMobileScrollContext';
import { Button } from './Button';
import styles from './PhoneScheduleChrome.module.css';

export const PhoneScheduleChrome: React.FC = () => {
  const { user } = useAuth();
  const { invokeThisWeekScroll, thisWeekScrollReady } = useScheduleMobileScroll();

  if (!user) return null;

  return (
    <header className={styles.bar}>
      <div className={styles.barLeft}>
        <h1 className={styles.title}>Schedule</h1>
        <Button
          variant="outlined"
          size="small"
          className={styles.thisWeekBtn}
          onClick={invokeThisWeekScroll}
          disabled={!thisWeekScrollReady}
        >
          This week
        </Button>
      </div>
    </header>
  );
};
