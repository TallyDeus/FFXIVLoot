import React, { useState, useRef, useEffect, useId } from 'react';
import {
  BIS_JOB_ABBREV_OPTIONS,
  BIS_JOB_GROUP_ORDER,
  BisJobCategory,
  bisJobCategoryFromAbbrev,
} from '../types/member';
import { BisJobCategoryBadge } from './BisJobCategoryBadge';
import './BisJobAbbrevPicker.css';

export interface BisJobAbbrevPickerProps {
  id: string;
  value: string;
  onChange: (abbrev: string) => void;
  disabled?: boolean;
}

/**
 * Dropdown that shows job tags as colored badges (same visuals as BiS tracker).
 */
export const BisJobAbbrevPicker: React.FC<BisJobAbbrevPickerProps> = ({
  id,
  value,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const normalized = value.trim().toUpperCase();
  const selectedCategory = normalized ? bisJobCategoryFromAbbrev(normalized) : undefined;
  const showUnknownAbbrev = Boolean(
    normalized && selectedCategory === BisJobCategory.Unknown,
  );

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (abbrev: string) => {
    onChange(abbrev);
    setOpen(false);
  };

  return (
    <div className={`bis-job-abbrev-picker ${open ? 'bis-job-abbrev-picker--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="bis-job-abbrev-picker-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="bis-job-abbrev-picker-trigger-inner">
          {normalized && !showUnknownAbbrev && selectedCategory != null ? (
            <BisJobCategoryBadge category={selectedCategory} abbrev={normalized} />
          ) : normalized && showUnknownAbbrev ? (
            <span className="bis-job-abbrev-picker-unknown" title="Unknown job code — pick a tag below">
              {normalized}
            </span>
          ) : (
            <span className="bis-job-abbrev-picker-placeholder">Not set</span>
          )}
        </span>
        <span className="bis-job-abbrev-picker-chevron" aria-hidden>
          ▼
        </span>
      </button>

      {open && (
        <div
          id={listId}
          className="bis-job-abbrev-picker-panel"
          role="listbox"
          aria-labelledby={id}
        >
          <button
            type="button"
            role="option"
            aria-selected={!normalized}
            className={`bis-job-abbrev-picker-option bis-job-abbrev-picker-option--clear${!normalized ? ' bis-job-abbrev-picker-option--selected' : ''}`}
            onClick={() => pick('')}
          >
            <span className="bis-job-abbrev-picker-placeholder">Not set</span>
          </button>
          {BIS_JOB_GROUP_ORDER.map((group) => (
            <div key={group} className="bis-job-abbrev-picker-group">
              <div className="bis-job-abbrev-picker-group-label">{group}</div>
              <div className="bis-job-abbrev-picker-grid">
                {BIS_JOB_ABBREV_OPTIONS.filter((o) => o.group === group).map((o) => {
                  const selected = o.abbrev === normalized;
                  return (
                    <button
                      key={o.abbrev}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`bis-job-abbrev-picker-option${selected ? ' bis-job-abbrev-picker-option--selected' : ''}`}
                      onClick={() => pick(o.abbrev)}
                    >
                      <BisJobCategoryBadge category={o.category} abbrev={o.abbrev} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
