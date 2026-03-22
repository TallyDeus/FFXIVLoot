import React from 'react';
import { BisJobCategory, BisJobCategoryLabels } from '../types/member';
import './BisJobCategoryBadge.css';

const CATEGORY_CLASS: Record<BisJobCategory, string | null> = {
  [BisJobCategory.Unknown]: null,
  [BisJobCategory.Tank]: 'bis-job-cat--tank',
  [BisJobCategory.Healer]: 'bis-job-cat--healer',
  [BisJobCategory.DpsMelee]: 'bis-job-cat--melee',
  [BisJobCategory.DpsPhysRanged]: 'bis-job-cat--phys',
  [BisJobCategory.DpsCaster]: 'bis-job-cat--caster',
};

interface BisJobCategoryBadgeProps {
  category: BisJobCategory | undefined;
  /** Shown as the main text when set (e.g. PLD); tooltip shows role group name. */
  abbrev?: string | null;
  className?: string;
}

/**
 * Colored label for main/off spec job on the BiS tracker (abbrev text, category-colored background).
 */
export const BisJobCategoryBadge: React.FC<BisJobCategoryBadgeProps> = ({ category, abbrev, className = '' }) => {
  const cat = category ?? BisJobCategory.Unknown;
  if (cat === BisJobCategory.Unknown) return null;

  const mod = CATEGORY_CLASS[cat];
  if (!mod) return null;

  const label = abbrev?.trim() ? abbrev.trim().toUpperCase() : BisJobCategoryLabels[cat];
  const title = BisJobCategoryLabels[cat];

  return (
    <span className={`bis-job-cat-badge ${mod} ${className}`.trim()} title={title}>
      {label}
    </span>
  );
};
