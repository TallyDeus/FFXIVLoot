import React, { useState } from 'react';
import { Member, GearSlot, GearSlotNames, ItemType, MemberRole, PermissionRole } from '../types/member';
import { bisService } from '../services/api/bisService';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { getBisItems } from '../utils/specHelpers';
import { RoleTag, ItemTypeTag, UpgradeMaterialTag } from './Tag';
import './BiSMatrix.css';

interface BiSMatrixProps {
  members: Member[];
  onUpdate: () => void;
  specType?: 'main' | 'off';
}

/**
 * Matrix view showing all members' BiS progress at once
 * Members as columns, gear slots as rows
 */
export const BiSMatrix: React.FC<BiSMatrixProps> = ({ members, onUpdate, specType = 'main' }) => {
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { toasts, showToast, removeToast } = useToast();
  const { currentUser, hasPermission, isSelf } = useAuth();

  // Helper to check if user can edit BiS for a member
  const canEditBiS = (member: Member): boolean => {
    if (!currentUser) return false;
    if (hasPermission(PermissionRole.Manager)) return true;
    return isSelf(member.id);
  };

  // Sort and group members by role for main spec, alphabetically for off spec
  const sortedMembers = React.useMemo(() => {
    if (specType === 'off') {
      // Off spec: just sort alphabetically, no role grouping
      return [...members].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Main spec: group by role, then alphabetically within each role
    const dpsMembers = members
      .filter(m => m.role === MemberRole.DPS)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const supportMembers = members
      .filter(m => m.role === MemberRole.Support)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return [...dpsMembers, ...supportMembers];
  }, [members, specType]);

  // Find where Support members start (for visual separator) - only for main spec
  const supportStartIndex = React.useMemo(() => {
    if (specType === 'off') return -1; // No separator for off spec
    return sortedMembers.findIndex(m => m.role === MemberRole.Support);
  }, [sortedMembers, specType]);


  // Get all unique gear slots from all members' BiS lists (main or off spec), sorted
  const allSlots = Array.from(
    new Set(
      members
        .flatMap(m => {
          const itemsList = getBisItems(m, specType);
          return itemsList && itemsList.length > 0 ? itemsList.map(item => item.slot) : [];
        })
        .sort((a, b) => a - b)
    )
  );

  /**
   * Helper to manage updating state for async operations
   */
  const withUpdatingState = async <T,>(
    key: string,
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | void> => {
    if (updating.has(key)) return;
    
    try {
      setUpdating(prev => new Set(prev).add(key));
      await operation();
      onUpdate();
    } catch (error) {
      showToast(errorMessage, 'error');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleItemToggle = async (memberId: string, slot: GearSlot, isAcquired: boolean) => {
    const key = `${memberId}-${slot}`;
    await withUpdatingState(
      key,
      () => bisService.updateItemAcquisition(memberId, slot, isAcquired, specType),
      'Failed to update item acquisition. Please try again.'
    );
  };

  const handleUpgradeToggle = async (memberId: string, slot: GearSlot, upgradeMaterialAcquired: boolean) => {
    const key = `${memberId}-${slot}-upgrade`;
    await withUpdatingState(
      key,
      () => bisService.updateUpgradeMaterialAcquisition(memberId, slot, upgradeMaterialAcquired, specType),
      'Failed to update upgrade material. Please try again.'
    );
  };

  const getItemForSlot = (member: Member, slot: GearSlot) => {
    const itemsList = getBisItems(member, specType);
    return itemsList && itemsList.length > 0 ? itemsList.find(item => item.slot === slot) : undefined;
  };

  if (allSlots.length === 0) {
    return (
      <div className="bis-matrix-empty">
        <p>No BiS items loaded. Import BiS lists for members from the Member Management page.</p>
      </div>
    );
  }

  return (
    <div className="bis-matrix-container">
      <div className="bis-matrix-table-wrapper">
        <table className="bis-matrix-table">
          <thead>
            <tr>
              <th className="sticky-row slot-header">Gear Slot</th>
              {sortedMembers.map((member, index) => (
                <th 
                  key={member.id}
                  className={`member-header ${index === supportStartIndex && supportStartIndex > 0 && specType === 'main' ? 'role-separator-start' : ''}`}
                >
                  <div className="member-header-content">
                    <span className="member-name">{member.name}</span>
                    {specType === 'main' && (
                      <RoleTag role={member.role} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSlots.map(slot => (
              <tr key={slot}>
                <td className="sticky-row slot-name-cell">
                  <span className="slot-name-text">{GearSlotNames[slot]}</span>
                </td>
                {sortedMembers.map((member, index) => {
                  const item = getItemForSlot(member, slot);
                  const isRoleSeparator = index === supportStartIndex && supportStartIndex > 0 && specType === 'main';
                  
                  if (!item) {
                    return (
                      <td 
                        key={member.id}
                        className={`slot-cell empty ${isRoleSeparator ? 'role-separator-start' : ''}`}
                      >
                        <span className="empty-slot">-</span>
                      </td>
                    );
                  }
                  
                  return (
                    <td 
                      key={member.id}
                      className={`slot-cell ${item.isAcquired ? 'acquired' : ''} ${isRoleSeparator ? 'role-separator-start' : ''}`}
                    >
                      <div className="slot-content">
                        <ItemTypeTag
                          itemType={item.itemType}
                          onClick={() => canEditBiS(member) && !updating.has(`${member.id}-${slot}`) && handleItemToggle(member.id, slot, !item.isAcquired)}
                          disabled={!canEditBiS(member) || updating.has(`${member.id}-${slot}`)}
                          tooltip={`${member.name} - ${GearSlotNames[slot]}`}
                          acquired={item.isAcquired}
                          children={item.itemType === ItemType.AugTome ? 'T' : 'R'}
                        />
                        {item.itemType === ItemType.AugTome && (
                          <UpgradeMaterialTag
                            onClick={() => canEditBiS(member) && !updating.has(`${member.id}-${slot}-upgrade`) && handleUpgradeToggle(member.id, slot, !item.upgradeMaterialAcquired)}
                            disabled={!canEditBiS(member) || updating.has(`${member.id}-${slot}-upgrade`)}
                            tooltip={`${member.name} - ${GearSlotNames[slot]} (Upgrade)`}
                            acquired={item.upgradeMaterialAcquired}
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};
