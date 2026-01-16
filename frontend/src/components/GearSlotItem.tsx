import React from 'react';
import { GearItem, GearSlotNames, ItemType } from '../types/member';
import { ItemTypeTag } from './Tag';
import './GearSlotItem.css';

interface GearSlotItemProps {
  item: GearItem;
  onAcquisitionChange: (slot: number, isAcquired: boolean) => void;
  onUpgradeMaterialChange: (slot: number, upgradeMaterialAcquired: boolean) => void;
}

/**
 * Component for displaying and managing a single gear slot item
 */
export const GearSlotItem: React.FC<GearSlotItemProps> = ({
  item,
  onAcquisitionChange,
  onUpgradeMaterialChange,
}) => {
  const handleItemToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAcquisitionChange(item.slot, e.target.checked);
  };

  const handleUpgradeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpgradeMaterialChange(item.slot, e.target.checked);
  };

  const isAugTome = item.itemType === ItemType.AugTome;

  return (
    <div className={`gear-slot-item ${item.isAcquired ? 'acquired' : ''}`}>
      <div className="gear-slot-header">
        <h4>{GearSlotNames[item.slot]}</h4>
        <ItemTypeTag 
          itemType={item.itemType} 
          variant="text"
          children={item.itemType === ItemType.Raid ? 'Raid' : 'Aug Tome'}
        />
      </div>
      
      <div className="gear-item-name">{item.itemName}</div>
      
      <div className="gear-item-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={item.isAcquired}
            onChange={handleItemToggle}
          />
          <span>Acquired</span>
        </label>

        {isAugTome && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={item.upgradeMaterialAcquired}
              onChange={handleUpgradeToggle}
              disabled={!item.isAcquired}
            />
            <span>Upgrade Material</span>
          </label>
        )}
      </div>
    </div>
  );
};

