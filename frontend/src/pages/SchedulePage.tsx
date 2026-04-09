import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';
import { scheduleService } from '../services/api/scheduleService';
import {
  ScheduleConsensus,
  type ScheduleAvailability,
  type ScheduleConsensusType,
  type ScheduleDayHeader,
  type ScheduleMemberRow,
  type ScheduleView,
  type ScheduleWeekBlock,
  WEEKDAY_LABELS,
} from '../types/schedule';
import { PermissionRole } from '../types/member';
import { useAuth } from '../contexts/AuthContext';
import { FaComment, FaRegComment } from 'react-icons/fa';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { signalRService } from '../services/signalrService';
import { ScheduleAvailabilityPicker } from '../components/schedule/ScheduleAvailabilityPicker';
import { mondayOfWeekIso, scheduleRangeStartMonday, todayLocalIso } from '../utils/scheduleDates';
import styles from './SchedulePage.module.css';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NOTE_TOOLTIP_SX = {
  maxWidth: 320,
  whiteSpace: 'pre-wrap' as const,
  py: 1,
  px: 1.25,
  bgcolor: 'var(--tc-bg-surface)',
  color: 'var(--tc-text-main)',
  border: '1px solid var(--tc-border)',
  fontSize: '0.8125rem',
  lineHeight: 1.45,
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
};

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

function formatDateDdMm(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  return `${m[3]}/${m[2]}`;
}

