# Unified Tag System Documentation

## Overview
The unified tag system replaces all individual tag implementations (`role-badge`, `spec-badge`, `item-type-badge`, etc.) with a single, consistent `Tag` component that can render any type of tag.

## Benefits
- **Consistency**: All tags use the same component and styling system
- **Maintainability**: Single source of truth for tag rendering
- **Extensibility**: Easy to add new tag types
- **Type Safety**: TypeScript enums ensure correct usage
- **Reusability**: One component for all tag needs

## Usage

### Basic Tag Component
```tsx
import { Tag, TagType } from './components/Tag';

// Direct usage with TagType enum
<Tag type={TagType.RoleDPS} />
<Tag type={TagType.SpecMain} />
<Tag type={TagType.ItemRaid} />
```

### Convenience Components
```tsx
import { RoleTag, SpecTag, ItemTypeTag, UpgradeMaterialTag } from './components/Tag';

// Role tags
<RoleTag role={MemberRole.DPS} />
<RoleTag role={MemberRole.Support} />

// Spec tags
<SpecTag specType={SpecType.MainSpec} />
<SpecTag specType={SpecType.OffSpec} />

// Item type tags (as buttons)
<ItemTypeTag 
  itemType={ItemType.Raid} 
  onClick={handleClick}
  acquired={isAcquired}
  tooltip="Item name"
/>

// Upgrade material tags
<UpgradeMaterialTag 
  onClick={handleClick}
  acquired={isAcquired}
  tooltip="Upgrade material"
/>
```

## Tag Types

### Role Tags
- `TagType.RoleDPS` - DPS role badge
- `TagType.RoleSupport` - Support role badge

### Spec Tags
- `TagType.SpecMain` - Main spec badge
- `TagType.SpecOff` - Off spec badge

### Item Type Tags
- `TagType.ItemRaid` - Raid item (R)
- `TagType.ItemAugTome` - Augmented Tome item (T)
- `TagType.ItemUpgradeMaterial` - Upgrade material (U)

### Status Tags
- `TagType.StatusAssigned` - Assigned status
- `TagType.StatusCurrent` - Current status

## Props

### Tag Component Props
```typescript
interface TagProps {
  type: TagType;              // Required: The type of tag to render
  onClick?: () => void;       // Optional: Click handler (makes it a button)
  disabled?: boolean;         // Optional: Disable the tag
  className?: string;         // Optional: Additional CSS classes
  title?: string;             // Optional: Tooltip text
  children?: React.ReactNode; // Optional: Override default label
  variant?: 'badge' | 'button' | 'text'; // Optional: Override default variant
  acquired?: boolean;         // Optional: Show acquired state (green overlay + checkmark)
  tooltip?: string;           // Optional: Tooltip text (for item tags)
}
```

## Features

### Acquired State
Tags can show an "acquired" state with a green overlay and checkmark:
```tsx
<ItemTypeTag 
  itemType={ItemType.Raid} 
  acquired={true}
/>
```

### Tooltips
Item type tags support tooltips:
```tsx
<ItemTypeTag 
  itemType={ItemType.Raid} 
  tooltip="Member Name - Gear Slot Name"
/>
```

### Click Handlers
Item type tags can be clickable buttons:
```tsx
<ItemTypeTag 
  itemType={ItemType.Raid} 
  onClick={() => handleToggle()}
  disabled={isUpdating}
/>
```

## Migration Guide

### Before (Old System)
```tsx
<span className={`role-badge ${member.role === MemberRole.Support ? 'support' : 'dps'}`}>
  {MemberRoleNames[member.role]}
</span>

<span className="spec-badge main-spec">Main Spec</span>

<button className={`item-type-badge ${item.itemType === ItemType.AugTome ? 'aug-tome' : 'raid'}`}>
  {item.itemType === ItemType.AugTome ? 'T' : 'R'}
</button>
```

### After (New System)
```tsx
<RoleTag role={member.role} />

<SpecTag specType={SpecType.MainSpec} />

<ItemTypeTag itemType={item.itemType} />
```

## CSS Variables

The tag system uses existing CSS variables:
- `--tc-role-dps` - DPS role color
- `--tc-role-support` - Support role color
- `--tc-spec-main` - Main spec color
- `--tc-spec-off` - Off spec color
- `--tc-raid` - Raid item color
- `--tc-aug-tome` - Aug Tome item color
- `--tc-upgrade` - Upgrade material color

## Examples

### Complete Example
```tsx
import { RoleTag, SpecTag, ItemTypeTag, UpgradeMaterialTag } from './components/Tag';
import { MemberRole, SpecType, ItemType } from './types/member';

function MyComponent() {
  return (
    <div>
      {/* Role tags */}
      <RoleTag role={MemberRole.DPS} />
      <RoleTag role={MemberRole.Support} />
      
      {/* Spec tags */}
      <SpecTag specType={SpecType.MainSpec} />
      <SpecTag specType={SpecType.OffSpec} />
      
      {/* Item type tags */}
      <ItemTypeTag 
        itemType={ItemType.Raid}
        onClick={() => console.log('Clicked')}
        acquired={false}
        tooltip="Weapon - Raid"
      />
      
      <ItemTypeTag 
        itemType={ItemType.AugTome}
        onClick={() => console.log('Clicked')}
        acquired={true}
        tooltip="Head - Aug Tome"
      />
      
      {/* Upgrade material tag */}
      <UpgradeMaterialTag
        onClick={() => console.log('Upgrade clicked')}
        acquired={true}
        tooltip="Head - Upgrade Material"
      />
    </div>
  );
}
```

## Components Updated

The following components have been migrated to use the unified tag system:
- ✅ `LootItemCard.tsx` - Role and spec tags
- ✅ `BiSMatrix.tsx` - Role, item type, and upgrade material tags
- ✅ `MemberList.tsx` - Role tags

## Remaining Components to Migrate

- `LootHistoryPage.tsx` - Role, spec, and item type badges
- `BiSTrackerPage.tsx` - Item type badges in legend
- `MemberForm.tsx` - Role buttons (can use Tag with variant="button")
- `GearSlotItem.tsx` - Item type display

## Adding New Tag Types

To add a new tag type:

1. Add to `TagType` enum:
```typescript
export enum TagType {
  // ... existing types
  MyNewTag = 'my-new-tag',
}
```

2. Add configuration:
```typescript
const TAG_CONFIGS: Record<TagType, TagConfig> = {
  // ... existing configs
  [TagType.MyNewTag]: {
    label: 'My New Tag',
    className: 'tag-my-new-tag',
    variant: 'badge',
  },
};
```

3. Add CSS styles:
```css
.tag-my-new-tag {
  background-color: var(--tc-my-new-tag);
  color: white;
}
```

4. (Optional) Create convenience component:
```typescript
export const MyNewTag: React.FC<Omit<TagProps, 'type'>> = (props) => {
  return <Tag type={TagType.MyNewTag} {...props} />;
};
```

