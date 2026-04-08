import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiRefreshCw, FiX } from 'react-icons/fi';
import type { RaidPlan } from '../types/raidPlan';
import { raidPlanUrlForSlide } from '../utils/raidPlanUrl';
import { RaidPlanIframeCrop } from './RaidPlanIframeCrop';
import styles from './RaidPlanViewerDialog.module.css';

/** Slides before/after the current index to preload (window size = 2×radius + 1 at most). */
const SLIDE_WINDOW_RADIUS = 3;

function windowIndices(center: number, maxIdx: number, radius: number): number[] {
  const lo = Math.max(0, center - radius);
  const hi = Math.min(maxIdx, center + radius);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** Nearest to current first; ties use ascending slide index. */
function sortByPriority(center: number, indices: number[]): number[] {
  return [...indices].sort((a, b) => {
    const da = Math.abs(a - center);
    const db = Math.abs(b - center);
    if (da !== db) return da - db;
    return a - b;
  });
}

export interface RaidPlanViewerDialogProps {
  open: boolean;
  plan: RaidPlan | null;
  onClose: () => void;
  onRefreshed?: (plan: RaidPlan) => void;
  onRefreshRequest?: (id: string) => Promise<RaidPlan>;
}

export const RaidPlanViewerDialog: React.FC<RaidPlanViewerDialogProps> = ({
  open,
  plan,
  onClose,
  onRefreshed,
  onRefreshRequest,
}) => {
  const slides = plan?.slides ?? [];
  const [slideIndex, setSlideIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSlideIndex(0);
  }, [plan?.id]);

  const maxSlide = Math.max(0, slides.length - 1);
  const safeIndex = slides.length === 0 ? 0 : Math.min(slideIndex, maxSlide);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(maxSlide, i + 1));
  }, [maxSlide]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index > maxSlide) return;
      setSlideIndex(index);
    },
    [maxSlide]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goPrev, goNext, onClose]);

  const globalNotes = plan?.globalNotesRaw?.trim() ?? '';
  const externalSlideUrl = plan ? raidPlanUrlForSlide(plan.raidplanUrl, safeIndex) : '';
  /** Per-slide iframe load state (only for mounted iframes). */
  const [loadedSlides, setLoadedSlides] = useState<Record<number, boolean>>({});
  /** Stagger iframe mounts: current slide first, then the rest to avoid network jank. */
  const [mountedSlides, setMountedSlides] = useState<Set<number>>(() => new Set());

  const loadedSlidesRef = useRef<Record<number, boolean>>({});
  loadedSlidesRef.current = loadedSlides;

  const loadSlideRef = useRef<(i: number) => void>(() => {});
  loadSlideRef.current = (i: number) => {
    setLoadedSlides((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
    setMountedSlides((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  };

  const slideUrls =
    !plan || slides.length === 0 ? [] : slides.map((_, i) => raidPlanUrlForSlide(plan.raidplanUrl, i));

  useLayoutEffect(() => {
    setLoadedSlides({});
    if (!plan?.id || slides.length === 0) {
      setMountedSlides(new Set());
      return;
    }
    setMountedSlides(new Set([0]));
  }, [plan?.id, plan?.lastExtractedAtUtc, slides.length]);

  useEffect(() => {
    if (!open) {
      setMountedSlides(new Set());
      setLoadedSlides({});
    }
  }, [open]);

  /**
   * Prefer a window around the current index (±radius) for new mounts and stagger order.
   * Unmount slides outside the window only if they have not finished loading yet — fully loaded slides stay
   * mounted so jumping back does not reload the iframe.
   */
  useEffect(() => {
    if (!open || !plan?.id || slides.length === 0) return;
    const cancelledRef = { current: false };
    const maxIdx = slides.length - 1;
    const windowList = windowIndices(safeIndex, maxIdx, SLIDE_WINDOW_RADIUS);
    const windowSet = new Set(windowList);
    const priority = sortByPriority(safeIndex, windowList);

    setMountedSlides((prev) => {
      const loaded = loadedSlidesRef.current;
      const next = new Set<number>();
      Array.from(prev).forEach((i) => {
        if (windowSet.has(i) || loaded[i]) next.add(i);
      });
      next.add(safeIndex);
      return next;
    });

    const loaded = loadedSlidesRef.current;
    const rest = priority.filter((i) => i !== safeIndex && !loaded[i]);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const INITIAL_MS = 45;
    const STEP_MS = 48;
    rest.forEach((idx, i) => {
      timers.push(
        setTimeout(() => {
          if (cancelledRef.current) return;
          setMountedSlides((prev) => {
            const next = new Set(prev);
            next.add(idx);
            return next;
          });
        }, INITIAL_MS + i * STEP_MS)
      );
    });

    return () => {
      cancelledRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [open, plan?.id, plan?.lastExtractedAtUtc, slides.length, safeIndex]);

  const activeSlideReady = loadedSlides[safeIndex] === true;

  const handleRefresh = async () => {
    if (!plan || !onRefreshRequest) return;
    setRefreshing(true);
    try {
      const updated = await onRefreshRequest(plan.id);
      onRefreshed?.(updated);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Dialog
      open={open && !!plan}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      TransitionProps={{ timeout: 280 }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
      PaperProps={{
        sx: {
          width: 'min(98vw, 1680px)',
          height: 'min(92vh, 920px)',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'var(--tc-bg-card, #2A2F38)',
          border: '1px solid var(--tc-border, #3A3F4A)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px var(--tc-shadow, rgba(0,0,0,0.3))',
        },
      }}
    >
      {plan && (
        <>
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pr: 1,
              py: 1.5,
              borderBottom: '1px solid var(--tc-border, #3A3F4A)',
              color: 'var(--tc-text-main, #EDEDED)',
            }}
          >
            <Typography
              component="span"
              variant="h6"
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 600,
                fontSize: '1.1rem',
                lineHeight: 1.3,
                color: 'inherit',
              }}
            >
              {plan.title}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="flex-end"
              flexShrink={0}
              sx={{ gap: 0.25 }}
            >
              <Tooltip title="Refresh from RaidPlan.io">
                <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
                  <IconButton
                    size="small"
                    onClick={() => void handleRefresh()}
                    disabled={!onRefreshRequest || refreshing}
                    aria-label="Refresh from RaidPlan.io"
                    sx={{
                      minWidth: 26,
                      minHeight: 26,
                      p: '3px',
                      color: 'var(--tc-text-muted)',
                      '& svg': { width: '0.9rem', height: '0.9rem' },
                      '&:hover': { color: 'var(--tc-accent-primary)', bgcolor: 'rgba(111, 141, 174, 0.12)' },
                    }}
                  >
                    <FiRefreshCw className={refreshing ? 'raid-plan-spin' : undefined} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Open this slide on RaidPlan.io (slide 1 = base URL; slides 2+ use #2, #3, …)">
                <IconButton
                  size="small"
                  component="a"
                  href={externalSlideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open this slide on RaidPlan.io"
                  sx={{
                    minWidth: 26,
                    minHeight: 26,
                    p: '3px',
                    color: 'var(--tc-text-muted)',
                    '& svg': { width: '0.9rem', height: '0.9rem' },
                    '&:hover': { color: 'var(--tc-accent-primary)', bgcolor: 'rgba(111, 141, 174, 0.12)' },
                  }}
                >
                  <FiExternalLink />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton
                  size="small"
                  onClick={onClose}
                  aria-label="Close viewer"
                  sx={{
                    minWidth: 26,
                    minHeight: 26,
                    p: '3px',
                    color: 'var(--tc-text-muted)',
                    '& svg': { width: '0.9rem', height: '0.9rem' },
                    '&:hover': { color: 'var(--tc-text-main)', bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <FiX />
                </IconButton>
              </Tooltip>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ flex: 1, minHeight: 0, p: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ flex: 1, minHeight: 0 }}>
              <Box
                sx={{
                  flex: { xs: '1 1 auto', md: '2.35 1 0' },
                  minHeight: { xs: 220, md: 0 },
                  bgcolor: 'var(--tc-bg-dark, #1B1F27)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {slides.length === 0 ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--tc-text-muted)',
                      px: 2,
                      textAlign: 'center',
                      fontSize: '0.9rem',
                    }}
                  >
                    No slides were extracted. Try Refresh or check the RaidPlan URL.
                  </Box>
                ) : (
                  <>
                    <Box
                      sx={{
                        flexShrink: 0,
                        px: 1,
                        pt: 1,
                        pb: 0.5,
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Stack
                        direction="row"
                        component="div"
                        role="tablist"
                        aria-label="Slides"
                        flexWrap="wrap"
                        useFlexGap
                        sx={{
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 0.5,
                          py: 0.25,
                          width: '100%',
                          maxWidth: '100%',
                        }}
                      >
                        {slides.map((_, i) => {
                          const selected = i === safeIndex;
                          return (
                            <Button
                              key={i}
                              size="small"
                              variant="text"
                              onClick={() => goToSlide(i)}
                              role="tab"
                              aria-selected={selected}
                              tabIndex={selected ? 0 : -1}
                              aria-label={`Slide ${i + 1}`}
                              sx={{
                                flexShrink: 0,
                                minWidth: 40,
                                px: 1,
                                py: 0.4,
                                fontSize: '0.8125rem',
                                fontWeight: selected ? 700 : 500,
                                lineHeight: 1.2,
                                color: selected ? 'var(--tc-bg-dark, #1B1F27)' : 'var(--tc-text-muted)',
                                bgcolor: selected ? 'var(--tc-accent-primary, #6F8DAE)' : 'transparent',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: selected ? 'var(--tc-accent-primary)' : 'var(--tc-border)',
                                '&:hover': {
                                  bgcolor: selected
                                    ? 'var(--tc-accent-primary)'
                                    : 'rgba(111, 141, 174, 0.14)',
                                  borderColor: 'var(--tc-accent-primary)',
                                  color: selected ? 'var(--tc-bg-dark)' : 'var(--tc-text-main)',
                                },
                              }}
                            >
                              {i + 1}
                            </Button>
                          );
                        })}
                      </Stack>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        p: 1,
                        pt: 0,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: { xs: 260, md: 320 },
                          position: 'relative',
                          bgcolor: 'var(--tc-bg-dark, #1B1F27)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid var(--tc-border, #3A3F4A)',
                        }}
                      >
                        <>
                          {!activeSlideReady && (
                            <Box className={styles.canvasShimmer} aria-hidden sx={{ bgcolor: 'rgba(0,0,0,0.2)' }} />
                          )}
                          {slideUrls.map((url, idx) => {
                            if (!mountedSlides.has(idx)) return null;
                            const isActive = idx === safeIndex;
                            const loaded = loadedSlides[idx] === true;
                            return (
                              <Box
                                key={`${plan.id}-embed-${idx}`}
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  zIndex: isActive ? 2 : 0,
                                  opacity: isActive ? (loaded ? 1 : 0.45) : 0,
                                  visibility: isActive ? 'visible' : 'hidden',
                                  pointerEvents: isActive ? 'auto' : 'none',
                                  transition: 'opacity 0.28s ease',
                                  willChange: 'opacity',
                                }}
                                aria-hidden={!isActive}
                              >
                                <RaidPlanIframeCrop
                                  iframeKey={`${plan.id}-${idx}`}
                                  src={url}
                                  onLoad={() => loadSlideRef.current(idx)}
                                />
                              </Box>
                            );
                          })}
                        </>
                      </Box>
                    </Box>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{
                        py: 1.25,
                        px: 1,
                        borderTop: '1px solid var(--tc-border, #3A3F4A)',
                        bgcolor: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FiChevronLeft />}
                        onClick={goPrev}
                        disabled={safeIndex <= 0}
                        sx={{
                          borderColor: 'var(--tc-border)',
                          color: 'var(--tc-text-main)',
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: 'var(--tc-accent-primary)',
                            bgcolor: 'rgba(111, 141, 174, 0.12)',
                          },
                          '&.Mui-disabled': { borderColor: 'var(--tc-border)', color: 'var(--tc-text-muted)', opacity: 0.5 },
                        }}
                      >
                        Prev
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<FiChevronRight />}
                        onClick={goNext}
                        disabled={safeIndex >= maxSlide}
                        sx={{
                          borderColor: 'var(--tc-border)',
                          color: 'var(--tc-text-main)',
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: 'var(--tc-accent-primary)',
                            bgcolor: 'rgba(111, 141, 174, 0.12)',
                          },
                          '&.Mui-disabled': { borderColor: 'var(--tc-border)', color: 'var(--tc-text-muted)', opacity: 0.5 },
                        }}
                      >
                        Next
                      </Button>
                    </Stack>
                  </>
                )}
              </Box>

              <Box
                className={styles.scroll}
                sx={{
                  flex: { xs: '0 0 auto', md: '0.95 1 0' },
                  minWidth: { md: 280 },
                  maxWidth: { md: 440 },
                  minHeight: 0,
                  borderLeft: { xs: 'none', md: '1px solid var(--tc-border, #3A3F4A)' },
                  borderTop: { xs: '1px solid var(--tc-border, #3A3F4A)', md: 'none' },
                  bgcolor: 'var(--tc-bg-surface, #2A2F38)',
                  p: 2,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="overline"
                  display="block"
                  gutterBottom
                  sx={{
                    color: 'var(--tc-text-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    fontSize: '0.7rem',
                  }}
                >
                  Plan notes
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--tc-text-muted)',
                    lineHeight: 1.5,
                    fontSize: '0.875rem',
                  }}
                >
                  {globalNotes || '—'}
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
