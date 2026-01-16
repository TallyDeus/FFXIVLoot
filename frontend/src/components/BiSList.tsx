import React, { useState, useEffect } from 'react';
import { Member, GearItem, GearSlot } from '../types/member';
import { bisService } from '../services/api/bisService';
import { GearSlotItem } from './GearSlotItem';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import './BiSList.css';

interface BiSListProps {
  member: Member;
  onUpdate: () => void;
}

/**
 * Component for displaying and managing a member's best-in-slot list
 */
export const BiSList: React.FC<BiSListProps> = ({ member, onUpdate }) => {
  const [items, setItems] = useState<GearItem[]>(member.bisItems);
  const [updating, setUpdating] = useState<Set<number>>(new Set());
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    setItems(member.bisItems);
  }, [member]);

  const handleAcquisitionChange = async (slot: GearSlot, isAcquired: boolean) => {
    if (updating.has(slot)) return;

    try {
      setUpdating(prev => new Set(prev).add(slot));
      await bisService.updateItemAcquisition(member.id, slot, isAcquired);
      
      setItems(prev => prev.map(item => 
        item.slot === slot ? { ...item, isAcquired } : item
      ));
      
      onUpdate();
    } catch (error) {
      showToast('Failed to update item acquisition. Please try again.', 'error');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
    }
  };

  const handleUpgradeMaterialChange = async (slot: GearSlot, upgradeMaterialAcquired: boolean) => {
    if (updating.has(slot)) return;

    try {
      setUpdating(prev => new Set(prev).add(slot));
      await bisService.updateUpgradeMaterialAcquisition(member.id, slot, upgradeMaterialAcquired);
      
      setItems(prev => prev.map(item => 
        item.slot === slot ? { ...item, upgradeMaterialAcquired } : item
      ));
      
      onUpdate();
    } catch (error) {
      showToast('Failed to update upgrade material. Please try again.', 'error');
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="bis-list-empty">
        <p>No best-in-slot items loaded. Import a BiS list from xivgear to get started.</p>
      </div>
    );
  }

  // Sort items by slot order
  const sortedItems = [...items].sort((a, b) => a.slot - b.slot);

  return (
    <div className="bis-list">
      <div className="bis-list-header">
        <h3>{member.name}'s Best-in-Slot</h3>
        <div className="bis-stats">
          <span>
            Acquired: {items.filter(i => i.isAcquired).length} / {items.length}
          </span>
        </div>
      </div>
      
      <div className="bis-items-grid">
        {sortedItems.map((item) => (
          <GearSlotItem
            key={item.id}
            item={item}
            onAcquisitionChange={handleAcquisitionChange}
            onUpgradeMaterialChange={handleUpgradeMaterialChange}
          />
          ))}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

