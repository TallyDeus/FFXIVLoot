import * as signalR from '@microsoft/signalr';
import { GearSlot, SpecType } from '../types/member';
import { devLog, devWarn } from '../utils/devLog';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * SignalR connection service for real-time updates
 */
class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;
  private maxReconnectAttempts = 10;

  /** Multiple components can subscribe; one hub handler dispatches to all. */
  private readonly scheduleUpdatedCallbacks = new Set<() => void>();
  private scheduleUpdatedMulticastWired = false;

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
        devLog('SignalR: Reconnecting...');
      });

      this.connection.onreconnected(() => {
        devLog('SignalR: Reconnected');
      });

      this.connection.onclose((error) => {
        devLog('SignalR: Connection closed', error);
        this.isConnecting = false;
      });

      await this.connection.start();
      devLog('SignalR: Connected');
      this.wireScheduleUpdatedMulticast();
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
    this.scheduleUpdatedMulticastWired = false;
  }

  /**
   * Registers a callback for BiS item updates
   */
  onBiSItemUpdate(callback: (memberId: string, slot: GearSlot, isAcquired: boolean, specType: SpecType) => void): void {
    if (!this.connection) {
      devWarn('SignalR: Connection not established. Call start() first.');
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
      devWarn('SignalR: Connection not established. Call start() first.');
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
      devWarn('SignalR: Connection not established. Call start() first.');
      return;
    }

    this.connection.on('LootAssigned', (data: { floorNumber: number; weekNumber: number | null }) => {
      callback(data.floorNumber, data.weekNumber);
    });
  }

  /**
   * Registers a callback when raid schedule (availability or standard days) changes.
   * Use {@link offScheduleUpdated} with the same function reference on cleanup.
   */
  onScheduleUpdated(callback: () => void): void {
    this.scheduleUpdatedCallbacks.add(callback);
    this.wireScheduleUpdatedMulticast();
  }

  offScheduleUpdated(callback: () => void): void {
    this.scheduleUpdatedCallbacks.delete(callback);
  }

  private wireScheduleUpdatedMulticast(): void {
    if (!this.connection || this.scheduleUpdatedMulticastWired) {
      return;
    }

    this.connection.on('ScheduleUpdated', () => {
      this.scheduleUpdatedCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error('SignalR: ScheduleUpdated callback error', e);
        }
      });
    });
    this.scheduleUpdatedMulticastWired = true;
  }

  /**
   * Registers a callback for loot undone updates
   */
  onLootUndone(callback: (floorNumber: number, weekNumber: number | null) => void): void {
    if (!this.connection) {
      devWarn('SignalR: Connection not established. Call start() first.');
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
