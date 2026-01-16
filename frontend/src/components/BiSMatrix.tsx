import React, { useState } from 'react';
import { Member, GearSlot, GearSlotNames, ItemType, PermissionRole } from '../types/member';
import { bisService } from '../services/api/bisService';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { getBisItems } from '../utils/specHelpers';
import { ItemTypeTag, UpgradeMaterialTag } from './Tag';
import { ProfileImageTooltip } from './ProfileImageTooltip';
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

  // Sort members alphabetically
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

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
                  className="member-header"
                >
                  <div className="member-header-content">
                    {(() => {
                      const imageUrl = member.profileImageUrl 
                        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${member.profileImageUrl}`
                        : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                      return (
                        <ProfileImageTooltip imageUrl={imageUrl} alt={member.name} place="bottom">
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
                      );
                    })()}
                    <span className="member-name">{member.name}</span>
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
                  
                  if (!item) {
                    return (
                      <td 
                        key={member.id}
                        className="slot-cell empty"
                      >
                        <span className="empty-slot">-</span>
                      </td>
                    );
                  }
                  
                  return (
                    <td 
                      key={member.id}
                      className={`slot-cell ${item.isAcquired ? 'acquired' : ''}`}
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
