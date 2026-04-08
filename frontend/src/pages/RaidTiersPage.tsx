import React, { useCallback, useEffect, useState } from 'react';
import { raidTierService } from '../services/api/raidTierService';
import { LegacyRootDataStatus, RaidTierMemberPreview, RaidTierOverview } from '../types/raidTier';
import { MemberRole, PermissionRole } from '../types/member';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RoleTag, Tag, TagType } from '../components/Tag';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import './RaidTiersPage.css';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function partitionRaidTierMembers(members: RaidTierMemberPreview[]): {
  dps: RaidTierMemberPreview[];
  support: RaidTierMemberPreview[];
} {
  const dps: RaidTierMemberPreview[] = [];
  const support: RaidTierMemberPreview[] = [];
  for (const m of members) {
    if (m.role === MemberRole.Support) support.push(m);
    else dps.push(m);
  }
  const byName = (a: RaidTierMemberPreview, b: RaidTierMemberPreview) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  dps.sort(byName);
  support.sort(byName);
  return { dps, support };
}

const RaidTierMemberPreviewRow: React.FC<{ member: RaidTierMemberPreview }> = ({ member: m }) => {
  const imageUrl = m.profileImageUrl
    ? `${apiBase}${m.profileImageUrl}`
    : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
  return (
    <li className="raid-tier-member-preview">
      <span className="raid-tier-member-preview-row">
        <img
          className="raid-tier-member-preview-avatar"
          src={imageUrl}
          alt={m.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
          }}
        />
        <span className="raid-tier-member-preview-name">{m.name}</span>
      </span>
    </li>
  );
};

