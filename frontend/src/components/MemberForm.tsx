import React, { useState, useEffect } from 'react';
import {
  Member,
  MemberSavePayload,
  PermissionRole,
  BisJobCategory,
  bisJobCategoryFromAbbrev,
  memberRoleFromBisJobCategory,
} from '../types/member';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { RoleTag } from './Tag';
import { memberService } from '../services/api/memberService';
import { GearSlotTooltip } from './GearSlotTooltip';
import './MemberForm.css';
import { GiChest } from 'react-icons/gi';
import { BisJobAbbrevPicker } from './BisJobAbbrevPicker';

interface MemberFormProps {
  member?: Member;
  onSave: (member: MemberSavePayload) => void;
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
  const [permissionRole, setPermissionRole] = useState<PermissionRole>(member?.permissionRole ?? PermissionRole.User);
  const [xivGearLink, setXivGearLink] = useState(member?.xivGearLink || '');
  const [offSpecXivGearLink, setOffSpecXivGearLink] = useState(member?.offSpecXivGearLink || '');
  const [offSpecFullCofferSet, setOffSpecFullCofferSet] = useState(member?.offSpecFullCofferSet ?? false);
  const [mainSpecBisJobAbbrev, setMainSpecBisJobAbbrev] = useState(member?.mainSpecBisJobAbbrev ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(member?.profileImageUrl || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPermissionRole(member.permissionRole ?? PermissionRole.User);
      setXivGearLink(member.xivGearLink || '');
      setOffSpecXivGearLink(member.offSpecXivGearLink || '');
      setOffSpecFullCofferSet(member.offSpecFullCofferSet ?? false);
      setMainSpecBisJobAbbrev(member.mainSpecBisJobAbbrev ?? '');
      setImagePreview(member.profileImageUrl || null);
    } else {
      setName('');
      setPermissionRole(PermissionRole.User);
      setXivGearLink('');
      setOffSpecXivGearLink('');
      setOffSpecFullCofferSet(false);
      setMainSpecBisJobAbbrev('');
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

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      if (onValidationError) {
        onValidationError('Image file size must be less than 10MB');
      }
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      if (onValidationError) {
        onValidationError('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.');
      }
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    
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
    
    if (!trimmedName) {
      const errorMessage = 'Name is required';
      if (onValidationError) {
        onValidationError(errorMessage);
      } else {
        console.error(errorMessage);
      }
      return;
    }
    
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

    if (xivGearLink && !validateXivGearLink(xivGearLink)) {
      if (onValidationError) {
        onValidationError('Invalid URL. It has to be a XivGear Short Link. If the link contains multiple sets, you have to click export selected set and generate a link for it.');
      }
      return;
    }

    if (!offSpecFullCofferSet && offSpecXivGearLink && !validateXivGearLink(offSpecXivGearLink)) {
      if (onValidationError) {
        onValidationError('Invalid URL. It has to be a XivGear Short Link. If the link contains multiple sets, you have to click export selected set and generate a link for it.');
      }
      return;
    }

    const canEditRole = user && user.permissionRole === PermissionRole.Administrator;

    const mainAbbr = mainSpecBisJobAbbrev.trim().toUpperCase();
    const mainSpecBisJobCategory = mainAbbr
      ? bisJobCategoryFromAbbrev(mainAbbr)
      : BisJobCategory.Unknown;
    const role = memberRoleFromBisJobCategory(mainSpecBisJobCategory);

    const memberData: MemberSavePayload = member
      ? { 
          ...member, 
          name: trimmedName, 
          role,
          permissionRole: canEditRole ? permissionRole : member.permissionRole,
          xivGearLink: xivGearLink.trim() || undefined,
          mainSpecBisJobCategory,
          mainSpecBisJobAbbrev: mainAbbr || undefined,
          offSpecFullCofferSet,
          offSpecXivGearLink: offSpecFullCofferSet ? undefined : offSpecXivGearLink.trim() || undefined,
        }
      : { 
          name: trimmedName, 
          role,
          permissionRole: canEditRole ? permissionRole : PermissionRole.User,
          xivGearLink: xivGearLink.trim() || undefined, 
          bisItems: [],
          offSpecBisItems: [],
          mainSpecBisJobCategory,
          mainSpecBisJobAbbrev: mainAbbr || undefined,
          offSpecFullCofferSet,
          offSpecXivGearLink: offSpecFullCofferSet ? undefined : offSpecXivGearLink.trim() || undefined,
        };

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

    if (selectedFile && !member) {
      (memberData as Omit<Member, 'id'> & { pendingProfileImage?: File }).pendingProfileImage = selectedFile;
    }

    onSave(memberData);
  };

  if (!isOpen) return null;

  const derivedRaidRole = memberRoleFromBisJobCategory(bisJobCategoryFromAbbrev(mainSpecBisJobAbbrev));

  return (
    <div className="member-form-overlay">
      <div className="member-form-container">
        <form onSubmit={handleSubmit} className="member-form">
          <h3>{member ? 'Edit Member' : 'Add New Member'}</h3>
          
          <div className="form-group profile-name-group">
            <div className="profile-image-section">
              <label>Profile Image</label>
              <div className="profile-image-upload">
                {imagePreview && (
                  <div className="profile-image-preview">
                    <img 
                      src={imagePreview.startsWith('data:') ? imagePreview : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${imagePreview}`}
                      alt="Profile preview"
                      className="profile-image-circle"
                    />
                    <div className="profile-image-actions">
                      <input
                        type="file"
                        id="profileImage"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="file-input"
                      />
                      <label htmlFor="profileImage" className="file-input-label">
                        Change
                      </label>
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
                  </div>
                )}
                {!imagePreview && (
                  <>
                    <input
                      type="file"
                      id="profileImage"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="file-input"
                    />
                    <label htmlFor="profileImage" className="file-input-label">
                      Upload Image
                    </label>
                  </>
                )}
                <small>Max 10MB. Supported formats: JPG, PNG, GIF, WebP</small>
              </div>
            </div>
            <div className="name-section">
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
              <div className="form-group member-form-job-row">
                <label htmlFor="mainSpecBisJobAbbrev">Current job *</label>
                <div className="member-form-job-row-inner">
                  <div className="member-form-job-picker-wrap">
                    <BisJobAbbrevPicker
                      id="mainSpecBisJobAbbrev"
                      value={mainSpecBisJobAbbrev}
                      onChange={setMainSpecBisJobAbbrev}
                    />
                  </div>
                  <div className="member-form-derived-role" aria-live="polite">
                    <span className="member-form-derived-role-label">Raid role</span>
                    <RoleTag role={derivedRaidRole} />
                  </div>
                </div>
              </div>
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
            <div className="offspec-link-row">
              <input
                type="url"
                id="offSpecXivGearLink"
                value={offSpecXivGearLink}
                onChange={(e) => setOffSpecXivGearLink(e.target.value)}
                placeholder="https://xivgear.app/?page=sl|..."
                disabled={offSpecFullCofferSet}
                className="offspec-link-input"
              />
              <GearSlotTooltip tooltip="Full set of coffers" place="bottom">
                <button
                  type="button"
                  className={`offspec-coffer-toggle${offSpecFullCofferSet ? ' active' : ''}`}
                  onClick={() => {
                    if (!offSpecFullCofferSet) {
                      setOffSpecFullCofferSet(true);
                      setOffSpecXivGearLink('');
                    } else {
                      setOffSpecFullCofferSet(false);
                    }
                  }}
                  aria-label="Full set of coffers"
                  aria-pressed={offSpecFullCofferSet}
                >
                  <GiChest size={22} aria-hidden />
                </button>
              </GearSlotTooltip>
            </div>
            <small>
              {offSpecFullCofferSet
                ? 'Tracking off-spec as a full set of raid coffers plus one tomestone ring.'
                : 'Paste the xivgear link for this member\'s off spec best-in-slot list'}
            </small>
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
