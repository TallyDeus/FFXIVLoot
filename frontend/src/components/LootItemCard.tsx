import React, { useState, useEffect } from 'react';
import { AvailableLoot, Member, GearSlotNames, GearSlot, MemberRole, SpecType } from '../types/member';
import { RoleTag, SpecTag, Tag, TagType } from './Tag';
import { Button } from './Button';
import { lootService } from '../services/api/lootService';
import './LootItemCard.css';

interface LootItemCardProps {
  loot: AvailableLoot;
  members: Member[];
  floorNumber?: number;
  currentWeekNumber: number | null;
  onAssign: (memberId: string, slot: GearSlot | null, specType?: SpecType) => void;
  onAssignUpgrade?: (memberId: string, isArmorMaterial: boolean, specType?: SpecType) => void;
  onUndo?: (assignmentId: string) => void;
  canAssignLoot?: boolean;
}

/**
 * Component for displaying a loot item and eligible members
 */
export const LootItemCard: React.FC<LootItemCardProps> = ({ loot, members, floorNumber, currentWeekNumber, onAssign, onAssignUpgrade, onUndo, canAssignLoot = true }) => {
  const [acquisitionCounts, setAcquisitionCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [visibleSpec, setVisibleSpec] = useState<SpecType>(SpecType.MainSpec);

  // Check if this is Extra loot (any eligible member has SpecType.Extra)
  const isExtraLoot = loot.eligibleMembers.some(need => need.specType === SpecType.Extra);

  // Fetch acquisition counts for Extra loot
  useEffect(() => {
    if (isExtraLoot && !loot.isAssigned) {
      setLoadingCounts(true);
      lootService.getExtraLootAcquisitionCounts(
        loot.slot,
        loot.isUpgradeMaterial,
        loot.isArmorMaterial
      )
        .then(counts => {
          setAcquisitionCounts(counts);
          setLoadingCounts(false);
        })
        .catch(() => {
          setLoadingCounts(false);
        });
    }
  }, [isExtraLoot, loot.slot, loot.isUpgradeMaterial, loot.isArmorMaterial, loot.isAssigned]);

  /**
   * Gets member details with their needed counts and spec type
   */
  const memberNeeds = React.useMemo(() => {
    return loot.eligibleMembers
      .map(need => {
        const member = members.find(m => m.id === need.memberId);
        if (!member) return null;
        
        const acquisitionCount = isExtraLoot ? (acquisitionCounts[need.memberId] ?? 0) : 0;
        return { 
          member, 
          neededCount: isExtraLoot ? acquisitionCount : need.neededCount,
          specType: need.specType ?? SpecType.MainSpec
        };
      })
      .filter((item): item is { member: Member; neededCount: number; specType: SpecType } => item !== null);
  }, [loot.eligibleMembers, members, isExtraLoot, acquisitionCounts]);
  
  const hasMainSpecMembers = React.useMemo(
    () => memberNeeds.some(item => item.specType === SpecType.MainSpec),
    [memberNeeds]
  );

  const hasOffSpecMembers = React.useMemo(
    () => memberNeeds.some(item => item.specType === SpecType.OffSpec),
    [memberNeeds]
  );

  // Default the view to whichever spec is available (prefer main spec)
  useEffect(() => {
    if (isExtraLoot) {
      return;
    }

    if (hasMainSpecMembers) {
      setVisibleSpec(SpecType.MainSpec);
    } else if (hasOffSpecMembers) {
      setVisibleSpec(SpecType.OffSpec);
    }
  }, [hasMainSpecMembers, hasOffSpecMembers, isExtraLoot]);

  const filteredMemberNeeds = React.useMemo(() => {
    if (isExtraLoot) {
      return memberNeeds;
    }

    if (visibleSpec === SpecType.MainSpec) {
      return memberNeeds.filter(item => item.specType === SpecType.MainSpec);
    }

    if (visibleSpec === SpecType.OffSpec) {
      return memberNeeds.filter(item => item.specType === SpecType.OffSpec);
    }

    return memberNeeds;
  }, [isExtraLoot, memberNeeds, visibleSpec]);
  
  /**
   * Groups members by spec type and role for display
   */
  const { extraMembers, mainSpecDpsMembers, mainSpecSupportMembers, offSpecMembers } = React.useMemo(() => {
    if (isExtraLoot) {
      return {
        extraMembers: memberNeeds,
        mainSpecDpsMembers: [],
        mainSpecSupportMembers: [],
        offSpecMembers: [],
      };
    }
    
    const mainSpecMembers = filteredMemberNeeds.filter(item => item.specType === SpecType.MainSpec);
    const mainSpecDps = mainSpecMembers.filter(item => item.member.role === MemberRole.DPS);
    const mainSpecSupport = mainSpecMembers.filter(item => item.member.role === MemberRole.Support);
    const offSpec = filteredMemberNeeds.filter(item => item.specType === SpecType.OffSpec);
    
    return {
      extraMembers: [],
      mainSpecDpsMembers: mainSpecDps,
      mainSpecSupportMembers: mainSpecSupport,
      offSpecMembers: offSpec,
    };
  }, [filteredMemberNeeds, isExtraLoot, memberNeeds]);

  // Determine display name
  let displayName: string;
  if (loot.isUpgradeMaterial) {
    displayName = loot.isArmorMaterial ? 'Armor Upgrade Material' : 'Accessory Upgrade Material';
  } else {
    // For Floor 1, show "Ring" instead of "Right Ring" or "Left Ring"
    displayName = (floorNumber === 1 && loot.slot !== null && (loot.slot === GearSlot.RightRing || loot.slot === GearSlot.LeftRing))
      ? 'Ring'
      : (loot.slot !== null ? GearSlotNames[loot.slot] : 'Unknown');
  }

  const handleAssign = (memberId: string, specType?: SpecType) => {
    if (loot.isUpgradeMaterial && onAssignUpgrade) {
      onAssignUpgrade(memberId, loot.isArmorMaterial ?? false, specType);
    } else if (loot.slot !== null) {
      onAssign(memberId, loot.slot, specType);
    }
  };

  const totalNeeded = filteredMemberNeeds.reduce((sum, item) => sum + item.neededCount, 0);

  const assignedMember = loot.isAssigned && loot.assignedToMemberId
    ? members.find(m => m.id === loot.assignedToMemberId)
    : null;

  const isCurrentWeek = currentWeekNumber !== null;

  return (
    <div className="loot-item-card">
      <div className="loot-item-header">
        <h3>{displayName}</h3>
        <div className="loot-item-info">
          {!loot.isAssigned && (
            loot.isUpgradeMaterial ? (
              <span className="item-type upgrade-material">Upgrade Material</span>
            ) : (
              <span className="item-type raid">Raid</span>
            )
          )}
        </div>
      </div>

      {loot.isAssigned && isCurrentWeek && loot.assignmentId && onUndo ? (
        <div className="assigned-info">
          <div className="assigned-member-info">
            <Tag type={TagType.StatusAssigned}>
              Assigned to {assignedMember?.name || 'Unknown'}
            </Tag>
          </div>
          {canAssignLoot && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => onUndo(loot.assignmentId!)}
            >
              Undo Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="eligible-members">
          {!isExtraLoot && (hasMainSpecMembers || hasOffSpecMembers) && (
            <div className="loot-spec-toggle">
              {hasMainSpecMembers && (
                <button
                  className={`view-button ${visibleSpec === SpecType.MainSpec ? 'active' : ''}`}
                  onClick={() => setVisibleSpec(SpecType.MainSpec)}
                  type="button"
                >
                  <SpecTag specType={SpecType.MainSpec} />
                </button>
              )}
              {hasOffSpecMembers && (
                <button
                  className={`view-button ${visibleSpec === SpecType.OffSpec ? 'active' : ''}`}
                  onClick={() => setVisibleSpec(SpecType.OffSpec)}
                  type="button"
                >
                  <SpecTag specType={SpecType.OffSpec} />
                </button>
              )}
            </div>
          )}

          <div className="eligible-count">
            {isExtraLoot ? (
              <>
                Extra loot - assign to any member (showing acquisition counts)
              </>
            ) : loot.isUpgradeMaterial ? (
              <>
                {totalNeeded} upgrade material{totalNeeded !== 1 ? 's' : ''} needed across {filteredMemberNeeds.length} member{filteredMemberNeeds.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                {filteredMemberNeeds.length} member{filteredMemberNeeds.length !== 1 ? 's' : ''} need{filteredMemberNeeds.length === 1 ? 's' : ''} this
              </>
            )}
          </div>
          
          {loadingCounts && isExtraLoot && (
            <div style={{ padding: '10px', textAlign: 'center', color: 'var(--tc-text-muted)' }}>
              Loading acquisition counts...
            </div>
          )}
          
          <div className="member-list-grouped">
            {/* Extra loot - show all members together (no role grouping) */}
            {isExtraLoot && (
              <div className="member-column">
                <div className="member-column-header">
                  <SpecTag specType={SpecType.Extra} />
                </div>
                <div className="member-list">
                  {extraMembers.map(({ member, neededCount }) => (
                    <Button
                      key={member.id}
                      onClick={() => canAssignLoot && handleAssign(member.id, SpecType.Extra)}
                      variant="outlined"
                      color="primary"
                      size="small"
                      disabled={!canAssignLoot}
                      title={`Has acquired ${neededCount} time${neededCount !== 1 ? 's' : ''} as Extra`}
                    >
                      {member.name} ({neededCount})
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular loot - show by spec type and role */}
            {!isExtraLoot && (
              <>
            {mainSpecDpsMembers.length > 0 && (
              <div className="member-column">
                <div className="member-column-header">
                  <RoleTag role={MemberRole.DPS} />
                </div>
                <div className="member-list">
                  {mainSpecDpsMembers.map(({ member, neededCount }) => (
                    <Button
                      key={member.id}
                      onClick={() => canAssignLoot && handleAssign(member.id, SpecType.MainSpec)}
                      variant="outlined"
                      color="primary"
                      size="small"
                      disabled={!canAssignLoot}
                      title={loot.isUpgradeMaterial ? `Needs ${neededCount} upgrade material${neededCount !== 1 ? 's' : ''}` : undefined}
                    >
                      {member.name} {neededCount > 1 && `(${neededCount})`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {mainSpecSupportMembers.length > 0 && (
              <div className="member-column">
                <div className="member-column-header">
                  <RoleTag role={MemberRole.Support} />
                </div>
                <div className="member-list">
                  {mainSpecSupportMembers.map(({ member, neededCount }) => (
                    <Button
                      key={member.id}
                      onClick={() => canAssignLoot && handleAssign(member.id, SpecType.MainSpec)}
                      variant="outlined"
                      color="primary"
                      size="small"
                      disabled={!canAssignLoot}
                      title={loot.isUpgradeMaterial ? `Needs ${neededCount} upgrade material${neededCount !== 1 ? 's' : ''}` : undefined}
                    >
                      {member.name} {neededCount > 1 && `(${neededCount})`}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
                {offSpecMembers.length > 0 && (
                  <div className="member-column">
                    <div className="member-column-header" />
                    <div className="member-list">
                      {offSpecMembers.map(({ member, neededCount }) => (
                        <Button
                          key={member.id}
                          onClick={() => canAssignLoot && handleAssign(member.id, SpecType.OffSpec)}
                          variant="outlined"
                          color="primary"
                          size="small"
                          disabled={!canAssignLoot}
                          title={loot.isUpgradeMaterial ? `Needs ${neededCount} upgrade material${neededCount !== 1 ? 's' : ''}` : undefined}
                        >
                          {member.name} {neededCount > 1 && `(${neededCount})`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

