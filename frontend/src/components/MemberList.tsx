import React from 'react';
import { Member, MemberRole, PermissionRole } from '../types/member';
import { RoleTag, PermissionRoleTag } from './Tag';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import './MemberList.css';

interface MemberListProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: string) => void;
}

/**
 * Component for displaying and managing the list of raid members
 */
export const MemberList: React.FC<MemberListProps> = ({ members, onEdit, onDelete }) => {
  const { user, hasPermission, isSelf } = useAuth();

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

  return (
    <div className="member-list">
      <h2>Raid Members</h2>
      {members.length === 0 ? (
        <p>No members added yet. Add your first member below.</p>
      ) : (
        <table className="member-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Permission Role</th>
              <th>Main Spec BiS</th>
              <th>Off Spec BiS</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>
                  <RoleTag role={member.role} />
                </td>
                <td>
                  <PermissionRoleTag permissionRole={member.permissionRole ?? PermissionRole.User} />
                </td>
                <td>
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
                <td>
                  {member.offSpecXivGearLink ? (
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
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

