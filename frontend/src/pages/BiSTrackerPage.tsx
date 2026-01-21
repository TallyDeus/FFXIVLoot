import React, { useState, useEffect, useCallback } from 'react';
import { Member, SpecType, GearSlot } from '../types/member';
import { memberService } from '../services/api/memberService';
import { BiSMatrix } from '../components/BiSMatrix';
import { ExtraLootMatrix } from '../components/ExtraLootMatrix';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SpecTag, Tag, TagType } from '../components/Tag';
import { signalRService } from '../services/signalrService';
import { getBisItems } from '../utils/specHelpers';
import './BiSTrackerPage.css';

type ViewType = 'main' | 'off' | 'extra';

/**
 * Page for tracking best-in-slot progress for all members
 */
export const BiSTrackerPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('main');
  const { toasts, showToast, removeToast } = useToast();

  const refreshMembers = useCallback(async () => {
    try {
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      showToast('Failed to refresh members. Please try again.', 'error');
    }
  }, [showToast]);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      await refreshMembers();
    } catch (error) {
      showToast('Failed to load members. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [refreshMembers, showToast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Set up SignalR real-time updates
  useEffect(() => {
    let isMounted = true;

    const setupSignalR = async () => {
      try {
        await signalRService.start();

        // Listen for BiS item updates
        signalRService.onBiSItemUpdate((memberId, slot, isAcquired, specType) => {
          if (!isMounted) return;

          setMembers(prevMembers => {
            return prevMembers.map(member => {
              if (member.id === memberId) {
                const itemsList = getBisItems(member, specType === SpecType.OffSpec ? 'off' : 'main');
                const updatedItems = itemsList.map(item => {
                  if (item.slot === slot) {
                    return { ...item, isAcquired };
                  }
                  return item;
                });

                if (specType === SpecType.OffSpec) {
                  return { ...member, offSpecBisItems: updatedItems };
                } else {
                  return { ...member, bisItems: updatedItems };
                }
              }
              return member;
            });
          });
        });

        // Listen for upgrade material updates
        signalRService.onUpgradeMaterialUpdate((memberId, slot, upgradeMaterialAcquired, specType) => {
          if (!isMounted) return;

          setMembers(prevMembers => {
            return prevMembers.map(member => {
              if (member.id === memberId) {
                const itemsList = getBisItems(member, specType === SpecType.OffSpec ? 'off' : 'main');
                const updatedItems = itemsList.map(item => {
                  if (item.slot === slot) {
                    return { ...item, upgradeMaterialAcquired };
                  }
                  return item;
                });

                if (specType === SpecType.OffSpec) {
                  return { ...member, offSpecBisItems: updatedItems };
                } else {
                  return { ...member, bisItems: updatedItems };
                }
              }
              return member;
            });
          });
        });
      } catch (error) {
        console.error('Failed to setup SignalR connection:', error);
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
      // Note: We don't stop SignalR here as it may be used by other pages
      // The connection will be managed globally
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading members...</div>;
  }

  return (
    <div className="bis-tracker-page">
      <div className="page-header">
        <h1>Best-in-Slot Tracker</h1>
        <p className="page-subtitle">Import BiS lists from the Member Management page</p>
      </div>

      {members.length > 0 ? (
        <>
          <div className="view-selector">
            <button
              className={`view-button ${activeView === 'main' ? 'active' : ''}`}
              onClick={() => setActiveView('main')}
            >
              <SpecTag specType={SpecType.MainSpec} />
            </button>
            <button
              className={`view-button ${activeView === 'off' ? 'active' : ''}`}
              onClick={() => setActiveView('off')}
            >
              <SpecTag specType={SpecType.OffSpec} />
            </button>
            <button
              className={`view-button ${activeView === 'extra' ? 'active' : ''}`}
              onClick={() => setActiveView('extra')}
            >
              <SpecTag specType={SpecType.Extra} />
            </button>
          </div>

          <div className="view-content-wrapper">
            {activeView !== 'extra' && (
              <div className="bis-matrix-legend">
                <div className="legend-item">
                  <Tag type={TagType.ItemRaid} variant="badge" />
                  <span>Raid</span>
                </div>
                <div className="legend-item">
                  <Tag type={TagType.ItemAugTome} variant="badge" />
                  <span>Tomestone</span>
                </div>
                <div className="legend-item">
                  <Tag type={TagType.ItemUpgradeMaterial} variant="badge" />
                  <span>Upgrade Material</span>
                </div>
              </div>
            )}

            {activeView === 'extra' ? (
              <div className="view-content">
                <ExtraLootMatrix members={members} />
              </div>
            ) : (
              <div className="view-content">
                <div className="spec-section">
                  <BiSMatrix 
                    members={members} 
                    onUpdate={loadMembers} 
                    onMemberUpdate={(memberId, slot, isAcquired, upgradeMaterialAcquired) => {
                      // Optimistically update local state for smooth UI
                      setMembers(prevMembers => {
                        return prevMembers.map(member => {
                          if (member.id === memberId) {
                            const itemsList = getBisItems(member, activeView);
                            const updatedItems = itemsList.map(item => {
                              if (item.slot === slot) {
                                if (upgradeMaterialAcquired !== undefined) {
                                  return { ...item, upgradeMaterialAcquired };
                                } else {
                                  return { ...item, isAcquired };
                                }
                              }
                              return item;
                            });

                            if (activeView === 'off') {
                              return { ...member, offSpecBisItems: updatedItems };
                            } else {
                              return { ...member, bisItems: updatedItems };
                            }
                          }
                          return member;
                        });
                      });
                    }}
                    specType={activeView} 
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="no-members">
          <p>No members found. Please add members first.</p>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