function formatWeekRange(weekStartMonday: string): string {
  const start = new Date(`${weekStartMonday}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function truncateText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function consensusLabel(c: ScheduleConsensusType): string {
  switch (c) {
    case ScheduleConsensus.Raiding:
      return 'Raiding';
    case ScheduleConsensus.MaybeRaiding:
      return 'Maybe';
    case ScheduleConsensus.NotRaiding:
      return 'Not raiding';
    default:
      return 'Incomplete';
  }
}

function thConsensusBg(c: ScheduleConsensusType): string {
  switch (c) {
    case ScheduleConsensus.Raiding:
      return styles.hRaiding;
    case ScheduleConsensus.MaybeRaiding:
      return styles.hMaybe;
    case ScheduleConsensus.NotRaiding:
      return styles.hNo;
    default:
      return styles.hIncomplete;
  }
}

function thConsensusText(c: ScheduleConsensusType): string {
  switch (c) {
    case ScheduleConsensus.Raiding:
      return styles.cRaiding;
    case ScheduleConsensus.MaybeRaiding:
      return styles.cMaybe;
    case ScheduleConsensus.NotRaiding:
      return styles.cNo;
    default:
      return styles.cIncomplete;
  }
}

function tdByValue(val: ScheduleAvailability): string {
  switch (val) {
    case 'yes':
      return styles.tdYes;
    case 'maybe':
      return styles.tdMaybe;
    case 'no':
      return styles.tdNo;
    default:
      return '';
  }
}

function getCellDisplay(
  m: ScheduleMemberRow,
  day: ScheduleDayHeader
): { val: ScheduleAvailability; storedComment?: string | null } {
  const cell = m.cellsByDate[day.date] ?? { status: null };
  const val: ScheduleAvailability =
    cell.status === 'yes' || cell.status === 'no' || cell.status === 'maybe'
      ? cell.status
      : day.isStandardRaidDay
        ? 'yes'
        : 'no';
  return {
    val,
    storedComment: cell.comment,
  };
}

/** Legacy: per-day comments on maybe/no before week-level notes existed. */
function legacyWeekCommentFallback(m: ScheduleMemberRow, week: ScheduleWeekBlock): string | null {
  for (const day of week.days) {
    const cell = m.cellsByDate[day.date];
    if (!cell || (cell.status !== 'maybe' && cell.status !== 'no')) continue;
    const text = (cell.comment ?? '').trim();
    if (text) return text;
  }
  return null;
}

function getWeekCommentDisplay(m: ScheduleMemberRow, week: ScheduleWeekBlock): string | null {
  const key = week.weekStartMonday;
  const stored = m.weekCommentsByWeekStart?.[key]?.trim();
  if (stored) return stored;
  return legacyWeekCommentFallback(m, week);
}

export const SchedulePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const canManageSchedule = hasPermission(PermissionRole.Manager);

  const rangeStartMonday = useMemo(() => scheduleRangeStartMonday(), []);

  const [view, setView] = useState<ScheduleView | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState(false);
  const [localStandardDays, setLocalStandardDays] = useState<number[]>([]);
  const [standardDaysModalOpen, setStandardDaysModalOpen] = useState(false);

  const [commentModal, setCommentModal] = useState<{
    memberId: string;
    memberName: string;
    weekStartMonday: string;
    text: string;
  } | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const didInitialScroll = useRef(false);
  const programmaticSnapRef = useRef(false);

  const thisWeekMonday = mondayOfWeekIso(todayLocalIso());

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) setLoading(true);
      try {
        const v = await scheduleService.getView(rangeStartMonday);
        setView(v);
        setLocalStandardDays([...v.standardRaidDaysOfWeek]);
      } catch (e) {
        if (!silent) {
          showToast(e instanceof Error ? e.message : 'Failed to load schedule', 'error');
          setView(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [rangeStartMonday, showToast]
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const mountedRef = { current: true };
    const onScheduleUpdated = () => {
      if (!mountedRef.current) return;
      void loadRef.current({ silent: true });
    };
    const setupSignalR = async () => {
      try {
        await signalRService.start();
        signalRService.onScheduleUpdated(onScheduleUpdated);
      } catch (error) {
        console.error('Schedule: failed to connect SignalR', error);
      }
    };
    void setupSignalR();
    return () => {
      mountedRef.current = false;
      signalRService.offScheduleUpdated(onScheduleUpdated);
    };
  }, []);

  const snapToNearestWeek = useCallback(() => {
    const wheel = wheelRef.current;
    if (!wheel || programmaticSnapRef.current) return;
    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!slides.length) return;
    const st = wheel.scrollTop;
    let target = slides[0].offsetTop;
    let bestDist = Infinity;
    for (const slide of slides) {
      const top = slide.offsetTop;
      const dist = Math.abs(top - st);
      if (dist < bestDist) {
        bestDist = dist;
        target = top;
      }
    }
    if (Math.abs(st - target) < 3) return;
    programmaticSnapRef.current = true;
    wheel.scrollTo({ top: target, behavior: 'smooth' });
    window.setTimeout(() => {
      programmaticSnapRef.current = false;
    }, 450);
  }, []);

  useLayoutEffect(() => {
    if (!view || didInitialScroll.current) return;
    didInitialScroll.current = true;
    const wheel = wheelRef.current;
    if (!wheel) return;
    const idx = view.weeks.findIndex((w) => w.weekStartMonday === thisWeekMonday);
    const slide = idx >= 0 ? slideRefs.current[idx] : slideRefs.current[0];
    if (slide) wheel.scrollTop = slide.offsetTop;
  }, [view, thisWeekMonday]);

  useEffect(() => {
    if (!view) return;
    const wheel = wheelRef.current;
    if (!wheel) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (programmaticSnapRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        snapToNearestWeek();
      }, 150);
    };
    wheel.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      wheel.removeEventListener('scroll', onScroll);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [view, snapToNearestWeek]);

  const scrollToThisWeek = () => {
    const wheel = wheelRef.current;
    if (!view || !wheel) return;
    const idx = view.weeks.findIndex((w) => w.weekStartMonday === thisWeekMonday);
    if (idx < 0) return;
    const slide = slideRefs.current[idx];
    if (!slide) return;
    programmaticSnapRef.current = true;
    wheel.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
    window.setTimeout(() => {
      programmaticSnapRef.current = false;
    }, 450);
  };

  const handleCellChange = async (
    memberId: string,
    date: string,
    status: ScheduleAvailability,
    currentComment?: string
  ) => {
    if (!view) return;
    const vs = view.viewStartMonday;
    try {
      const next = await scheduleService.upsertResponse(vs, {
        date,
        status,
        comment: status === 'yes' ? undefined : currentComment,
        memberId: canManageSchedule && memberId !== user?.id ? memberId : undefined,
      });
      setView(next);
      setLocalStandardDays([...next.standardRaidDaysOfWeek]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  };

  const handleWeekFill = useCallback(
    async (memberId: string, week: ScheduleWeekBlock, status: ScheduleAvailability) => {
      if (!view) return;
      const vs = view.viewStartMonday;
      const memberIdParam = canManageSchedule && memberId !== user?.id ? memberId : undefined;
      try {
        const next = await scheduleService.upsertWeekResponsesBulk(vs, {
          weekStartMonday: week.weekStartMonday,
          status,
          memberId: memberIdParam,
        });
        setView(next);
        setLocalStandardDays([...next.standardRaidDaysOfWeek]);
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Could not save', 'error');
      }
    },
    [view, canManageSchedule, user?.id, showToast]
  );

  const saveStandardDays = async () => {
    if (!view) return;
    setSavingDays(true);
    try {
      const next = await scheduleService.updateStandardDays(view.viewStartMonday, localStandardDays);
      setView(next);
      setLocalStandardDays([...next.standardRaidDaysOfWeek]);
      setStandardDaysModalOpen(false);
      showToast('Standard raid days saved.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save settings', 'error');
    } finally {
      setSavingDays(false);
    }
  };

  const openStandardDaysModal = () => {
    if (view) setLocalStandardDays([...view.standardRaidDaysOfWeek]);
    setStandardDaysModalOpen(true);
  };

  const toggleStandardDay = (dow: number) => {
    setLocalStandardDays((prev) =>
      prev.includes(dow) ? prev.filter((x) => x !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  };

  const openWeekComment = (memberId: string, memberName: string, weekStartMonday: string, text: string) => {
    setCommentModal({ memberId, memberName, weekStartMonday, text: text ?? '' });
  };

  const saveCommentModal = async () => {
    if (!commentModal || !view) return;
    const { memberId, weekStartMonday, text } = commentModal;
    try {
      const next = await scheduleService.upsertWeekComment(view.viewStartMonday, {
        weekStartMonday,
        comment: text.trim() || null,
        memberId: canManageSchedule && memberId !== user?.id ? memberId : undefined,
      });
      setView(next);
      setCommentModal(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save comment', 'error');
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Schedule</h1>
        <div className={styles.headerActions}>
          <Button variant="outlined" size="small" onClick={scrollToThisWeek} disabled={!view || !view.weeks.length}>
            This week
          </Button>
          {canManageSchedule && (
            <Button variant="outlined" size="small" onClick={openStandardDaysModal}>
              Standard raid days…
            </Button>
          )}
        </div>
      </header>

      {loading && <div className={styles.loading}>Loading schedule…</div>}

      {!loading && view && (
        <div ref={wheelRef} className={styles.weekWheel}>
          {view.weeks.map((week, weekIdx) => {
            const isThisWeek = week.weekStartMonday === thisWeekMonday;
            const isPastWeek = week.weekStartMonday < thisWeekMonday;
            return (
            <div
              key={week.weekStartMonday}
              ref={(el) => {
                slideRefs.current[weekIdx] = el;
              }}
              className={styles.weekSlide}
            >
              <section
                className={cx(
                  styles.weekCard,
                  isThisWeek && styles.weekCardCurrent,
                  !isThisWeek && isPastWeek && styles.weekCardPast,
                  !isThisWeek && !isPastWeek && styles.weekCardFuture
                )}
              >
                <div className={styles.weekTitleRow}>
                  <h2 className={styles.weekTitle}>Week of {formatWeekRange(week.weekStartMonday)}</h2>
                  {isThisWeek && <span className={styles.thisWeekBadge}>This week</span>}
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.thMember}>Member</th>
                        {week.days.map((day) => (
                          <th
                            key={day.date}
                            className={cx(
                              styles.thDay,
                              thConsensusBg(day.consensus),
                              day.isStandardRaidDay && styles.thDayStandard
                            )}
                          >
                            <span className={styles.thDow}>{day.dayName}</span>
                            <span className={styles.thDate}>{formatDateDdMm(day.date)}</span>
                            <span className={cx(styles.thConsensus, thConsensusText(day.consensus))}>
                              {consensusLabel(day.consensus)}
                            </span>
                          </th>
                        ))}
                        <th className={styles.thComments}>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.members.map((m) => {
                        const isSelfRow = Boolean(user?.id && m.id === user.id);
                        const canEditRow = canManageSchedule || m.id === user?.id;
                        const avatarSrc = m.profileImageUrl
                          ? `${apiBase}${m.profileImageUrl}`
                          : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                        const weekNoteText = getWeekCommentDisplay(m, week);
                        const hasWeekNote = Boolean(weekNoteText?.trim());
                        return (
                          <tr
                            key={m.id}
                            className={cx(isSelfRow && styles.trSelf)}
                            aria-label={isSelfRow ? 'Your availability row' : undefined}
                          >
                            <td className={styles.tdMember}>
                              <span className={styles.memberInner}>
                                <div className={styles.avatarWrap}>
                                  <img
                                    className={styles.avatarImg}
                                    src={avatarSrc}
                                    alt=""
                                    width={28}
                                    height={28}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                                    }}
                                  />
                                </div>
                                <span className={styles.memberName}>{m.name}</span>
                              </span>
                            </td>
                            {week.days.map((day) => {
                              const { val, storedComment } = getCellDisplay(m, day);
                              return (
                                <td
                                  key={day.date}
                                  className={cx(styles.tdCell, tdByValue(val))}
                                >
                                  <div className={styles.tdCellInner}>
                                    <ScheduleAvailabilityPicker
                                      value={val}
                                      disabled={!canEditRow}
                                      ariaLabel={`${m.name}, ${formatDateDdMm(day.date)}`}
                                      weekFillHint={canEditRow}
                                      onChange={(next, e) => {
                                        if (e.shiftKey && canEditRow) {
                                          e.preventDefault();
                                          void handleWeekFill(m.id, week, next);
                                        } else {
                                          void handleCellChange(
                                            m.id,
                                            day.date,
                                            next,
                                            storedComment ?? undefined
                                          );
                                        }
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            })}
                            <td
                              className={cx(
                                styles.tdComments,
                                hasWeekNote && styles.tdCommentsHasNote
                              )}
                            >
                              <div className={styles.weekNoteRow}>
                                {hasWeekNote && (
                                  <Tooltip
                                    title={weekNoteText ?? ''}
                                    placement="left"
                                    arrow
                                    enterDelay={200}
                                    slotProps={{
                                      tooltip: { sx: NOTE_TOOLTIP_SX },
                                      arrow: { sx: { color: 'var(--tc-bg-surface)' } },
                                    }}
                                  >
                                    <span className={styles.weekNotePreview}>
                                      {truncateText(weekNoteText ?? '', 96)}
                                    </span>
                                  </Tooltip>
                                )}
                                {canEditRow && (
                                  <Tooltip
                                    title={hasWeekNote ? 'Edit comment' : 'Add comment'}
                                    placement="left"
                                    arrow
                                    enterDelay={200}
                                    slotProps={{
                                      tooltip: { sx: NOTE_TOOLTIP_SX },
                                      arrow: { sx: { color: 'var(--tc-bg-surface)' } },
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className={cx(
                                        styles.weekNoteIconBtn,
                                        hasWeekNote && styles.weekNoteIconBtnActive
                                      )}
                                      aria-label={hasWeekNote ? 'Edit comment' : 'Add comment'}
                                      onClick={() =>
                                        openWeekComment(m.id, m.name, week.weekStartMonday, weekNoteText ?? '')
                                      }
                                    >
                                      {hasWeekNote ? (
                                        <FaComment className={styles.weekNoteIconSvg} aria-hidden />
                                      ) : (
                                        <FaRegComment className={styles.weekNoteIconSvg} aria-hidden />
                                      )}
                                    </button>
                                  </Tooltip>
                                )}
                                {!canEditRow && !hasWeekNote && (
                                  <span className={styles.commentsEmpty}>—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            );
          })}
        </div>
      )}

      {standardDaysModalOpen && view && canManageSchedule && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => !savingDays && setStandardDaysModalOpen(false)}
        >
          <div
            className={cx(styles.modalPanel, styles.modalPanelWide)}
            role="dialog"
            aria-labelledby="schedule-standard-days-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="schedule-standard-days-title" className={styles.modalTitle}>
              Standard raid days
            </h3>
            <p className={styles.modalHint}>
              Choose which weekdays are usual progression nights. Those columns default to <strong>Yes</strong> for
              everyone until someone changes their cell; other weekdays default to <strong>No</strong>.
            </p>
            <div className={styles.dayChecks}>
              {WEEKDAY_LABELS.map((label, dow) => (
                <label key={label} className={styles.dayCheckLabel}>
                  <input
                    type="checkbox"
                    checked={localStandardDays.includes(dow)}
                    onChange={() => toggleStandardDay(dow)}
                    disabled={savingDays}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button variant="outlined" size="small" onClick={() => setStandardDaysModalOpen(false)} disabled={savingDays}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => void saveStandardDays()}
                disabled={savingDays}
              >
                {savingDays ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {commentModal && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setCommentModal(null)}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-labelledby="schedule-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="schedule-modal-title" className={styles.modalTitle}>
              Comment — {commentModal.memberName}
            </h3>
            <textarea
              className={styles.textarea}
              value={commentModal.text}
              onChange={(e) => setCommentModal({ ...commentModal, text: e.target.value })}
              rows={4}
              placeholder=""
            />
            <div className={styles.modalActions}>
              <Button variant="outlined" size="small" onClick={() => setCommentModal(null)}>
                Cancel
              </Button>
              <Button variant="contained" color="primary" size="small" onClick={() => void saveCommentModal()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
