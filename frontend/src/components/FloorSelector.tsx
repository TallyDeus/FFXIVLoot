import React from 'react';
import { FloorNumber } from '../types/member';
import './FloorSelector.css';

interface FloorSelectorProps {
  selectedFloor: FloorNumber | null;
  onFloorSelect: (floor: FloorNumber) => void;
}

/**
 * Component for selecting a raid floor
 */
export const FloorSelector: React.FC<FloorSelectorProps> = ({ selectedFloor, onFloorSelect }) => {
  const floors: { number: FloorNumber; label: string; description: string }[] = [
    { number: FloorNumber.Floor1, label: 'Floor 1', description: 'Earring, Neck, Wrist, Rings' },
    { number: FloorNumber.Floor2, label: 'Floor 2', description: 'Head, Hand, Feet + Accessory Upgrade' },
    { number: FloorNumber.Floor3, label: 'Floor 3', description: 'Body, Legs + Armor Upgrade' },
    { number: FloorNumber.Floor4, label: 'Floor 4', description: 'Weapon' },
  ];

  return (
    <div className="floor-selector">
      <h2>Select Floor</h2>
      <div className="floor-buttons">
        {floors.map(floor => (
          <button
            key={floor.number}
            onClick={() => onFloorSelect(floor.number)}
            className={`floor-button ${selectedFloor === floor.number ? 'active' : ''}`}
          >
            <div className="floor-number">{floor.label}</div>
            <div className="floor-description">{floor.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

