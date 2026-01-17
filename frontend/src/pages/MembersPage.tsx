import React, { useState, useEffect, useCallback } from 'react';
import { Member, SpecType, PermissionRole } from '../types/member';
import { memberService } from '../services/api/memberService';
import { bisService } from '../services/api/bisService';
import { MemberList } from '../components/MemberList';
import { MemberForm } from '../components/MemberForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import './MembersPage.css';

/**
 * Page for managing raid members
 */
export const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingBiS, setImportingBiS] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Member | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const { hasPermission } = useAuth();

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      showToast('Failed to load members. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  /**
   * Imports BiS lists for a member if links are provided
   */
  const importBiSLists = async (
    memberId: string,
    mainSpecLink: string | undefined,
    offSpecLink: string | undefined,
    isUpdate: boolean
  ) => {
    const needsMainSpecImport = !!mainSpecLink;
    const needsOffSpecImport = !!offSpecLink;

    if (!needsMainSpecImport && !needsOffSpecImport) {
      return;
    }

    setImportingBiS(memberId);

    // Import BiS lists sequentially to avoid race conditions
    // Main spec first, then off spec
    if (needsMainSpecImport) {
      try {
        await bisService.importBiS({
          memberId,
          xivGearLink: mainSpecLink!,
          specType: SpecType.MainSpec,
        });
      } catch (bisError) {
        const action = isUpdate ? 'saved' : 'created';
        showToast(`Member ${action}, but failed to import main spec BiS list.`, 'error');
      }
    }

    if (needsOffSpecImport) {
      try {
        await bisService.importBiS({
          memberId,
          xivGearLink: offSpecLink!,
          specType: SpecType.OffSpec,
        });
      } catch (bisError) {
        const action = isUpdate ? 'saved' : 'created';
        showToast(`Member ${action}, but failed to import off spec BiS list.`, 'error');
      }
    }

    setImportingBiS(null);
  };

  const handleSave = async (memberData: Omit<Member, 'id'> | Member) => {
    try {
      let savedMember: Member;
      const xivGearLink = memberData.xivGearLink?.trim();
      const previousLink = editingMember?.xivGearLink?.trim();
      const offSpecXivGearLink = memberData.offSpecXivGearLink?.trim();
      const previousOffSpecLink = editingMember?.offSpecXivGearLink?.trim();

      if ('id' in memberData) {
        // Update existing member - ensure we preserve existing BiS items
        const updateData: Member = {
          ...memberData,
          bisItems: editingMember?.bisItems || memberData.bisItems || [],
          offSpecBisItems: editingMember?.offSpecBisItems || memberData.offSpecBisItems || [],
        };
        savedMember = await memberService.updateMember(updateData);
        
        // Import BiS lists if links changed
        const mainSpecLink = xivGearLink && xivGearLink !== previousLink ? xivGearLink : undefined;
        const offSpecLink = offSpecXivGearLink && offSpecXivGearLink !== previousOffSpecLink ? offSpecXivGearLink : undefined;
        await importBiSLists(savedMember.id, mainSpecLink, offSpecLink, true);
      } else {
        // Create new member
        savedMember = await memberService.createMember(memberData);
        
        // Upload profile image if one was selected for new member
        const pendingImageFile = (memberData as any).__pendingImageFile;
        if (pendingImageFile) {
          try {
            const result = await memberService.uploadProfileImage(savedMember.id, pendingImageFile);
            savedMember.profileImageUrl = result.imageUrl;
            await memberService.updateMember(savedMember);
          } catch (error) {
            // Image upload failed, but member was created - log error but don't fail
            console.error('Failed to upload profile image for new member:', error);
          }
        }
        
        // Import BiS lists if links are provided
        await importBiSLists(savedMember.id, xivGearLink, offSpecXivGearLink, false);
      }
      
      await loadMembers();
      setShowForm(false);
      setEditingMember(undefined);
      showToast(editingMember ? 'Member updated successfully!' : 'Member created successfully!');
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = 'Failed to save member. Please try again.';
      
      if (error?.message) {
        const errorMsg = error.message.toLowerCase();
        // Check for specific error types
        if (errorMsg.includes('duplicate') || errorMsg.includes('already exists') || errorMsg.includes('name')) {
          errorMessage = 'A member with this name already exists';
        } else if (errorMsg.includes('required') || errorMsg.includes('name')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Member',
      message: 'Are you sure you want to delete this member?',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await memberService.deleteMember(id);
          await loadMembers();
          showToast('Member deleted successfully!');
        } catch (error) {
          showToast('Failed to delete member. Please try again.', 'error');
        }
      },
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMember(undefined);
  };

  if (loading) {
    return <div className="loading">Loading members...</div>;
  }

  return (
    <div className="members-page">
      <div className="page-header">
        <h1>Member Management</h1>
        {!showForm && (hasPermission(PermissionRole.Manager) && (
          <Button 
            variant="contained"
            color="primary"
            onClick={() => setShowForm(true)}
          >
            Add Member
          </Button>
        ))}
      </div>

      <MemberForm
        member={editingMember}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={showForm}
        onValidationError={(message) => showToast(message, 'error')}
        existingMembers={members}
      />

      {importingBiS && (
        <div className="importing-bis-overlay">
          <div className="importing-bis-message">
            <div className="spinner"></div>
            <span>Importing BiS list...</span>
          </div>
        </div>
      )}

      <MemberList
        members={members}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmText="Delete"
          confirmButtonColor="error"
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

