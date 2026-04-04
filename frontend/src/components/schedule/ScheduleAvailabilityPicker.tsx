import React from 'react';
import { FaCheck, FaQuestion, FaTimes } from 'react-icons/fa';
import type { ScheduleAvailability } from '../../types/schedule';
import styles from './ScheduleAvailabilityPicker.module.css';

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

const OPTIONS: {
  value: ScheduleAvailability;
  label: string;
  Icon: typeof FaCheck;
  sel: string;
}[] = [
  { value: 'yes', label: 'Yes — available', Icon: FaCheck, sel: styles.selYes },
  { value: 'maybe', label: 'Maybe — unsure', Icon: FaQuestion, sel: styles.selMaybe },
  { value: 'no', label: 'No — not available', Icon: FaTimes, sel: styles.selNo },
];

export interface ScheduleAvailabilityPickerProps {
  value: ScheduleAvailability;
  disabled: boolean;
  /** Second argument is the click event (use shiftKey for week-fill). */
  onChange: (next: ScheduleAvailability, event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  /** When true, button titles mention Shift+click to fill the whole week. */
  weekFillHint?: boolean;
}

/**
 * Three-button toggle (no native select). Styles are CSS Modules so MUI CssBaseline cannot strip them.
 */
export const ScheduleAvailabilityPicker: React.FC<ScheduleAvailabilityPickerProps> = ({
  value,
  disabled,
  onChange,
  ariaLabel,
  weekFillHint = false,
}) => {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(styles.picker, disabled && styles.pickerDisabled)}
    >
      {OPTIONS.map(({ value: v, label, Icon, sel }) => {
        const selected = value === v;
        const title =
          weekFillHint && !disabled ? `${label} — Shift+click: set whole week for this member` : label;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            title={title}
            aria-label={label}
            aria-pressed={selected}
            onClick={(e) => onChange(v, e)}
            className={cx(styles.btn, selected && sel)}
          >
            <Icon className={styles.icon} aria-hidden />
          </button>
        );
      })}
    </div>
  );
};