const RaidTierMembersByRole: React.FC<{ members: RaidTierMemberPreview[] }> = ({ members }) => {
  const active = members.filter((m) => m.isActive);
  const { dps, support } = partitionRaidTierMembers(active);
  return (
    <div className="raid-tier-members-columns">
      <div className="raid-tier-members-column">
        <div className="raid-tier-members-column-head">
          <RoleTag role={MemberRole.DPS} variant="badge" />
        </div>
        <ul className="raid-tier-members-list">
          {dps.map((m) => (
            <RaidTierMemberPreviewRow key={m.id} member={m} />
          ))}
        </ul>
      </div>
      <div className="raid-tier-members-column">
        <div className="raid-tier-members-column-head">
          <RoleTag role={MemberRole.Support} variant="badge" />
        </div>
        <ul className="raid-tier-members-list">
          {support.map((m) => (
            <RaidTierMemberPreviewRow key={m.id} member={m} />
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Overview of raid tiers with on-disk previews; managers can create, switch, rename, import, and admins can delete.
 */
export const RaidTiersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const isAdmin = hasPermission(PermissionRole.Administrator);
  const canManage = hasPermission(PermissionRole.Manager) || isAdmin;

  const [overview, setOverview] = useState<RaidTierOverview[]>([]);
  const [legacy, setLegacy] = useState<LegacyRootDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTierName, setNewTierName] = useState('');
  const [importTierName, setImportTierName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RaidTierOverview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ov = await raidTierService.listOverview();
      setOverview(ov);
      if (canManage) {
        const leg = await raidTierService.getLegacyRootStatus();
        setLegacy(leg);
      } else {
        setLegacy(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load raid tiers');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = newTierName.trim();
    if (!name) return;
    try {
      await raidTierService.create(name);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create tier', 'error');
    }
  };

  const handleImport = async () => {
    const name = importTierName.trim();
    if (!name) return;
    try {
      await raidTierService.importFromRoot(name);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not import files', 'error');
    }
  };

  const handleSetCurrent = async (tierId: string) => {
    try {
      await raidTierService.setCurrent(tierId);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not switch tier', 'error');
    }
  };

  const handleSaveRename = async (tierId: string) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      await raidTierService.rename(tierId, name);
      setEditingId(null);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not rename tier', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await raidTierService.delete(pendingDelete.id);
      setPendingDelete(null);
      window.location.reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete tier', 'error');
    }
  };

  const hasLegacy = (legacy?.hasLegacyFiles && legacy.fileNames.length > 0) ?? false;

  return (
    <div className="raid-tiers-page">
      <header className="page-header">
        <div>
          <h1>Raid Tiers</h1>
          <p className="raid-tiers-intro">
            Each tier keeps its own members, BiS data, schedule, loot weeks, and assignment history. Switching the active tier
            changes what the rest of the app loads.
          </p>
        </div>
      </header>

      {error && <div className="raid-tiers-error">{error}</div>}

      {!canManage && (
        <p className="raid-tiers-readonly-note">
          You can review tier summaries here. Managers and administrators can create tiers, switch the active tier, and
          edit names on this page.
        </p>
      )}

      {loading ? (
        <div className="raid-tiers-loading">Loading tiers…</div>
      ) : (
        <>
          {canManage && (
            <div className="raid-tiers-actions-panel">
              {hasLegacy && (
                <>
                  <h2>Import loose data files</h2>
                  <div className="raid-tiers-callout">
                    JSON files are still in the data folder root:{' '}
                    <strong>{legacy?.fileNames.join(', ')}</strong>. Name
                    this import and move them into a new tier. The app will switch to that tier afterward.
                  </div>
                  <div className="raid-tiers-form-row">
                    <div className="form-group">
                      <label htmlFor="raid-tier-import-name">Name for imported data</label>
                      <input
                        id="raid-tier-import-name"
                        type="text"
                        value={importTierName}
                        onChange={(e) => setImportTierName(e.target.value)}
                        placeholder="e.g. Shadowbringers raids"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleImport}
                      disabled={!importTierName.trim()}
                    >
                      Import into new tier
                    </Button>
                  </div>
                </>
              )}

              <h2>New raid tier</h2>
              <p>
                Copies roster (names, roles, PINs), BiS links, manual BiS rows, acquisition progress, and
                schedule (standard raid days + availability; responses remapped to cloned member ids) from the{' '}
                <strong>current</strong> tier. Weeks and loot history start empty.
              </p>
              <div className="raid-tiers-form-row">
                <div className="form-group">
                  <label htmlFor="raid-tier-new-name">Tier name</label>
                  <input
                    id="raid-tier-new-name"
                    type="text"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    placeholder="e.g. Dawntrail M5–M8"
                    autoComplete="off"
                  />
                </div>
                <Button variant="outlined" color="primary" size="small" onClick={handleCreate} disabled={!newTierName.trim()}>
                  Create tier
                </Button>
              </div>
            </div>
          )}

          <h2 className="raid-tiers-section-title">All tiers</h2>
          <div className="raid-tiers-grid">
            {overview.map((tier) => (
              <article
                key={tier.id}
                className={`raid-tier-card${tier.isCurrent ? ' raid-tier-card--current' : ''}`}
              >
                <div className="raid-tier-card-header">
                  {editingId === tier.id ? (
                    <div className="raid-tier-card-rename">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        aria-label="Tier name"
                        autoFocus
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleSaveRename(tier.id)}
                        disabled={!editingName.trim()}
                      >
                        Save
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="raid-tier-card-title-row">
                      <h3 className="raid-tier-card-title">{tier.name}</h3>
                      {tier.isCurrent && <Tag type={TagType.StatusCurrent} />}
                      {canManage && (
                        <Button variant="text" size="small" onClick={() => {
                          setEditingId(tier.id);
                          setEditingName(tier.name);
                        }}>
                          Rename
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="raid-tier-card-body">
                  <p className="raid-tier-card-meta">
                    Created {new Date(tier.createdAtUtc).toLocaleString()}
                  </p>
                  <div className="raid-tier-members-block">
                    <div className="raid-tier-members-label">Members</div>
                    {(tier.members?.filter((m) => m.isActive).length ?? 0) === 0 ? (
                      <p className="raid-tier-members-empty">No members</p>
                    ) : (
                      <RaidTierMembersByRole members={tier.members ?? []} />
                    )}
                  </div>
                  <dl className="raid-tier-stats">
                    <dt>Weeks</dt>
                    <dd>
                      {tier.weekCount} tracked · current week #{tier.activeWeekNumber}
                    </dd>
                  </dl>
                </div>
                {canManage && editingId !== tier.id && (
                  <div className="raid-tier-card-footer">
                    {!tier.isCurrent && (
                      <Button variant="contained" color="primary" size="small" onClick={() => handleSetCurrent(tier.id)}>
                        Use this tier
                      </Button>
                    )}
                    {isAdmin && !tier.isCurrent && (
                      <Button variant="outlined" color="error" size="small" onClick={() => setPendingDelete(tier)}>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Delete raid tier?"
          message={`Permanently delete tier "${pendingDelete.name}" and all of its data? This cannot be undone.`}
          confirmText="Delete"
          confirmButtonColor="error"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
