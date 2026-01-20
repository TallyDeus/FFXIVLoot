import React, { useState, useEffect, useCallback } from 'react';
import { WeekAssignmentHistory, GearSlot, GearSlotNames, SpecType, ItemType, PermissionRole, Member } from '../types/member';
import { lootHistoryService } from '../services/api/lootHistoryService';
import { weekService } from '../services/api/weekService';
import { memberService } from '../services/api/memberService';
import { ToastContainer } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { SpecTag, Tag, TagType } from '../components/Tag';
import { RiInkBottleFill } from 'react-icons/ri';
import {
  GiBroadsword,
  GiVisoredHelm,
  GiChestArmor,
  GiGloves,
  GiArmoredPants,
  GiLegArmor,
  GiDropEarrings,
  GiPearlNecklace,
  GiBracer,
  GiRing,
  GiYarn,
} from 'react-icons/gi';
import { Button } from '../components/Button';
import './LootHistoryPage.css';

/**
 * Page for viewing historical loot assignments grouped by week
 */
export const LootHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<WeekAssignmentHistory[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const { toasts, showToast, removeToast } = useToast();
  const { hasPermission } = useAuth();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showCreateWeekDialog, setShowCreateWeekDialog] = useState(false);
  const [newWeekNumber, setNewWeekNumber] = useState<string>('');
  
  const canCreateWeek = hasPermission(PermissionRole.Manager);
  const canDeleteWeek = hasPermission(PermissionRole.Administrator);

  const iconSize = 18;

  const SlotIcon: React.FC<{ slot?: GearSlot | null }> = ({ slot }) => {
    const commonProps = { size: iconSize, color: 'white', 'aria-hidden': true };
    switch (slot) {
      case GearSlot.Weapon:
        return <GiBroadsword {...commonProps} />;
      case GearSlot.Head:
        return <GiVisoredHelm {...commonProps} />;
      case GearSlot.Body:
        return <GiChestArmor {...commonProps} />;
      case GearSlot.Hand:
        return <GiGloves {...commonProps} />;
      case GearSlot.Legs:
        return <GiArmoredPants {...commonProps} />;
      case GearSlot.Feet:
        return <GiLegArmor {...commonProps} />;
      case GearSlot.Ears:
        return <GiDropEarrings {...commonProps} />;
      case GearSlot.Neck:
        return <GiPearlNecklace {...commonProps} />;
      case GearSlot.Wrist:
        return <GiBracer {...commonProps} />;
      case GearSlot.LeftRing:
      case GearSlot.RightRing:
        return <GiRing {...commonProps} />;
      default:
        return null;
    }
  };

  const UpgradeIcon: React.FC<{ isArmorMaterial?: boolean }> = ({ isArmorMaterial }) => {
    const commonProps = { size: iconSize, color: 'white', 'aria-hidden': true };
    return isArmorMaterial ? <GiYarn {...commonProps} /> : <RiInkBottleFill {...commonProps} />;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [historyData, membersData] = await Promise.all([
        lootHistoryService.getAllHistory(),
        memberService.getAllMembers()
      ]);
      setHistory(historyData);
      setMembers(membersData);
      const currentWeek = historyData.find(w => w.isCurrentWeek);
      if (currentWeek) {
        setExpandedWeeks(new Set([currentWeek.weekNumber]));
      }
    } catch (error) {
      showToast('Failed to load history. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const handleDeleteWeek = (weekNumber: number) => {
    const weekHistory = history.find(w => w.weekNumber === weekNumber);
    const assignmentCount = weekHistory?.assignments.length ?? 0;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Week',
      message: `Are you sure you want to delete Week ${weekNumber}? This will permanently delete ${assignmentCount} assignment${assignmentCount !== 1 ? 's' : ''} and revert all BiS tracker changes from this week. This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await weekService.deleteWeek(weekNumber);
          await loadData();
          showToast(`Week ${weekNumber} deleted successfully. All BiS tracker changes have been reverted.`);
        } catch (error: any) {
          showToast(error.message || 'Failed to delete week. Please try again.', 'error');
        }
      },
    });
  };

  const handleCreateWeek = async () => {
    const weekNum = parseInt(newWeekNumber);
    if (isNaN(weekNum) || weekNum < 1) {
      showToast('Please enter a valid week number (1 or higher).', 'error');
      return;
    }

    const existingWeek = history.find(w => w.weekNumber === weekNum);
    if (existingWeek) {
      showToast(`Week ${weekNum} already exists. Please choose a different week number.`, 'error');
      return;
    }

    try {
      await weekService.createWeekWithNumber(weekNum);
      setShowCreateWeekDialog(false);
      setNewWeekNumber('');
      await loadData();
      showToast(`Week ${weekNum} created successfully.`);
    } catch (error: any) {
      showToast(error.message || 'Failed to create week. Please try again.', 'error');
    }
  };

  /**
   * Gets the display name for a floor number
   */
  const getFloorName = (floorNumber: number): string => {
    return `Floor ${floorNumber}`;
  };

  /**
   * Gets the display name for an assignment item
   */
  const getItemDisplayName = (assignment: WeekAssignmentHistory['assignments'][0]): string => {
    if (assignment.isUpgradeMaterial) {
      return assignment.isArmorMaterial ? 'Armor Upgrade Material' : 'Accessory Upgrade Material';
    }
    if (assignment.slot !== null) {
      return GearSlotNames[assignment.slot as GearSlot];
    }
    return 'Unknown';
  };

  /**
   * Determines the tag type for an assignment
   */
  const getTagType = (assignment: WeekAssignmentHistory['assignments'][0]): TagType => {
    if (assignment.isUpgradeMaterial) {
      return TagType.ItemUpgradeMaterial;
    }
    if (assignment.isManualEdit && assignment.itemType !== undefined) {
      return assignment.itemType === ItemType.AugTome ? TagType.ItemAugTome : TagType.ItemRaid;
    }
    return TagType.ItemRaid;
  };

  /**
   * Formats a date string for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Groups assignments by floor, separating manual edits
   */
  const groupAssignmentsByFloor = (assignments: WeekAssignmentHistory['assignments']) => {
    const grouped: Record<string, typeof assignments> = {};
    const manualEdits: typeof assignments = [];
    const regularAssignments: typeof assignments = [];
    
    assignments.forEach(assignment => {
      if (assignment.isManualEdit) {
        manualEdits.push(assignment);
      } else {
        regularAssignments.push(assignment);
      }
    });
    
    regularAssignments.forEach(assignment => {
      const floorKey = assignment.floorNumber.toString();
      if (!grouped[floorKey]) {
        grouped[floorKey] = [];
      }
      grouped[floorKey].push(assignment);
    });
    
    if (manualEdits.length > 0) {
      grouped['manual'] = manualEdits;
    }
    
    return grouped;
  };

  if (loading) {
    return <div className="loading">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="loot-history-page">
        <div className="page-header">
          <div>
            <h1>Loot History</h1>
            <p>View historical loot assignments by week</p>
          </div>
          {canCreateWeek && (
            <Button 
              variant="contained"
              color="primary"
              onClick={() => setShowCreateWeekDialog(true)}
            >
              Create Week
            </Button>
          )}
        </div>
        <div className="no-history">
          <p>No assignment history found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loot-history-page">
      <div className="page-header">
        <div>
          <h1>Loot History</h1>
          <p>View historical loot assignments by week</p>
        </div>
        {canCreateWeek && (
          <Button 
            variant="contained"
            color="primary"
            onClick={() => setShowCreateWeekDialog(true)}
          >
            Create Week
          </Button>
        )}
      </div>

      <div className="history-list">
        {history.map(weekHistory => {
          const isExpanded = expandedWeeks.has(weekHistory.weekNumber);
          const assignmentsByFloor = groupAssignmentsByFloor(weekHistory.assignments);

          return (
              <div key={weekHistory.weekNumber} className="week-card">
              <div 
                className="week-header"
                onClick={() => toggleWeek(weekHistory.weekNumber)}
              >
                <div className="week-header-left">
                  <h2>
                    Week {weekHistory.weekNumber}
                    {weekHistory.isCurrentWeek && (
                      <Tag type={TagType.StatusCurrent} />
                    )}
                  </h2>
                  <p className="week-date">
                    Started: {formatDate(weekHistory.weekStartedAt)}
                  </p>
                </div>
                <div className="week-header-right">
                  <span className="assignment-count">
                    {weekHistory.assignments.length} assignment{weekHistory.assignments.length !== 1 ? 's' : ''}
                  </span>
                  {canDeleteWeek && (
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWeek(weekHistory.weekNumber);
                      }}
                      title="Delete Week"
                    >
                      Delete Week
                    </Button>
                  )}
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="week-content">
                  {Object.keys(assignmentsByFloor)
                    .sort((a, b) => {
                      if (a === 'manual') return 1;
                      if (b === 'manual') return -1;
                      return parseInt(a) - parseInt(b);
                    })
                    .map(floorKey => {
                      const assignments = assignmentsByFloor[floorKey];
                      const isManualEdit = floorKey === 'manual';
                      const floorNumber = isManualEdit ? null : parseInt(floorKey);
                      
                      return (
                        <div key={floorKey} className="floor-section">
                          <h3 className="floor-header">
                            {isManualEdit ? 'Manual edits' : getFloorName(floorNumber!)}
                          </h3>
                          <div className="assignments-list">
                            {assignments.map(assignment => {
                              const itemName = getItemDisplayName(assignment);
                              const tagType = getTagType(assignment);
                              const specType = assignment.specType !== undefined ? assignment.specType as SpecType : SpecType.MainSpec;
                              
                              return (
                                <div key={assignment.id} className="assignment-item">
                                  <span className="assignment-text">
                                    <span className="item-name">{itemName}</span>
                                    <Tag
                                      type={tagType}
                                      variant="badge"
                                      children={
                                        assignment.isUpgradeMaterial ? (
                                          <UpgradeIcon isArmorMaterial={assignment.isArmorMaterial} />
                                        ) : (
                                          <SlotIcon slot={assignment.slot as GearSlot | null} />
                                        )
                                      }
                                    />
                                    <span className="assignment-separator">-</span>
                                    <span className="assignment-acquired">Acquired by</span>
                                    {(() => {
                                      const member = members.find(m => m.id === assignment.memberId);
                                      const imageUrl = member?.profileImageUrl 
                                        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${member.profileImageUrl}`
                                        : `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                                      return (
                                        <span className="member-name-with-image">
                                          <img 
                                            src={imageUrl}
                                            alt={assignment.memberName}
                                            className="member-profile-image-small"
                                            onError={(e) => {
                                              if (member?.profileImageUrl) {
                                                (e.target as HTMLImageElement).src = `${process.env.PUBLIC_URL}/ffxiv-logo.png`;
                                              }
                                            }}
                                          />
                                          <span className="member-name">{assignment.memberName}</span>
                                        </span>
                                      );
                                    })()}
                                    <SpecTag specType={specType} />
                                    <span className="assignment-separator">-</span>
                                    <span className="assignment-date">{formatDate(assignment.assignedAt)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonColor="error"
        />
      )}

      {showCreateWeekDialog && (
        <div className="create-week-overlay" onClick={() => setShowCreateWeekDialog(false)}>
          <div className="create-week-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create Week</h3>
            <div className="form-group">
              <label htmlFor="week-number">Week Number</label>
              <input
                type="number"
                id="week-number"
                value={newWeekNumber}
                onChange={(e) => setNewWeekNumber(e.target.value)}
                placeholder="Enter week number"
                min="1"
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <Button 
                variant="outlined" 
                onClick={() => setShowCreateWeekDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="contained"
                color="primary"
                onClick={handleCreateWeek}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

