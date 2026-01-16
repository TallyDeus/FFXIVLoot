import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AvailableLoot, Member, FloorNumber, GearSlot, SpecType, PermissionRole } from '../types/member';
import { lootService } from '../services/api/lootService';
import { memberService } from '../services/api/memberService';
import { LootItemCard } from './LootItemCard';
import { ConfirmDialog } from './ConfirmDialog';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import './LootDistributionPanel.css';

interface LootDistributionPanelProps {
  floorNumber: FloorNumber;
  currentWeekNumber: number | null;
  onLootAssigned: () => void | Promise<void>;
  availableLoot?: AvailableLoot[];
  members?: Member[];
}

/**
 * Component for displaying available loot and managing assignments
 */
export const LootDistributionPanel: React.FC<LootDistributionPanelProps> = ({
  floorNumber,
  currentWeekNumber,
  onLootAssigned,
  availableLoot: providedLoot,
  members: providedMembers,
}) => {
  const [availableLoot, setAvailableLoot] = useState<AvailableLoot[]>(providedLoot ?? []);
  const [members, setMembers] = useState<Member[]>(providedMembers ?? []);
  const [loading, setLoading] = useState(providedLoot === undefined || providedMembers === undefined);
  const [assigning, setAssigning] = useState<Set<string>>(new Set());
  const hasLoadedRef = useRef<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const { hasPermission } = useAuth();
  const canAssignLoot = hasPermission(PermissionRole.Manager);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [lootData, membersData] = await Promise.all([
        lootService.getAvailableLoot(floorNumber, currentWeekNumber ?? undefined),
        memberService.getAllMembers(),
      ]);
      setAvailableLoot(lootData);
      setMembers(membersData);
      setLoading(false);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load loot data. Please try again.';
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  }, [floorNumber, currentWeekNumber, showToast]);

  // Update state when props change (from cache)
  useEffect(() => {
    if (providedLoot !== undefined) {
      setAvailableLoot(providedLoot);
      setLoading(false);
      hasLoadedRef.current = `${floorNumber}-${currentWeekNumber}`;
    }
    if (providedMembers !== undefined && providedMembers.length > 0) {
      setMembers(providedMembers);
    }
  }, [providedLoot, providedMembers, floorNumber, currentWeekNumber]);

  // Load data only when floor/week changes AND cache doesn't have data
  useEffect(() => {
    const cacheKey = `${floorNumber}-${currentWeekNumber}`;
    const hasLootData = providedLoot !== undefined && Array.isArray(providedLoot);
    const hasMembersData = providedMembers !== undefined && Array.isArray(providedMembers) && providedMembers.length > 0;
    
    // If we have cached data, use it and mark as loaded
    if (hasLootData && hasMembersData) {
      setLoading(false);
      hasLoadedRef.current = cacheKey;
      return;
    }
    
    // Skip if we've already loaded for this floor/week combination
    if (hasLoadedRef.current === cacheKey) {
      return;
    }
    
    // Only load if we don't have cached data and haven't loaded yet
    loadData().then(() => {
      hasLoadedRef.current = cacheKey;
    }).catch(() => {
      hasLoadedRef.current = ''; // Reset on error so it can retry
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorNumber, currentWeekNumber, providedLoot, providedMembers]);

  const handleAssignLoot = async (memberId: string, slot: GearSlot | null, specType?: SpecType) => {
    if (slot === null) return;
    
    const assignmentKey = `loot-${slot}-${memberId}`;
    if (assigning.has(assignmentKey)) return;

    const memberName = members.find(m => m.id === memberId)?.name;
    const specText = specType === SpecType.OffSpec ? ' (Off Spec)' : '';
    const slotName = slot !== null ? slot.toString() : 'item';
    
    setConfirmDialog({
      isOpen: true,
      title: 'Assign Loot',
      message: `Assign this item to ${memberName}${specText}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setAssigning(prev => new Set(prev).add(assignmentKey));
          await lootService.assignLoot({ 
            memberId, 
            slot, 
            floorNumber,
            specType: specType ?? SpecType.MainSpec
          });
          
          // Refresh data
          await onLootAssigned();
          // Also reload local data as fallback
          await loadData();
          
          showToast('Loot assigned successfully!');
        } catch (error: any) {
          showToast(error.message || 'Failed to assign loot. Please try again.', 'error');
        } finally {
          setAssigning(prev => {
            const next = new Set(prev);
            next.delete(assignmentKey);
            return next;
          });
        }
      },
    });
  };

  const handleAssignUpgrade = async (memberId: string, isArmorMaterial: boolean, specType?: SpecType) => {
    const assignmentKey = `upgrade-${memberId}-${isArmorMaterial}`;
    if (assigning.has(assignmentKey)) return;

    const memberName = members.find(m => m.id === memberId)?.name;
    const materialType = isArmorMaterial ? 'Armor' : 'Accessory';
    const specText = specType === SpecType.OffSpec ? ' (Off Spec)' : '';
    
    setConfirmDialog({
      isOpen: true,
      title: 'Assign Upgrade Material',
      message: `Assign ${materialType} Upgrade Material to ${memberName}${specText}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setAssigning(prev => new Set(prev).add(assignmentKey));
          await lootService.assignUpgradeMaterial({ 
            memberId, 
            isArmorMaterial, 
            floorNumber,
            specType: specType ?? SpecType.MainSpec
          });
          
          // Refresh data
          await onLootAssigned();
          // Also reload local data as fallback
          await loadData();
          
          showToast('Upgrade material assigned successfully!');
        } catch (error: any) {
          showToast(error.message || 'Failed to assign upgrade material. Please try again.', 'error');
        } finally {
          setAssigning(prev => {
            const next = new Set(prev);
            next.delete(assignmentKey);
            return next;
          });
        }
      },
    });
  };

  const handleUndo = async (assignmentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Undo Assignment',
      message: 'Are you sure you want to undo this assignment? This will revert any BiS tracker changes.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await lootService.undoAssignment(assignmentId);
          
          // Refresh data
          await onLootAssigned();
          // Also reload local data as fallback
          await loadData();
          
          showToast('Assignment undone successfully!');
        } catch (error: any) {
          showToast(error.message || 'Failed to undo assignment. Please try again.', 'error');
        }
      },
    });
  };

  if (loading) {
    return <div className="loading">Loading available loot...</div>;
  }

  if (availableLoot.length === 0) {
    return (
      <div className="no-loot">
        <p>No loot available for this floor, or all members have acquired their needed items.</p>
      </div>
    );
  }

  return (
    <>
      <div className="loot-distribution-panel">
        <h2>Available Loot - Floor {floorNumber}</h2>
        <div className="loot-items-grid">
          {availableLoot.map((loot) => (
            <LootItemCard
              key={loot.isUpgradeMaterial ? `upgrade-${loot.isArmorMaterial}` : loot.slot}
              loot={loot}
              members={members}
              floorNumber={floorNumber}
              currentWeekNumber={currentWeekNumber}
              onAssign={handleAssignLoot}
              onAssignUpgrade={handleAssignUpgrade}
              onUndo={handleUndo}
              canAssignLoot={canAssignLoot}
            />
          ))}
        </div>
      </div>
      
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

