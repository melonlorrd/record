/**
 * ============================================================================
 * SYNC INTERFACE PLACEHOLDER (PLANNED FOR FUTURE MULTI-DEVICE / CLOUD SYNC)
 * ============================================================================
 *
 * Current Architecture: Offline-first, on-device only.
 * All entries carry `deviceId`, `updatedAt`, and soft `deleted` boolean flags
 * so that a future CRDT (Conflict-free Replicated Data Type) or Last-Write-Wins (LWW)
 * sync engine can easily merge changes across multiple clients without schema changes.
 */

import { AppData } from '../domain/types';

export interface SyncStatus {
  lastSyncAt: number | null;
  pendingChangesCount: number;
  inFlight: boolean;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  appliedRemoteCount: number;
  pushedLocalCount: number;
  error?: string;
}

export interface SyncEngine {
  getStatus(): SyncStatus;
  sync(localData: AppData): Promise<SyncResult>;
}

/**
 * Empty no-op implementation of SyncEngine for MVP.
 */
export class NoopSyncEngine implements SyncEngine {
  getStatus(): SyncStatus {
    return {
      lastSyncAt: null,
      pendingChangesCount: 0,
      inFlight: false,
      error: null,
    };
  }

  async sync(_localData: AppData): Promise<SyncResult> {
    // Intentionally un-implemented for MVP.
    // Ready to be hooked into WebSockets, Cloudflare Durable Objects, or CouchDB/PouchDB.
    return {
      success: true,
      appliedRemoteCount: 0,
      pushedLocalCount: 0,
    };
  }
}

export const syncEngine = new NoopSyncEngine();
