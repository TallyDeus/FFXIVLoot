import React, { useState, useEffect } from 'react';
import { Member, SpecType } from '../types/member';
import { memberService } from '../services/api/memberService';
import { BiSMatrix } from '../components/BiSMatrix';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SpecTag, Tag, TagType } from '../components/Tag';
import './BiSTrackerPage.css';

/**
 * Page for tracking best-in-slot progress for all members
 */
export const BiSTrackerPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (error) {
      showToast('Failed to load members. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="bis-matrix-legend">
            <div className="legend-item">
              <Tag type={TagType.ItemRaid} variant="badge" />
              <span>Raid</span>
            </div>
            <div className="legend-item">
              <Tag type={TagType.ItemAugTome} variant="badge" />
              <span>Aug Tome</span>
            </div>
            <div className="legend-item">
              <Tag type={TagType.ItemUpgradeMaterial} variant="badge" />
              <span>Upgrade Material</span>
            </div>
          </div>

          <div className="spec-section">
            <h2 className="spec-header">
              <SpecTag specType={SpecType.MainSpec} />
            </h2>
            <BiSMatrix members={members} onUpdate={loadMembers} specType="main" />
          </div>
          
          <div className="spec-section">
            <h2 className="spec-header">
              <SpecTag specType={SpecType.OffSpec} />
            </h2>
            <BiSMatrix members={members} onUpdate={loadMembers} specType="off" />
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

