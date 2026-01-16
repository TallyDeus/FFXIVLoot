import React, { useState, useEffect } from 'react';
import { Member, MemberRole, PermissionRole } from '../types/member';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import './MemberForm.css';

interface MemberFormProps {
  member?: Member;
  onSave: (member: Omit<Member, 'id'> | Member) => void;
  onCancel: () => void;
  isOpen: boolean;
  onValidationError?: (message: string) => void;
}

/**
 * Component for adding or editing a raid member
 */
export const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, isOpen, onValidationError }) => {
  const { user, canEditPermissionRole } = useAuth();
  const [name, setName] = useState(member?.name || '');
  const [role, setRole] = useState(member?.role ?? 0);
  const [permissionRole, setPermissionRole] = useState<PermissionRole>(member?.permissionRole ?? PermissionRole.User);
  const [xivGearLink, setXivGearLink] = useState(member?.xivGearLink || '');
  const [offSpecXivGearLink, setOffSpecXivGearLink] = useState(member?.offSpecXivGearLink || '');

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setPermissionRole(member.permissionRole ?? PermissionRole.User);
      setXivGearLink(member.xivGearLink || '');
      setOffSpecXivGearLink(member.offSpecXivGearLink || '');
    } else {
      setName('');
      setRole(0);
      setPermissionRole(PermissionRole.User);
      setXivGearLink('');
      setOffSpecXivGearLink('');
    }
  }, [member]);

  const validateXivGearLink = (link: string): boolean => {
    if (!link.trim()) return true; // Empty is allowed
    return link.trim().startsWith('https://xivgear.app/?page=sl|');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      if (onValidationError) {
        onValidationError('Name is required');
      }
      return;
    }

    // Validate xivgear links
    if (xivGearLink && !validateXivGearLink(xivGearLink)) {
      if (onValidationError) {
        onValidationError('Invalid URL. It has to be a XivGear Short Link.');
      }
      return;
    }

    if (offSpecXivGearLink && !validateXivGearLink(offSpecXivGearLink)) {
      if (onValidationError) {
        onValidationError('Invalid URL. It has to be a XivGear Short Link.');
      }
      return;
    }

    // Check if current user can edit permission roles (only Administrators)
    const canEditRole = user && user.permissionRole === PermissionRole.Administrator;
    
    const memberData: Omit<Member, 'id'> | Member = member
      ? { 
          ...member, 
          name: name.trim(), 
          role,
          permissionRole: canEditRole ? permissionRole : member.permissionRole,
          xivGearLink: xivGearLink.trim() || undefined,
          offSpecXivGearLink: offSpecXivGearLink.trim() || undefined
        }
      : { 
          name: name.trim(), 
          role,
          permissionRole: canEditRole ? permissionRole : PermissionRole.User,
          xivGearLink: xivGearLink.trim() || undefined, 
          bisItems: [],
          offSpecBisItems: [],
          offSpecXivGearLink: offSpecXivGearLink.trim() || undefined
        };

    onSave(memberData);
  };

  if (!isOpen) return null;

  return (
    <div className="member-form-overlay">
      <div className="member-form-container">
        <form onSubmit={handleSubmit} className="member-form">
          <h3>{member ? 'Edit Member' : 'Add New Member'}</h3>
          
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter member name"
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-button ${role === MemberRole.DPS ? 'active dps' : 'inactive'}`}
                onClick={() => setRole(MemberRole.DPS)}
              >
                DPS
              </button>
              <button
                type="button"
                className={`role-button ${role === MemberRole.Support ? 'active support' : 'inactive'}`}
                onClick={() => setRole(MemberRole.Support)}
              >
                Support
              </button>
            </div>
          </div>

          {user && user.permissionRole === PermissionRole.Administrator && (
            <div className="form-group">
              <label htmlFor="permissionRole">Permission Role</label>
              <select
                id="permissionRole"
                value={permissionRole}
                onChange={(e) => setPermissionRole(Number(e.target.value) as PermissionRole)}
                className="permission-role-select"
              >
                <option value={PermissionRole.User}>User</option>
                <option value={PermissionRole.Manager}>Manager</option>
                <option value={PermissionRole.Administrator}>Administrator</option>
              </select>
              <small>Only Administrators can change permission roles</small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="xivGearLink">XivGear Link (Main Spec)</label>
            <input
              type="url"
              id="xivGearLink"
              value={xivGearLink}
              onChange={(e) => setXivGearLink(e.target.value)}
              placeholder="https://xivgear.app/?page=sl|..."
            />
            <small>Paste the xivgear link for this member's main spec best-in-slot list</small>
          </div>

          <div className="form-group">
            <label htmlFor="offSpecXivGearLink">XivGear Link (Off Spec)</label>
            <input
              type="url"
              id="offSpecXivGearLink"
              value={offSpecXivGearLink}
              onChange={(e) => setOffSpecXivGearLink(e.target.value)}
              placeholder="https://xivgear.app/?page=sl|..."
            />
            <small>Paste the xivgear link for this member's off spec best-in-slot list</small>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="contained" color="primary">
              {member ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
