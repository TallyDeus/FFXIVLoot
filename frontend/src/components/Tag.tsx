import React, { useId } from 'react';
import { Tooltip } from 'react-tooltip';
import { MemberRole, SpecType, ItemType, PermissionRole } from '../types/member';
import './Tag.css';

/**
 * Unified tag type definitions
 */
export enum TagType {
  // Roles
  RoleDPS = 'role-dps',
  RoleSupport = 'role-support',
  
  // Specs
  SpecMain = 'spec-main',
  SpecOff = 'spec-off',
  SpecExtra = 'spec-extra',
  
  // Item Types
  ItemRaid = 'item-raid',
  ItemAugTome = 'item-aug-tome',
  ItemUpgradeMaterial = 'item-upgrade-material',
  
  // Status
  StatusAssigned = 'status-assigned',
  StatusCurrent = 'status-current',
  
  // Permission Roles
  PermissionAdministrator = 'permission-administrator',
  PermissionManager = 'permission-manager',
  PermissionUser = 'permission-user',
}

/**
 * Tag configuration mapping
 */
interface TagConfig {
  label: string;
  className: string;
  variant?: 'badge' | 'button' | 'text';
}

const TAG_CONFIGS: Record<TagType, TagConfig> = {
  [TagType.RoleDPS]: {
    label: 'DPS',
    className: 'tag-role tag-role-dps',
    variant: 'badge',
  },
  [TagType.RoleSupport]: {
    label: 'Support',
    className: 'tag-role tag-role-support',
    variant: 'badge',
  },
  [TagType.SpecMain]: {
    label: 'Main Spec',
    className: 'tag-spec tag-spec-main',
    variant: 'badge',
  },
  [TagType.SpecOff]: {
    label: 'Off Spec',
    className: 'tag-spec tag-spec-off',
    variant: 'badge',
  },
  [TagType.SpecExtra]: {
    label: 'Extra',
    className: 'tag-spec tag-spec-extra',
    variant: 'badge',
  },
  [TagType.ItemRaid]: {
    label: 'R',
    className: 'tag-item tag-item-raid',
    variant: 'button',
  },
  [TagType.ItemAugTome]: {
    label: 'T',
    className: 'tag-item tag-item-aug-tome',
    variant: 'button',
  },
  [TagType.ItemUpgradeMaterial]: {
    label: 'U',
    className: 'tag-item tag-item-upgrade',
    variant: 'button',
  },
  [TagType.StatusAssigned]: {
    label: 'Assigned',
    className: 'tag-status tag-status-assigned',
    variant: 'badge',
  },
  [TagType.StatusCurrent]: {
    label: 'Current',
    className: 'tag-status tag-status-current',
    variant: 'badge',
  },
  [TagType.PermissionAdministrator]: {
    label: 'Administrator',
    className: 'tag-permission tag-permission-administrator',
    variant: 'badge',
  },
  [TagType.PermissionManager]: {
    label: 'Manager',
    className: 'tag-permission tag-permission-manager',
    variant: 'badge',
  },
  [TagType.PermissionUser]: {
    label: 'User',
    className: 'tag-permission tag-permission-user',
    variant: 'badge',
  },
};

/**
 * Helper functions to convert enums to TagType
 */
export const tagHelpers = {
  fromMemberRole: (role: MemberRole): TagType => {
    return role === MemberRole.Support ? TagType.RoleSupport : TagType.RoleDPS;
  },
  
  fromSpecType: (specType: SpecType): TagType => {
    if (specType === SpecType.OffSpec) return TagType.SpecOff;
    if (specType === SpecType.Extra) return TagType.SpecExtra;
    return TagType.SpecMain;
  },
  
  fromItemType: (itemType: ItemType): TagType => {
    return itemType === ItemType.AugTome ? TagType.ItemAugTome : TagType.ItemRaid;
  },
  
  fromItemTypeUpgrade: (): TagType => {
    return TagType.ItemUpgradeMaterial;
  },
  
  fromPermissionRole: (role: PermissionRole): TagType => {
    switch (role) {
      case PermissionRole.Administrator:
        return TagType.PermissionAdministrator;
      case PermissionRole.Manager:
        return TagType.PermissionManager;
      default:
        return TagType.PermissionUser;
    }
  },
};

