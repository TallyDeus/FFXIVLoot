import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Member, BisJobCategory, bisJobCategoryFromAbbrev } from '../types/member';
import { Button } from './Button';
import { RoleTag } from './Tag';
import { BisJobCategoryBadge } from './BisJobCategoryBadge';
import './BiSMemberProfileModal.css';

interface BiSMemberProfileModalProps {
  member: Member | null;
  onClose: () => void;
}

function resolveProfileImageUrl(member: Member): string {
  return member.profileImageUrl
    ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${member.profileImageUrl}`
    : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
}

/**
 * Modal shown when clicking a member's avatar on the BiS tracker: large image, role, and XivGear links.
 */
export const BiSMemberProfileModal: React.FC<BiSMemberProfileModalProps> = ({ member, onClose }) => {
  useEffect(() => {
    if (!member) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [member, onClose]);

  if (!member) return null;

  const imageUrl = resolveProfileImageUrl(member);
  const hasMainLink = Boolean(member.xivGearLink?.trim());
  const hasOffLink = Boolean(member.offSpecXivGearLink?.trim());
  const currentJobCat =
    member.mainSpecBisJobCategory ?? bisJobCategoryFromAbbrev(member.mainSpecBisJobAbbrev);

  return createPortal(
    <div
      className="bis-member-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bis-member-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bis-member-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="bis-member-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <img
          src={imageUrl}
          alt={member.name}
          className="bis-member-modal-image"
          onError={e => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('ffxiv-logo.png')) {
              target.src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
            }
          }}
        />

        <h2 id="bis-member-modal-title" className="bis-member-modal-name">
          {member.name}
        </h2>

        <div className="bis-member-modal-role-job-row">
          <div className="bis-member-modal-meta-item">
            <span className="bis-member-modal-role-label">Role</span>
            <RoleTag role={member.role} />
          </div>
          <div className="bis-member-modal-meta-item">
            <span className="bis-member-modal-role-label">Job</span>
            {currentJobCat !== BisJobCategory.Unknown ? (
              <BisJobCategoryBadge category={currentJobCat} abbrev={member.mainSpecBisJobAbbrev} />
            ) : (
              <span className="bis-member-modal-muted">Not set</span>
            )}
          </div>
        </div>

        <div className="bis-member-modal-links">
          {hasMainLink ? (
            <Button
              component="a"
              href={member.xivGearLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="primary"
              size="medium"
            >
              View main spec BiS
            </Button>
          ) : null}
          {hasOffLink ? (
            <Button
              component="a"
              href={member.offSpecXivGearLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="primary"
              size="medium"
            >
              View off spec BiS
            </Button>
          ) : null}
          {!hasMainLink && !hasOffLink ? (
            <p className="bis-member-modal-no-links">No XivGear links set for this member.</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
