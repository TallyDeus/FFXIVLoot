import React from 'react';
import IconButton from '@mui/material/IconButton';
import { Switch, Tooltip } from '@mui/material';
import { FiEdit2, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import { BisJobCategory, bisJobCategoryFromAbbrev, Member, MemberRole, PermissionRole } from '../types/member';
import { BisJobCategoryBadge } from './BisJobCategoryBadge';
import { useAuth } from '../contexts/AuthContext';
import { ProfileImageTooltip } from './ProfileImageTooltip';

interface MemberListProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: string) => void;
  onActiveChange?: (member: Member, isActive: boolean) => void;
}

function cx(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

function memberImageUrl(member: Member): string {
  return member.profileImageUrl
    ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${member.profileImageUrl}`
    : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
}

/**
 * Only use side-by-side DPS/Support when the roster block is wide enough that **each** column can
 * hold the horizontal in-card strip (`@roster` container breakpoint: 901px in tailwind.config.js).
 */
const ROSTER_MIN_WIDTH_PER_ROLE_COL_PX = 904;
const ROSTER_GROUPS_H_GAP_PX = 28;
const ROSTER_TWO_COLUMN_MIN_PX = ROSTER_MIN_WIDTH_PER_ROLE_COL_PX * 2 + ROSTER_GROUPS_H_GAP_PX;

function canonicalMemberId(s: string | undefined): string {
  return (s ?? '').trim().replace(/^\{|\}$/g, '').toLowerCase();
}

/** Shell only; inner grid uses the same template on every row so columns line up across members. */
const cardShell =
  'w-full min-w-0 max-w-full rounded-lg border border-[var(--tc-border)] bg-[var(--tc-bg-card)] px-3 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.14)] transition-[border-color,box-shadow] duration-150 ease-out hover:border-[rgba(111,141,174,0.4)] hover:shadow-[0_2px_10px_rgba(0,0,0,0.18)]';

/**
 * Wide: fixed name band + two equal spec columns + auto tail — identical per card so "Main spec" / "Off spec" / actions align vertically.
 * Narrow: single column stack.
 */
const cardGrid =
  'grid w-full min-w-0 grid-cols-1 gap-3 @roster:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1fr)_auto] @roster:items-center @roster:gap-x-4 @roster:gap-y-0';

/** Soft chip-style row actions — same shape, hue matches intent (accent vs. danger). */
const rowActionIconBase =
  '!rounded-md !p-1.5 !shadow-sm [border:1px_solid_transparent] transition-[background-color,box-shadow,border-color] duration-150 [&_svg]:h-[0.95rem] [&_svg]:w-[0.95rem]';

const editIconBtn = `${rowActionIconBase} !border-[var(--tc-accent-primary)]/30 !bg-[rgba(111,141,174,0.1)] !text-[var(--tc-accent-primary)] hover:!border-[var(--tc-accent-primary)]/45 hover:!bg-[rgba(111,141,174,0.18)]`;

const deleteIconBtn = `${rowActionIconBase} !border-[rgba(199,74,61,0.35)] !bg-[rgba(199,74,61,0.08)] !text-[var(--tc-role-dps)] hover:!border-[rgba(199,74,61,0.5)] hover:!bg-[rgba(199,74,61,0.14)]`;

const bisIconBtn = '!p-1 [&_svg]:h-4 [&_svg]:w-4';

export const MemberList: React.FC<MemberListProps> = ({ members, onEdit, onDelete, onActiveChange }) => {
  const { user, hasPermission } = useAuth();
  const rosterRootRef = React.useRef<HTMLDivElement>(null);

  const [stackRoleGroups, setStackRoleGroups] = React.useState(true);

  React.useLayoutEffect(() => {
    const el = rosterRootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        setStackRoleGroups(window.innerWidth < ROSTER_TWO_COLUMN_MIN_PX);
      }
      return;
    }
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setStackRoleGroups(w < ROSTER_TWO_COLUMN_MIN_PX);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  const canToggleActive =
    hasPermission(PermissionRole.Administrator) || hasPermission(PermissionRole.Manager);

  const staffMayEditAll = hasPermission(PermissionRole.Manager);
  const staffMayDelete = hasPermission(PermissionRole.Administrator);

  const selfMayEdit = (m: Member): boolean => {
    if (!user || staffMayEditAll) {
      return false;
    }
    const ua = canonicalMemberId(user.id);
    const ma = canonicalMemberId(m.id);
    if (ua.length > 0 && ma.length > 0 && ua === ma) {
      return true;
    }
    return (
      !!user.name &&
      !!m.name &&
      user.name.trim().toLowerCase() === m.name.trim().toLowerCase()
    );
  };

  const { dpsMembers, supportMembers } = React.useMemo(() => {
    const dps = members
      .filter((m) => m.role === MemberRole.DPS)
      .sort((a, b) => a.name.localeCompare(b.name));
    const support = members
      .filter((m) => m.role === MemberRole.Support)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { dpsMembers: dps, supportMembers: support };
  }, [members]);

  const renderSpecJob = (
    storedCategory: BisJobCategory | undefined,
    abbrev: string | undefined,
    emptyLabel: string
  ) => {
    const derived = bisJobCategoryFromAbbrev(abbrev);
    const jobCat =
      storedCategory != null && storedCategory !== BisJobCategory.Unknown ? storedCategory : derived;
    if (jobCat === BisJobCategory.Unknown) {
      return <span className="text-[0.68rem] italic text-[var(--tc-text-muted)]">{emptyLabel}</span>;
    }
    return <BisJobCategoryBadge category={jobCat} abbrev={abbrev} />;
  };

  const renderMemberRow = (member: Member) => {
    const imageUrl = memberImageUrl(member);
    const inactive = member.isActive === false;

    return (
      <article
        key={member.id}
        role="listitem"
        className={cx(cardShell, inactive && 'border-dashed opacity-[0.88]')}
        aria-label={`${member.name}, ${member.role === MemberRole.DPS ? 'DPS' : 'Support'}`}
      >
        <div className={cardGrid}>
          <div className="flex min-w-0 items-center gap-2.5">
            <ProfileImageTooltip imageUrl={imageUrl} alt={member.name} place="right">
              <img
                src={imageUrl}
                alt=""
                className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-[var(--tc-border)] bg-[var(--tc-bg-surface)] object-cover shadow-sm"
                onError={(e) => {
                  if (member.profileImageUrl) {
                    (e.target as HTMLImageElement).src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                  }
                }}
              />
            </ProfileImageTooltip>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-nowrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 flex-1 truncate text-[0.92rem] font-semibold leading-tight text-[var(--tc-text-main)]" title={member.name}>
                  {member.name}
                </span>
                {inactive && (
                  <span
                    className="shrink-0 rounded border border-[var(--tc-border)] bg-[rgba(148,163,184,0.22)] px-[0.35rem] py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[var(--tc-text-muted)]"
                    title="Hidden from BiS, schedule, loot, raid tiers"
                  >
                    Hidden
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 @roster:flex-nowrap">
            <span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold tracking-wide text-[var(--tc-text-muted)]">
              Main spec
            </span>
            <span className="inline-flex shrink-0 items-center leading-none">{renderSpecJob(member.mainSpecBisJobCategory, member.mainSpecBisJobAbbrev, '—')}</span>
            <span className="flex min-h-8 min-w-0 flex-1 items-center">
              {member.xivGearLink ? (
                <Tooltip title="Open main spec BiS in XIVGear (new tab)">
                  <IconButton
                    component="a"
                    href={member.xivGearLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    color="primary"
                    aria-label={`View main spec BiS for ${member.name} (opens in new tab)`}
                    className={bisIconBtn}
                  >
                    <FiExternalLink />
                  </IconButton>
                </Tooltip>
              ) : (
                <span className="text-[0.8rem] leading-8 text-[var(--tc-text-muted)] opacity-80">—</span>
              )}
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.06] pt-2 @roster:flex-nowrap @roster:border-t-0 @roster:pt-0">
            <span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold tracking-wide text-[var(--tc-text-muted)]">
              Off spec
            </span>
            <span className="inline-flex shrink-0 items-center leading-none">{renderSpecJob(member.offSpecBisJobCategory, member.offSpecBisJobAbbrev, '—')}</span>
            <span className="flex min-h-8 min-w-0 flex-1 items-center">
              {member.offSpecFullCofferSet ? (
                <span className="max-w-full truncate text-[0.78rem] font-medium italic text-[var(--tc-text-muted)]" title="Full set of coffers">
                  Full coffer set
                </span>
              ) : member.offSpecXivGearLink ? (
                <Tooltip title="Open off spec BiS in XIVGear (new tab)">
                  <IconButton
                    component="a"
                    href={member.offSpecXivGearLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    color="primary"
                    aria-label={`View off spec BiS for ${member.name} (opens in new tab)`}
                    className={bisIconBtn}
                  >
                    <FiExternalLink />
                  </IconButton>
                </Tooltip>
              ) : (
                <span className="text-[0.8rem] leading-8 text-[var(--tc-text-muted)] opacity-80">—</span>
              )}
            </span>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 @roster:w-auto @roster:flex-nowrap @roster:justify-end @roster:justify-self-end @roster:border-t-0 @roster:pt-0">
            <div className="relative z-[2] flex items-center gap-1">
              {(staffMayEditAll || selfMayEdit(member)) && (
                <Tooltip title="Edit member">
                  <span className="inline-flex leading-none">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(member)}
                      color="inherit"
                      aria-label={`Edit ${member.name}`}
                      className={editIconBtn}
                    >
                      <FiEdit2 />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {staffMayDelete && (
                <Tooltip title="Delete member">
                  <span className="inline-flex leading-none">
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={() => onDelete(member.id)}
                      aria-label={`Delete ${member.name}`}
                      className={deleteIconBtn}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </div>
            {canToggleActive && onActiveChange && (
              <Tooltip
                title={
                  inactive
                    ? 'Inactive — hidden from roster views (BiS, schedule, loot, raid tiers)'
                    : 'Active — shown on roster views'
                }
                placement="top"
              >
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[0.68rem] font-medium text-[var(--tc-text-muted)]">Roster</span>
                  <Switch
                    checked={!inactive}
                    onChange={(_, checked) => onActiveChange(member, checked)}
                    size="small"
                    color="primary"
                    inputProps={{
                      'aria-label': `${inactive ? 'Inactive' : 'Active'} — ${member.name}`,
                    }}
                  />
                </div>
              </Tooltip>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderSection = (title: string, list: Member[]) => {
    if (list.length === 0) return null;
    const sectionId = `roster-${title.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <section className="@container min-w-0" aria-labelledby={sectionId}>
        <h3 className="mb-2.5 flex items-center gap-2 text-[0.82rem] font-bold uppercase tracking-[0.06em] text-[var(--tc-text-muted)]" id={sectionId}>
          {title}
          <span className="inline-flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-[rgba(111,141,174,0.2)] px-[0.35rem] text-[0.7rem] font-bold text-[var(--tc-text-main)]">
            {list.length}
          </span>
        </h3>
        <div className="grid w-full min-w-0 grid-cols-1 gap-3" role="list">
          {list.map(renderMemberRow)}
        </div>
      </section>
    );
  };

  return (
    <div className="my-5 w-full min-w-0 max-w-full" ref={rosterRootRef}>
      <h2 className="mb-4 text-[1.35rem] font-semibold text-[var(--tc-text-main)]">Raid Members</h2>
      {members.length === 0 ? (
        <p className="m-0 text-[0.95rem] text-[var(--tc-text-muted)]">No members added yet. Add your first member using the button above.</p>
      ) : (
        <div
          className={cx(
            'grid min-w-0 max-w-full gap-x-7 gap-y-5',
            stackRoleGroups ? 'grid-cols-1' : 'grid-cols-2',
          )}
        >
          {renderSection('DPS', dpsMembers)}
          {renderSection('Support', supportMembers)}
        </div>
      )}
    </div>
  );
};
