import React, { useLayoutEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';

/**
 * Crop RaidPlan.io’s embedded page to the main Fabric canvas (~#plan_view CSS box).
 * Cross-origin: we cannot read the DOM; pan offsets are tuned for a typical desktop layout.
 * Adjust OFFSET_Y (or DOC_W) if the crop drifts after RaidPlan CSS changes.
 */
/** Visible crop width (tuned vs RaidPlan layout). */
const CANVAS_W = 1323;
/** Tuned vs RaidPlan canvas; includes extra vertical extent if the crop was cutting off the bottom. */
const CANVAS_H = 715.25;

/** Emulated iframe layout width (desktop). Must exceed crop width + OFFSET_X. */
const DOC_W = 1400;
/** Must exceed OFFSET_Y + CANVAS_H so the iframe is tall enough to scroll/paint the full crop. */
const DOC_H = 1000;

/** Pan: document x at left edge of crop (tuned; increase = show less on the left). */
const OFFSET_X = 35;
/**
 * Distance from top of iframe document to top of visible canvas.
 * Increase to hide more above the canvas.
 */
const OFFSET_Y = 154;

export interface RaidPlanIframeCropProps {
  src: string;
  iframeKey: string;
  onLoad?: () => void;
}

/**
 * Shows only the plan canvas: clip rect + scaled iframe (CSS/markup, no server screenshot).
 * Memoized on src/iframeKey so parent re-renders do not reset the iframe.
 */
const RaidPlanIframeCropInner: React.FC<RaidPlanIframeCropProps> = ({ src, iframeKey, onLoad }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      setScale(Math.min(w / CANVAS_W, h / CANVAS_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      ref={hostRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: 'var(--tc-bg-dark, #1B1F27)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: CANVAS_W,
            height: CANVAS_H,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            position: 'relative',
          }}
        >
          <Box
            component="iframe"
            key={iframeKey}
            title="RaidPlan slide"
            src={src}
            onLoad={onLoad}
            sx={{
              position: 'absolute',
              left: -OFFSET_X,
              top: -OFFSET_Y,
              width: DOC_W,
              height: DOC_H,
              border: 'none',
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
          />
        </Box>
      </Box>
    </Box>
  );
};

export const RaidPlanIframeCrop = React.memo(RaidPlanIframeCropInner, (a, b) => a.src === b.src && a.iframeKey === b.iframeKey);
