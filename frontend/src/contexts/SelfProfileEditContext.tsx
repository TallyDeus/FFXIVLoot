import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Member, MemberSavePayload, SpecType } from '../types/member';
import { memberService } from '../services/api/memberService';
import { bisService } from '../services/api/bisService';
import { MemberForm } from '../components/MemberForm';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from './AuthContext';
import '../components/ImportingBiSOverlay.css';

interface SelfProfileEditContextValue {
  openSelfProfileEdit: () => Promise<void>;
}

const SelfProfileEditContext = createContext<SelfProfileEditContextValue | undefined>(undefined);

export function useSelfProfileEdit(): SelfProfileEditContextValue {
  const ctx = useContext(SelfProfileEditContext);
  if (!ctx) {
    throw new Error('useSelfProfileEdit must be used within SelfProfileEditProvider');
  }
  return ctx;
}

export const SelfProfileEditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, refreshSession } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [importingBiS, setImportingBiS] = useState<string | null>(null);

  const importBiSLists = async (
    memberId: string,
    mainSpecLink: string | undefined,
    offSpecLink: string | undefined,
    isUpdate: boolean
  ) => {
    const needsMain = !!mainSpecLink;
    const needsOff = !!offSpecLink;
    if (!needsMain && !needsOff) return;

    setImportingBiS(memberId);
    if (needsMain) {
      try {
        await bisService.importBiS({
          memberId,
          xivGearLink: mainSpecLink!,
          specType: SpecType.MainSpec,
        });
      } catch {
        const action = isUpdate ? 'saved' : 'created';
        showToast(`Member ${action}, but failed to import main spec BiS list.`, 'error');
      }
    }
    if (needsOff) {
      try {
        await bisService.importBiS({
          memberId,
          xivGearLink: offSpecLink!,
          specType: SpecType.OffSpec,
        });
      } catch {
        const action = isUpdate ? 'saved' : 'created';
        showToast(`Member ${action}, but failed to import off spec BiS list.`, 'error');
      }
    }
    setImportingBiS(null);
  };

  const openSelfProfileEdit = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [me, all] = await Promise.all([
        memberService.getMemberById(user.id),
        memberService.getAllMembers(),
      ]);
      setEditingMember(me);
      setExistingMembers(all);
      setFormOpen(true);
    } catch {
      showToast('Failed to load your profile.', 'error');
    }
  }, [user?.id, showToast]);

  const handleClose = () => {
    setFormOpen(false);
    setEditingMember(undefined);
    setExistingMembers([]);
  };

  const handleSave = async (memberData: MemberSavePayload) => {
    if (!editingMember?.id || !('id' in memberData)) {
      showToast('Invalid save state.', 'error');
      return;
    }
    try {
      const xivGearLink = memberData.xivGearLink?.trim();
      const previousLink = editingMember.xivGearLink?.trim();
      const offSpecXivGearLink = memberData.offSpecXivGearLink?.trim();
      const previousOffSpecLink = editingMember.offSpecXivGearLink?.trim();

      const updateData: Member = {
        ...memberData,
        bisItems: editingMember.bisItems || memberData.bisItems || [],
        offSpecBisItems: editingMember.offSpecBisItems || memberData.offSpecBisItems || [],
      };
      const savedMember = await memberService.updateMember(updateData);

      const mainSpecLink = xivGearLink && xivGearLink !== previousLink ? xivGearLink : undefined;
      const offSpecLink =
        memberData.offSpecFullCofferSet
          ? undefined
          : offSpecXivGearLink && offSpecXivGearLink !== previousOffSpecLink
            ? offSpecXivGearLink
            : undefined;
      await importBiSLists(savedMember.id, mainSpecLink, offSpecLink, true);

      await refreshSession();
      handleClose();
      showToast('Member updated successfully!');
    } catch (error: unknown) {
      let errorMessage = 'Failed to save member. Please try again.';
      const msg = error instanceof Error ? error.message : '';
      if (msg) {
        const errorMsg = msg.toLowerCase();
        if (errorMsg.includes('duplicate') || errorMsg.includes('already exists') || errorMsg.includes('name')) {
          errorMessage = 'A member with this name already exists';
        } else {
          errorMessage = msg;
        }
      }
      showToast(errorMessage, 'error');
    }
  };

  return (
    <SelfProfileEditContext.Provider value={{ openSelfProfileEdit }}>
      {children}
      <MemberForm
        member={editingMember}
        onSave={handleSave}
        onCancel={handleClose}
        isOpen={formOpen}
        onValidationError={(message) => showToast(message, 'error')}
        existingMembers={existingMembers}
      />
      {importingBiS && (
        <div className="importing-bis-overlay">
          <div className="importing-bis-message">
            <div className="spinner" />
            <span>Importing BiS list...</span>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </SelfProfileEditContext.Provider>
  );
};
