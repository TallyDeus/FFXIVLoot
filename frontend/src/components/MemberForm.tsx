import React, { useState, useEffect } from 'react';
import { Member, MemberRole, PermissionRole } from '../types/member';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { memberService } from '../services/api/memberService';
import './MemberForm.css';

interface MemberFormProps {
  member?: Member;
  onSave: (member: Omit<Member, 'id'> | Member) => void;
  onCancel: () => void;
  isOpen: boolean;
  onValidationError?: (message: string) => void;
  existingMembers?: Member[];
}

/**
 * Component for adding or editing a raid member
 */
export const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, isOpen, onValidationError, existingMembers = [] }) => {
  const { user } = useAuth();
  const [name, setName] = useState(member?.name || '');
  const [role, setRole] = useState(member?.role ?? 0);
  const [permissionRole, setPermissionRole] = useState<PermissionRole>(member?.permissionRole ?? PermissionRole.User);
  const [xivGearLink, setXivGearLink] = useState(member?.xivGearLink || '');
  const [offSpecXivGearLink, setOffSpecXivGearLink] = useState(member?.offSpecXivGearLink || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(member?.profileImageUrl || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setPermissionRole(member.permissionRole ?? PermissionRole.User);
      setXivGearLink(member.xivGearLink || '');
      setOffSpecXivGearLink(member.offSpecXivGearLink || '');
      setImagePreview(member.profileImageUrl || null);
    } else {
      setName('');
      setRole(0);
      setPermissionRole(PermissionRole.User);
      setXivGearLink('');
      setOffSpecXivGearLink('');
      setImagePreview(null);
    }
    setSelectedFile(null);
  }, [member]);

  const validateXivGearLink = (link: string): boolean => {
    if (!link.trim()) return true; // Empty is allowed
    return link.trim().startsWith('https://xivgear.app/?page=sl|');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      if (onValidationError) {
        onValidationError('Image file size must be less than 2MB');
      }
      e.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      if (onValidationError) {
        onValidationError('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.');
      }
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = async () => {
    if (!member?.id) return;
    
    try {
      setUploading(true);
      await memberService.deleteProfileImage(member.id);
      setImagePreview(null);
      setSelectedFile(null);
      if (member) {
        member.profileImageUrl = undefined;
      }
    } catch (error) {
      if (onValidationError) {
        onValidationError('Failed to delete profile image');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    
    // Validate name is not empty
    if (!trimmedName) {
      const errorMessage = 'Name is required';
      if (onValidationError) {
        onValidationError(errorMessage);
      } else {
        console.error(errorMessage);
      }
      return;
    }
    
    // Validate name is not a duplicate (case-insensitive)
    // When editing, exclude the current member from the check
    const duplicateMember = existingMembers.find(
      m => m.id !== member?.id && m.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (duplicateMember) {
      const errorMessage = 'A member with this name already exists';
      if (onValidationError) {
        onValidationError(errorMessage);
      } else {
        console.error(errorMessage);
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
          name: trimmedName, 
          role,
          permissionRole: canEditRole ? permissionRole : member.permissionRole,
          xivGearLink: xivGearLink.trim() || undefined,
          offSpecXivGearLink: offSpecXivGearLink.trim() || undefined
        }
      : { 
          name: trimmedName, 
          role,
          permissionRole: canEditRole ? permissionRole : PermissionRole.User,
          xivGearLink: xivGearLink.trim() || undefined, 
          bisItems: [],
          offSpecBisItems: [],
          offSpecXivGearLink: offSpecXivGearLink.trim() || undefined
        };

    // Note: Image upload for existing members is handled here
    // For new members, image upload should be done after member creation
    // We'll pass the file reference through memberData for handling in MembersPage
    if (selectedFile && member?.id) {
      try {
        setUploading(true);
        const result = await memberService.uploadProfileImage(member.id, selectedFile);
        memberData.profileImageUrl = result.imageUrl;
      } catch (error) {
        if (onValidationError) {
          onValidationError(error instanceof Error ? error.message : 'Failed to upload profile image');
        }
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Store selected file in memberData for new members (will be handled after creation)
    if (selectedFile && !member) {
      (memberData as any).__pendingImageFile = selectedFile;
    }

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
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              required
              maxLength={20}
              placeholder="Enter member name"
            />
          </div>

          <div className="form-group">
            <label>Profile Image</label>
            <div className="profile-image-upload">
              {imagePreview && (
                <div className="profile-image-preview">
                  <img 
                    src={imagePreview.startsWith('data:') ? imagePreview : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${imagePreview}`}
                    alt="Profile preview"
                    className="profile-image-circle"
                  />
                  {member && (
                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      disabled={uploading}
                      className="btn-delete-image"
                    >
                      Remove
                    </button>
                  )}
                  {!member && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      disabled={uploading}
                      className="btn-delete-image"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
              <input
                type="file"
                id="profileImage"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input"
              />
              <label htmlFor="profileImage" className="file-input-label">
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </label>
              <small>Max 2MB. Supported formats: JPG, PNG, GIF, WebP</small>
            </div>
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
