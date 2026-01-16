import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './GearSlotTooltip.css';

interface GearSlotTooltipProps {
  tooltip: string;
  children: React.ReactElement;
  place?: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Custom tooltip component that renders in a portal to avoid stacking context issues
 * Used for gear slot tooltips in the BiS matrix
 */
export const GearSlotTooltip: React.FC<GearSlotTooltipProps> = ({
  tooltip,
  children,
  place = 'bottom',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const offset = 8; // Gap between trigger and tooltip

      let top = 0;
      let left = 0;

      switch (place) {
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.right + offset;
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.left - tooltipRect.width - offset;
          break;
        case 'top':
          top = rect.top - tooltipRect.height - offset;
          left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
        default:
          top = rect.bottom + offset;
          left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          break;
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + tooltipRect.width > viewportWidth) {
        left = viewportWidth - tooltipRect.width - 10;
      }
      if (left < 10) {
        left = 10;
      }
      if (top + tooltipRect.height > viewportHeight) {
        top = viewportHeight - tooltipRect.height - 10;
      }
      if (top < 10) {
        top = 10;
      }

      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Initial position calculation
      updatePosition();
      
      // Update on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      // Recalculate after a short delay to ensure tooltip is rendered
      const timeout = setTimeout(updatePosition, 0);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        clearTimeout(timeout);
      };
    }
  }, [isVisible, place]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Clone the child element to add event handlers and ref
  const childRef = (children as any).ref;
  const triggerElement = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(e);
      }
    },
    ref: (node: HTMLElement | null) => {
      // Store ref in our ref object using type assertion
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      // Preserve any existing ref
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && typeof childRef === 'object' && 'current' in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
  });

  return (
    <>
      {triggerElement}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="gear-slot-tooltip-portal"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 999999,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {tooltip}
          </div>,
          document.body
        )}
    </>
  );
};

