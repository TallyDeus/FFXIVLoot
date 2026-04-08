import React from 'react';
import { Switch, Tooltip } from '@mui/material';
import { BisJobCategory, bisJobCategoryFromAbbrev, Member, MemberRole, PermissionRole } from '../types/member';
import { BisJobCategoryBadge } from './BisJobCategoryBadge';
import { RoleTag } from './Tag';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { ProfileImageTooltip } from './ProfileImageTooltip';
import './MemberList.css';

interface MemberListProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: string) => void;
  onActiveChange?: (member: Member, isActive: boolean) => void;
}

/**
 * Component for displaying and managing the list of raid members
 */
export const MemberList: React.FC<MemberListProps> = ({ members, onEdit, onDelete, onActiveChange }) => {
  const { user, hasPermission, isSelf } = useAuth();

  const canToggleActive =
    hasPermission(PermissionRole.Administrator) || hasPermission(PermissionRole.Manager);

  // Helper to check if user can edit a member
  const canEditMember = (member: Member): boolean => {
    if (!user) return false;
    if (hasPermission(PermissionRole.Administrator)) return true;
    if (hasPermission(PermissionRole.Manager)) return true;
    return isSelf(member.id);
  };

  // Helper to check if user can delete a member
  const canDeleteMember = (): boolean => {
    return hasPermission(PermissionRole.Administrator);
  };

  // Group members by role and sort alphabetically within each group
  const sortedMembers = React.useMemo(() => {
    const dpsMembers = members
      .filter(m => m.role === MemberRole.DPS)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const supportMembers = members
      .filter(m => m.role === MemberRole.Support)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Combine without role headers
    return [...dpsMembers, ...supportMembers];
  }, [members]);

  const renderJobCell = (member: Member) => {
    const stored = member.mainSpecBisJobCategory;
    const derived = bisJobCategoryFromAbbrev(member.mainSpecBisJobAbbrev);
    const jobCat =
      stored != null && stored !== BisJobCategory.Unknown ? stored : derived;

    if (jobCat === BisJobCategory.Unknown) {
      return null;
    }
    return <BisJobCategoryBadge category={jobCat} abbrev={member.mainSpecBisJobAbbrev} />;
  };

  return (
    <div className="member-list">
      <h2>Raid Members</h2>
      {members.length === 0 ? (
        <p>No members added yet. Add your first member below.</p>
      ) : (
        <table className="member-table">
          <thead>
            <tr>
              <th className="member-table-col-name">Name</th>
              <th className="member-table-col-role">Role</th>
              <th className="member-table-col-job">Job</th>
              <th className="member-table-col-main-bis">Main Spec BiS</th>
              <th className="member-table-col-off-bis">Off Spec BiS</th>
              {canToggleActive && onActiveChange && (
                <th className="member-table-col-active">Active</th>
              )}
              <th className="member-table-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => {
              const imageUrl = member.profileImageUrl 
                ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${member.profileImageUrl}`
                : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
              
              return (
                <tr key={member.id}>
                  <td className="member-table-col-name">
                    <div className="member-name-cell">
                      <ProfileImageTooltip imageUrl={imageUrl} alt={member.name} place="right">
                        <img 
                          src={imageUrl}
                          alt={member.name}
                          className="member-profile-image"
                          onError={(e) => {
                            // Fallback to default if custom image fails to load
                            if (member.profileImageUrl) {
                              (e.target as HTMLImageElement).src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                            }
                          }}
                        />
                      </ProfileImageTooltip>
                      <span>{member.name}</span>
                    </div>
                  </td>
                <td className="member-table-col-role">
                  <RoleTag role={member.role} />
                </td>
                <td className="member-table-col-job">{renderJobCell(member)}</td>
                <td className="member-table-col-main-bis">
                  {member.xivGearLink ? (
                    <Button 
                      component="a"
                      href={member.xivGearLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      variant="contained"
                      color="primary"
                      size="small"
                    >
                      View BiS
                    </Button>
                  ) : (
                    <span className="no-link">Not set</span>
                  )}
                </td>
                <td className="member-table-col-off-bis">
                  {member.offSpecFullCofferSet ? (
                    <span className="no-link" title="Full set of coffers">
                      Full coffer set
                    </span>
                  ) : member.offSpecXivGearLink ? (
                    <Button 
                      component="a"
                      href={member.offSpecXivGearLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      variant="contained"
                      color="primary"
                      size="small"
                    >
                      View BiS
                    </Button>
                  ) : (
                    <span className="no-link">Not set</span>
                  )}
                </td>
                {canToggleActive && onActiveChange && (
                  <td className="member-table-col-active">
                    <Tooltip
                      title={
                        member.isActive === false
                          ? 'Inactive — hidden from roster views (BiS, schedule, loot, raid tiers)'
                          : 'Active — shown on roster views'
                      }
                      placement="top"
                    >
                      <div className="member-active-toggle-cell">
                        <Switch
                          checked={member.isActive !== false}
                          onChange={(_, checked) => onActiveChange(member, checked)}
                          size="small"
                          color="primary"
                          inputProps={{
                            'aria-label': `${member.isActive === false ? 'Inactive' : 'Active'} — ${member.name}`,
                          }}
                        />
                      </div>
                    </Tooltip>
                  </td>
                )}
                <td className="member-table-col-actions">
                  <div className="member-actions-cell">
                    {canEditMember(member) && (
                      <Button 
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => onEdit(member)}
                      >
                        Edit
                      </Button>
                    )}
                    {canDeleteMember() && (
                      <Button 
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => onDelete(member.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

