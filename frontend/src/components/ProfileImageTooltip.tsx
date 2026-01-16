import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ProfileImageTooltip.css';

interface ProfileImageTooltipProps {
  imageUrl: string;
  alt: string;
  children: React.ReactElement;
  place?: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Custom tooltip component that renders in a portal to avoid stacking context issues
 */
export const ProfileImageTooltip: React.FC<ProfileImageTooltipProps> = ({
  imageUrl,
  alt,
  children,
  place = 'bottom',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipSize = 200; // Size of the tooltip image
      const offset = 10; // Gap between trigger and tooltip

      let top = 0;
      let left = 0;

      switch (place) {
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipSize / 2);
          left = rect.right + offset;
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipSize / 2);
          left = rect.left - tooltipSize - offset;
          break;
        case 'top':
          top = rect.top - tooltipSize - offset;
          left = rect.left + (rect.width / 2) - (tooltipSize / 2);
          break;
        case 'bottom':
        default:
          top = rect.bottom + offset;
          left = rect.left + (rect.width / 2) - (tooltipSize / 2);
          break;
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + tooltipSize > viewportWidth) {
        left = viewportWidth - tooltipSize - 10;
      }
      if (left < 10) {
        left = 10;
      }
      if (top + tooltipSize > viewportHeight) {
        top = viewportHeight - tooltipSize - 10;
      }
      if (top < 10) {
        top = 10;
      }

      setPosition({ top, left });
    }
  }, [isVisible, place]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="profile-image-tooltip-portal"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 999999,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={imageUrl}
              alt={alt}
              className="profile-image-tooltip-large"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('ffxiv-logo.png')) {
                  target.src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                }
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
};

