import { ensureStaffAccount, loadSessionBundle } from './sessionStorage';
import type { StaffRole } from './sessionStorage';
import { startupMark } from './startupTiming';

export type EarlySession = {
  loggedIn: boolean;
  staffId: string;
  nickname: string;
  role: StaffRole | '';
  pin: string;
};

/**
 * Start session I/O as soon as the JS bundle evaluates — parallel with React mount.
 * Import this module from index.ts before registerRootComponent.
 */
export const earlySessionPromise: Promise<EarlySession> = (async () => {
  startupMark('early_session_start');
  await ensureStaffAccount();
  const session = await loadSessionBundle();
  startupMark('early_session_done');
  return session;
})();
