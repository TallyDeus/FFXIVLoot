import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { FiExternalLink, FiRefreshCw, FiX } from 'react-icons/fi';
import type { RaidPlan } from '../types/raidPlan';
import { raidPlanUrlForSlide } from '../utils/raidPlanUrl';
import { RaidPlanIframeCrop } from './RaidPlanIframeCrop';
import styles from './RaidPlanViewerDialog.module.css';

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
  const [refreshing, setRefreshing] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  /** Base plan URL (no hash); RaidPlan.io slide UI is used inside the single iframe. */
  const embedUrl = plan ? raidPlanUrlForSlide(plan.raidplanUrl, 0) : '';
  const externalUrl = embedUrl;

  useEffect(() => {
    setIframeReady(false);
  }, [plan?.id, plan?.lastExtractedAtUtc]);

  useEffect(() => {
    if (!open) setIframeReady(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const globalNotes = plan?.globalNotesRaw?.trim() ?? '';

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
          width: 'min(99vw, 1820px)',
          height: 'min(93vh, 1000px)',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
              <Tooltip title="Open on RaidPlan.io">
                <IconButton
                  size="small"
                  component="a"
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open on RaidPlan.io"
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

          <DialogContent
            sx={{
              flex: 1,
              minHeight: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overscrollBehavior: 'contain',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <Box
                sx={{
                  flex: { xs: '1 1 auto', md: '2.35 1 0' },
                  minHeight: { xs: 220, md: 0 },
                  bgcolor: 'var(--tc-bg-dark, #1B1F27)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: 0,
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
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      position: 'relative',
                      p: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: { xs: 310, md: 370 },
                        position: 'relative',
                        bgcolor: 'var(--tc-bg-dark, #1B1F27)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid var(--tc-border, #3A3F4A)',
                      }}
                    >
                      {!iframeReady && (
                        <Box className={styles.canvasShimmer} aria-hidden sx={{ bgcolor: 'rgba(0,0,0,0.2)' }} />
                      )}
                      <RaidPlanIframeCrop
                        iframeKey={`${plan.id}-${plan.lastExtractedAtUtc ?? '0'}`}
                        src={embedUrl}
                        onLoad={() => setIframeReady(true)}
                      />
                    </Box>
                  </Box>
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
