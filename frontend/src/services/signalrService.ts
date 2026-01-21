import * as signalR from '@microsoft/signalr';
import { GearSlot, SpecType } from '../types/member';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * SignalR connection service for real-time updates
 */
class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;

  /**
   * Establishes connection to SignalR hub
   */
  async start(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/updates`)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
              return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            }
            return null;
          },
        })
        .build();

      // Handle reconnection events
      this.connection.onreconnecting(() => {
        console.log('SignalR: Reconnecting...');
      });

      this.connection.onreconnected(() => {
        console.log('SignalR: Reconnected');
        this.reconnectAttempts = 0;
      });

      this.connection.onclose((error) => {
        console.log('SignalR: Connection closed', error);
        this.isConnecting = false;
      });

      await this.connection.start();
      console.log('SignalR: Connected');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('SignalR: Failed to start connection', error);
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Stops the SignalR connection
   */
  async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /**
   * Registers a callback for BiS item updates
   */
  onBiSItemUpdate(callback: (memberId: string, slot: GearSlot, isAcquired: boolean, specType: SpecType) => void): void {
    if (!this.connection) {
      console.warn('SignalR: Connection not established. Call start() first.');
      return;
    }

    this.connection.on('BiSItemUpdated', (data: { memberId: string; slot: number; isAcquired: boolean; specType: number }) => {
      callback(data.memberId, data.slot as GearSlot, data.isAcquired, data.specType as SpecType);
    });
  }

  /**
   * Registers a callback for upgrade material updates
   */
  onUpgradeMaterialUpdate(callback: (memberId: string, slot: GearSlot, upgradeMaterialAcquired: boolean, specType: SpecType) => void): void {
    if (!this.connection) {
      console.warn('SignalR: Connection not established. Call start() first.');
      return;
    }

    this.connection.on('UpgradeMaterialUpdated', (data: { memberId: string; slot: number; upgradeMaterialAcquired: boolean; specType: number }) => {
      callback(data.memberId, data.slot as GearSlot, data.upgradeMaterialAcquired, data.specType as SpecType);
    });
  }

  /**
   * Registers a callback for loot assignment updates
   */
  onLootAssigned(callback: (floorNumber: number, weekNumber: number | null) => void): void {
    if (!this.connection) {
      console.warn('SignalR: Connection not established. Call start() first.');
      return;
    }

    this.connection.on('LootAssigned', (data: { floorNumber: number; weekNumber: number | null }) => {
      callback(data.floorNumber, data.weekNumber);
    });
  }

  /**
   * Registers a callback for loot undone updates
   */
  onLootUndone(callback: (floorNumber: number, weekNumber: number | null) => void): void {
    if (!this.connection) {
      console.warn('SignalR: Connection not established. Call start() first.');
      return;
    }

    this.connection.on('LootUndone', (data: { floorNumber: number; weekNumber: number | null }) => {
      callback(data.floorNumber, data.weekNumber);
    });
  }

  /**
   * Removes all event handlers
   */
  off(eventName: string): void {
    if (this.connection) {
      this.connection.off(eventName);
    }
  }

  /**
   * Gets the current connection state
   */
  getState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}

export const signalRService = new SignalRService();