interface TagProps {
  type: TagType;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  children?: React.ReactNode;
  variant?: 'badge' | 'button' | 'text';
  acquired?: boolean;
  tooltip?: string;
}

/**
 * Unified Tag component that can render any type of tag
 * Replaces role-badge, spec-badge, item-type-badge, etc.
 */
export const Tag: React.FC<TagProps> = ({
  type,
  onClick,
  disabled = false,
  className = '',
  title,
  children,
  variant,
  acquired = false,
  tooltip,
}) => {
  const config = TAG_CONFIGS[type];
  const finalVariant = config ? (variant || config.variant || 'badge') : 'badge';
  
  // Generate unique tooltip ID for this instance
  const uniqueId = useId();
  const tooltipId = tooltip && finalVariant === 'button' ? `tag-tooltip-${uniqueId}` : undefined;

  if (!config) {
    return null;
  }

  const displayLabel = children || config.label;
  const tooltipClass = (tooltip && finalVariant === 'button') ? 'tag-tooltip' : '';
  const finalClassName = `${config.className} ${className} ${acquired ? 'tag-acquired' : ''} ${tooltipClass}`.trim();
  
  const baseProps = {
    className: finalClassName,
    // Only set title if we don't have a custom tooltip (to avoid browser tooltip interfering)
    title: (tooltip && finalVariant === 'button') ? undefined : (title || tooltip),
    disabled,
    ...(tooltipId && {
      'data-tooltip-id': tooltipId,
      'data-tooltip-content': tooltip,
    }),
  };

  if (finalVariant === 'button') {
    return (
      <>
        <button
          {...baseProps}
          onClick={onClick}
          type="button"
        >
          {displayLabel}
          {acquired && <span className="tag-checkmark">✓</span>}
        </button>
        {tooltipId && (
          <Tooltip
            id={tooltipId}
            place="bottom"
            style={{
              backgroundColor: 'var(--tc-bg-surface)',
              color: 'var(--tc-text-main)',
              border: '1px solid var(--tc-border)',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 99999,
            }}
          />
        )}
      </>
    );
  }

  if (finalVariant === 'text') {
    return (
      <span {...baseProps}>
        {displayLabel}
      </span>
    );
  }

  // Default: badge variant
  return (
    <span {...baseProps}>
      {displayLabel}
    </span>
  );
};

/**
 * Convenience components for specific tag types
 */
export const RoleTag: React.FC<Omit<TagProps, 'type'> & { role: MemberRole }> = ({ role, ...props }) => {
  return <Tag type={tagHelpers.fromMemberRole(role)} {...props} />;
};

export const SpecTag: React.FC<Omit<TagProps, 'type'> & { specType: SpecType }> = ({ specType, ...props }) => {
  return <Tag type={tagHelpers.fromSpecType(specType)} {...props} />;
};

export const ItemTypeTag: React.FC<Omit<TagProps, 'type'> & { itemType: ItemType; onClick?: () => void; acquired?: boolean; tooltip?: string; variant?: 'badge' | 'button' | 'text' }> = ({ 
  itemType, 
  onClick, 
  acquired, 
  tooltip,
  variant,
  ...props 
}) => {
  const finalVariant = variant || (onClick ? 'button' : 'text');
  return (
    <Tag 
      type={tagHelpers.fromItemType(itemType)} 
      variant={finalVariant}
      onClick={onClick}
      acquired={acquired}
      tooltip={tooltip}
      {...props} 
    />
  );
};

export const UpgradeMaterialTag: React.FC<Omit<TagProps, 'type'> & { onClick?: () => void; acquired?: boolean; tooltip?: string }> = ({ 
  onClick, 
  acquired, 
  tooltip,
  ...props 
}) => {
  return (
    <Tag 
      type={TagType.ItemUpgradeMaterial} 
      variant="button"
      onClick={onClick}
      acquired={acquired}
      tooltip={tooltip}
      {...props} 
    />
  );
};

export const PermissionRoleTag: React.FC<Omit<TagProps, 'type'> & { permissionRole: PermissionRole }> = ({ permissionRole, ...props }) => {
  return <Tag type={tagHelpers.fromPermissionRole(permissionRole)} {...props} />;
};

