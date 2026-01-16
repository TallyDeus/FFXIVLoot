import React, { useState, useEffect } from 'react';
import { Member, GearSlot, GearSlotNames, SpecType } from '../types/member';
import { lootHistoryService } from '../services/api/lootHistoryService';
import { WeekAssignmentHistory } from '../types/member';
import './ExtraLootMatrix.css';

interface ExtraLootMatrixProps {
  members: Member[];
}

/**
 * Matrix view showing extra loot acquisition counts per gear slot for all members
 */
export const ExtraLootMatrix: React.FC<ExtraLootMatrixProps> = ({ members }) => {
  const [history, setHistory] = useState<WeekAssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const historyData = await lootHistoryService.getAllHistory();
        setHistory(historyData);
      } catch (error) {
        console.error('Failed to load loot history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  // Calculate extra loot counts per member per slot
  const extraLootCounts = React.useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    
    // Initialize all members with empty counts
    members.forEach(member => {
      counts[member.id] = {};
    });

    // Count all extra loot assignments per slot
    history.forEach(week => {
      week.assignments.forEach(assignment => {
        if (assignment.specType === SpecType.Extra && assignment.memberId) {
          let slotKey: string;
          
          if (assignment.isUpgradeMaterial) {
            // Upgrade materials
            if (assignment.isArmorMaterial) {
              slotKey = 'armor-upgrade';
            } else {
              slotKey = 'accessory-upgrade';
            }
          } else if (assignment.slot !== null) {
            // Regular gear slots
            // Handle rings - combine LeftRing and RightRing
            if (assignment.slot === GearSlot.LeftRing || assignment.slot === GearSlot.RightRing) {
              slotKey = 'ring';
            } else {
              slotKey = assignment.slot.toString();
            }
          } else {
            return; // Skip if no slot and not upgrade material
          }

          const memberCounts = counts[assignment.memberId] || {};
          memberCounts[slotKey] = (memberCounts[slotKey] || 0) + 1;
          counts[assignment.memberId] = memberCounts;
        }
      });
    });

    return counts;
  }, [history, members]);

  // Get all unique slots from the data
  const allSlots = React.useMemo(() => {
    const slotSet = new Set<string>();
    
    // Add all gear slots
    Object.values(GearSlot)
      .filter(v => typeof v === 'number')
      .forEach(slot => {
        if (slot === GearSlot.LeftRing || slot === GearSlot.RightRing) {
          slotSet.add('ring');
        } else {
          slotSet.add(slot.toString());
        }
      });
    
    // Add upgrade materials
    slotSet.add('accessory-upgrade');
    slotSet.add('armor-upgrade');
    
    // Sort slots in a logical order
    const slotOrder = [
      GearSlot.Weapon.toString(),
      GearSlot.Head.toString(),
      GearSlot.Body.toString(),
      GearSlot.Hand.toString(),
      GearSlot.Legs.toString(),
      GearSlot.Feet.toString(),
      GearSlot.Ears.toString(),
      GearSlot.Neck.toString(),
      GearSlot.Wrist.toString(),
      'ring',
      'accessory-upgrade',
      'armor-upgrade',
    ];
    
    return slotOrder.filter(slot => slotSet.has(slot));
  }, []);

  // Sort members alphabetically
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  // Calculate totals per member
  const memberTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    sortedMembers.forEach(member => {
      const memberCounts = extraLootCounts[member.id] || {};
      totals[member.id] = Object.values(memberCounts).reduce((sum, count) => sum + count, 0);
    });
    return totals;
  }, [extraLootCounts, sortedMembers]);

  // Get slot display name
  const getSlotName = (slotKey: string): string => {
    if (slotKey === 'ring') return 'Ring';
    if (slotKey === 'accessory-upgrade') return 'Accessory Upgrade';
    if (slotKey === 'armor-upgrade') return 'Armor Upgrade';
    const slotNum = parseInt(slotKey);
    if (!isNaN(slotNum) && slotNum in GearSlotNames) {
      const name = GearSlotNames[slotNum as GearSlot];
      // Special case: Ears should display as "Earring"
      if (slotNum === GearSlot.Ears) return 'Earring';
      return name;
    }
    return slotKey;
  };

  if (loading) {
    return <div className="extra-loot-loading">Loading extra loot data...</div>;
  }

  return (
    <div className="extra-loot-matrix-container">
      <div className="extra-loot-table-wrapper">
        <table className="extra-loot-matrix-table">
          <thead>
            <tr>
              <th className="sticky-row slot-header">Gear Slot</th>
              {sortedMembers.map(member => (
                <th key={member.id} className="member-header">
                  <span className="member-name">{member.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSlots.map(slotKey => (
              <tr key={slotKey}>
                <td className="sticky-row slot-name-cell">
                  <span className="slot-name-text">{getSlotName(slotKey)}</span>
                </td>
                {sortedMembers.map(member => {
                  const count = extraLootCounts[member.id]?.[slotKey] || 0;
                  return (
                    <td key={member.id} className="slot-cell">
                      <div className={`count-display ${count > 0 ? 'has-count' : ''}`}>
                        {count > 0 ? count : '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="total-row">
              <td className="sticky-row slot-name-cell total-label">
                <span className="slot-name-text">Total</span>
              </td>
              {sortedMembers.map(member => {
                const total = memberTotals[member.id] || 0;
                return (
                  <td key={member.id} className="slot-cell total-cell">
                    <div className="count-display has-count">{total}</div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

