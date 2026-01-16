import React, { useState, useEffect, useCallback } from 'react';
import { Member, SpecType } from '../types/member';
import { memberService } from '../services/api/memberService';
import { BiSMatrix } from '../components/BiSMatrix';
import { ExtraLootMatrix } from '../components/ExtraLootMatrix';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SpecTag, Tag, TagType } from '../components/Tag';
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

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      showToast('Failed to load members. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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

          {activeView === 'extra' ? (
            <ExtraLootMatrix members={members} />
          ) : (
            <>
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

              <div className="spec-section">
                <BiSMatrix members={members} onUpdate={loadMembers} specType={activeView} />
              </div>
            </>
          )}
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

