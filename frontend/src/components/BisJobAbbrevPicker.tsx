import React, { useState, useRef, useEffect, useLayoutEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const GAP = 4;
const VIEW_PAD = 8;
const MIN_PANEL_WIDTH = 400;
const MAX_PANEL_HEIGHT = 520;

type PortalLayout = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

function computePortalLayout(trigger: DOMRect): PortalLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.max(trigger.width, Math.min(MIN_PANEL_WIDTH, vw - VIEW_PAD * 2));
  let left = trigger.left;
  if (left + width > vw - VIEW_PAD) left = vw - VIEW_PAD - width;
  if (left < VIEW_PAD) left = VIEW_PAD;

  const spaceBelow = vh - trigger.bottom - VIEW_PAD;
  const spaceAbove = trigger.top - VIEW_PAD;
  const vhCap = vh * 0.72;

  const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;

  if (openUpward) {
    const maxHeight = Math.max(
      120,
      Math.min(MAX_PANEL_HEIGHT, Math.min(spaceAbove - GAP, vhCap)),
    );
    return {
      left,
      width,
      maxHeight,
      bottom: vh - trigger.top + GAP,
    };
  }

  const maxHeight = Math.max(
    120,
    Math.min(MAX_PANEL_HEIGHT, Math.min(spaceBelow - GAP, vhCap)),
  );
  return {
    left,
    width,
    maxHeight,
    top: trigger.bottom + GAP,
  };
}

/**
 * Dropdown that shows job tags as colored badges (same visuals as BiS tracker).
 * Panel renders in a document portal with fixed positioning so parent overflow does not clip it.
 */
export const BisJobAbbrevPicker: React.FC<BisJobAbbrevPickerProps> = ({
  id,
  value,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [portalLayout, setPortalLayout] = useState<PortalLayout | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const normalized = value.trim().toUpperCase();
  const selectedCategory = normalized ? bisJobCategoryFromAbbrev(normalized) : undefined;
  const showUnknownAbbrev = Boolean(
    normalized && selectedCategory === BisJobCategory.Unknown,
  );

  const updatePortalLayout = useCallback(() => {
    const trig = triggerRef.current;
    if (!trig) return;
    setPortalLayout(computePortalLayout(trig.getBoundingClientRect()));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPortalLayout(null);
      return;
    }
    updatePortalLayout();
    const trig = triggerRef.current;
    const ro = trig ? new ResizeObserver(updatePortalLayout) : null;
    if (trig && ro) ro.observe(trig);
    window.addEventListener('resize', updatePortalLayout);
    document.addEventListener('scroll', updatePortalLayout, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updatePortalLayout);
      document.removeEventListener('scroll', updatePortalLayout, true);
    };
  }, [open, updatePortalLayout]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
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

  const panel =
    open &&
    portalLayout &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        id={listId}
        ref={panelRef}
        className="bis-job-abbrev-picker-panel bis-job-abbrev-picker-panel--portal"
        role="listbox"
        aria-labelledby={id}
        style={{
          left: portalLayout.left,
          width: portalLayout.width,
          maxHeight: portalLayout.maxHeight,
          ...(portalLayout.top !== undefined ? { top: portalLayout.top } : {}),
          ...(portalLayout.bottom !== undefined ? { bottom: portalLayout.bottom } : {}),
        }}
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
      </div>,
      document.body,
    );

  return (
    <div className={`bis-job-abbrev-picker ${open ? 'bis-job-abbrev-picker--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
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
          {'\u25BC'}
        </span>
      </button>
      {panel}
    </div>
  );
};
