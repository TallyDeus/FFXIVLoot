import React, { useState, useEffect } from 'react';
import { FloorNumber, Week, AvailableLoot, Member } from '../types/member';
import { FloorSelector } from '../components/FloorSelector';
import { LootDistributionPanel } from '../components/LootDistributionPanel';
import { weekService } from '../services/api/weekService';
import { lootService } from '../services/api/lootService';
import { memberService } from '../services/api/memberService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { signalRService } from '../services/signalrService';
import './LootDistributionPage.css';

/**
 * Page for managing loot distribution after floor completion
 */
export const LootDistributionPage: React.FC = () => {
  const [selectedFloor, setSelectedFloor] = useState<FloorNumber | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [allWeeks, setAllWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [lootCache, setLootCache] = useState<Map<FloorNumber, AvailableLoot[]>>(new Map());
  const [members, setMembers] = useState<Member[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  const { canCreateWeek } = useAuth();

  useEffect(() => {
    loadWeekData();
  }, []);

  useEffect(() => {
    if (currentWeek && !loading) {
      loadAllLootData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  // Set up SignalR real-time updates for loot distribution
  useEffect(() => {
    let isMounted = true;

    const setupSignalR = async () => {
      try {
        await signalRService.start();

        // Listen for loot assignment updates
        signalRService.onLootAssigned((floorNumber, weekNumber) => {
          if (!isMounted) return;
          
          // Only refresh if it's the current week or no week specified
          if (!currentWeek || weekNumber === null || weekNumber === currentWeek.weekNumber) {
            const floor = floorNumber as FloorNumber;
            // Refresh the affected floor's loot data
            if (currentWeek) {
              lootService.getAvailableLoot(floor, currentWeek.weekNumber)
                .then(lootData => {
                  if (isMounted) {
                    setLootCache(prevCache => {
                      const newCache = new Map(prevCache);
                      newCache.set(floor, lootData);
                      return newCache;
                    });
                  }
                })
                .catch(() => {
                  // Silently handle errors
                });
            }
          }
        });

        // Listen for loot undone updates
        signalRService.onLootUndone((floorNumber, weekNumber) => {
          if (!isMounted) return;
          
          // Only refresh if it's the current week or no week specified
          if (!currentWeek || weekNumber === null || weekNumber === currentWeek.weekNumber) {
            const floor = floorNumber as FloorNumber;
            // Refresh the affected floor's loot data
            if (currentWeek) {
              lootService.getAvailableLoot(floor, currentWeek.weekNumber)
                .then(lootData => {
                  if (isMounted) {
                    setLootCache(prevCache => {
                      const newCache = new Map(prevCache);
                      newCache.set(floor, lootData);
                      return newCache;
                    });
                  }
                })
                .catch(() => {
                  // Silently handle errors
                });
            }
          }
        });
      } catch (error) {
        console.error('Failed to setup SignalR connection:', error);
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
    };
  }, [currentWeek]);

  const loadWeekData = async () => {
    try {
      setLoading(true);
      // Get all weeks first
      const weeks = await weekService.getAllWeeks();
      
      if (weeks.length === 0) {
          // No weeks exist - try to initialize historical data
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const response = await fetch(`${apiUrl}/api/initialize/weeks`, {
            method: 'POST',
          });
          if (response.ok) {
            // Reload weeks after initialization
            const reloadedWeeks = await weekService.getAllWeeks();
            setAllWeeks(reloadedWeeks);
            if (reloadedWeeks.length > 0) {
              const current = await weekService.getCurrentWeek();
              setCurrentWeek(current || reloadedWeeks[0]);
            }
          } else {
            // Initialization failed, create week 1
            const newWeek = await weekService.startNewWeek();
            setCurrentWeek(newWeek);
            setAllWeeks([newWeek]);
          }
        } catch (initError) {
          // Fallback: create week 1
          const newWeek = await weekService.startNewWeek();
          setCurrentWeek(newWeek);
          setAllWeeks([newWeek]);
        }
      } else {
        setAllWeeks(weeks);
        // Try to get current week
        try {
          const current = await weekService.getCurrentWeek();
          setCurrentWeek(current);
        } catch (currentError: any) {
          // If no current week is set but weeks exist, set the first one as current
          if (weeks.length > 0) {
            const firstWeek = weeks[0];
            await weekService.setCurrentWeek(firstWeek.weekNumber);
            setCurrentWeek(firstWeek);
          }
        }
      }
    } catch (error) {
      // If everything fails, try to create week 1
      try {
        const newWeek = await weekService.startNewWeek();
        setCurrentWeek(newWeek);
        setAllWeeks([newWeek]);
      } catch (createError) {
        // Silently handle creation error
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFloorSelect = (floor: FloorNumber) => {
    setSelectedFloor(floor);
  };

  /**
   * Loads all loot data for all floors and members
   */
  const loadAllLootData = async () => {
    if (!currentWeek) return;
    
    try {
      const weekNumber = currentWeek.weekNumber;
      const allFloors = [
        FloorNumber.Floor1,
        FloorNumber.Floor2,
        FloorNumber.Floor3,
        FloorNumber.Floor4,
      ];
      
      const [floor1Loot, floor2Loot, floor3Loot, floor4Loot, membersData] = await Promise.all([
        lootService.getAvailableLoot(FloorNumber.Floor1, weekNumber).catch(() => []),
        lootService.getAvailableLoot(FloorNumber.Floor2, weekNumber).catch(() => []),
        lootService.getAvailableLoot(FloorNumber.Floor3, weekNumber).catch(() => []),
        lootService.getAvailableLoot(FloorNumber.Floor4, weekNumber).catch(() => []),
        memberService.getAllMembers().catch(() => []),
      ]);

      const newCache = new Map<FloorNumber, AvailableLoot[]>();
      const floorLoots = [floor1Loot, floor2Loot, floor3Loot, floor4Loot];
      allFloors.forEach((floor, index) => {
        newCache.set(floor, floorLoots[index]);
      });
      
      setLootCache(newCache);
      setMembers(membersData);
    } catch (error) {
      showToast('Failed to load loot data. Please try again.', 'error');
    }
  };

  const handleLootAssigned = async () => {
    // Refresh the cache for the current floor after assignment
    if (selectedFloor && currentWeek) {
      try {
        const lootData = await lootService.getAvailableLoot(selectedFloor, currentWeek.weekNumber);
        const newCache = new Map(lootCache);
        newCache.set(selectedFloor, lootData);
        setLootCache(newCache);
      } catch (error) {
        // Silently handle refresh errors
      }
    }
  };

  const handleStartNewWeek = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Start New Week',
      message: 'Are you sure you want to start a new week? This will finalize the current week.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const newWeek = await weekService.startNewWeek();
          setCurrentWeek(newWeek);
          await loadWeekData();
          showToast(`Week ${newWeek.weekNumber} started successfully!`);
        } catch (error: any) {
          showToast(error.message || 'Failed to start new week. Please try again.', 'error');
        }
      },
    });
  };

  const handleWeekChange = async (weekNumber: number) => {
    try {
      await weekService.setCurrentWeek(weekNumber);
      await loadWeekData();
    } catch (error: any) {
      showToast(error.message || 'Failed to change week. Please try again.', 'error');
    }
  };

  if (loading) {
    return <div className="loading">Loading week data...</div>;
  }

  return (
    <div className="loot-distribution-page">
      <div className="page-header">
        <div className="header-top">
          <div>
            <h1>Loot Distribution</h1>
            <p>Select a floor to view available loot and assign items to members</p>
          </div>
          <div className="week-controls">
            <div className="week-selector">
              <label htmlFor="week-select">Week:</label>
              <select
                id="week-select"
                value={currentWeek?.weekNumber ?? ''}
                onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                className="week-select"
              >
                {allWeeks.map(week => (
                  <option key={week.weekNumber} value={week.weekNumber}>
                    {week.weekNumber}
                  </option>
                ))}
              </select>
            </div>
            {canCreateWeek() && (
              <Button 
                variant="contained"
                color="primary"
                onClick={handleStartNewWeek}
              >
                Start New Week
              </Button>
            )}
          </div>
        </div>
      </div>

      <FloorSelector
        selectedFloor={selectedFloor}
        onFloorSelect={handleFloorSelect}
      />

      {selectedFloor && currentWeek && (
        <LootDistributionPanel
          floorNumber={selectedFloor}
          currentWeekNumber={currentWeek.weekNumber}
          onLootAssigned={handleLootAssigned}
          availableLoot={lootCache.has(selectedFloor) ? lootCache.get(selectedFloor)! : undefined}
          members={members.length > 0 ? members : undefined}
        />
      )}

      {!selectedFloor && (
        <div className="select-floor-prompt">
          <p>Please select a floor above to view available loot.</p>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

