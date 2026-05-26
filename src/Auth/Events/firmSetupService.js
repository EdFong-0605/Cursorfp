/**
 * Orchestrates firm save → verify → multi-user signup → sign in as Firm Admin.
 */

import { saveFirm, verifyFirm } from '../API/firmApi';
import {
  getAuthErrorMessage,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from './authService';

/**
 * @param {{
 *   firmPayload: Record<string, unknown>,
 *   firmAdmin: { email?: string, password?: string, firstName?: string, lastName?: string },
 *   additionalUsers: Array<{ email?: string, password?: string, firstName?: string, lastName?: string, role?: string }>,
 * }} params
 */
// (Function meaning): Save firm, verify in DB, create Firm Admin + additional users (sign out after each), then sign in as Firm Admin.
export async function runFirmSetup({ firmPayload, firmAdmin, additionalUsers }) {
  let firmId;
  try {
    const result = await saveFirm(firmPayload);
    firmId = result?.firmId;
    if (!firmId) {
      throw new Error('Server did not return a firm id.');
    }
  } catch (err) {
    const e = new Error(err?.message || 'Could not save firm.');
    e.step = 'firm-save';
    throw e;
  }

  try {
    await verifyFirm(firmId);
  } catch (err) {
    const message =
      err?.code === 'firm/not-found'
        ? 'Firm could not be verified in the database. User accounts were not created.'
        : err?.message || 'Firm verification failed.';
    const e = new Error(message);
    e.step = 'firm-verify';
    throw e;
  }

  const adminEmail = firmAdmin?.email?.trim() || '';
  const adminPassword = firmAdmin?.password || '';

  // (Function meaning): Create team members first, Firm Admin last so the final sign-in is always the admin session.
  const usersToCreate = [
    ...additionalUsers.map((u) => ({
      firmRole: u.role.trim(),
      email: u.email.trim(),
      password: u.password,
      firstName: u.firstName,
      lastName: u.lastName,
    })),
    {
      firmRole: 'firm_admin',
      email: adminEmail,
      password: adminPassword,
      firstName: firmAdmin.firstName,
      lastName: firmAdmin.lastName,
    },
  ];
 
  const additionalCount = additionalUsers.length;
  let created = 0;
  for (const u of usersToCreate) {
    created += 1;
    const isAdditional = created <= additionalCount;
    const userLabel = isAdditional
      ? `Additional user ${created} (${u.email})`
      : `Firm Admin (${u.email})`;
    try {
      await signUpWithEmail(u.email, u.password, {
        firstName: u.firstName.trim(),
        lastName: u.lastName.trim(),
        firmId,
        firmRole: u.firmRole,
      });
      await signOutUser();
    } catch (err) {
      const reason =
        err?.code === 'profile/save-failed'
          ? 'profile could not be saved to the database'
          : getAuthErrorMessage(err);
      const e = new Error(
        `Could not create account for ${userLabel}: ${reason}. The email may already exist in the database.`,
      );
      e.step = 'user-create';
      throw e;
    }
  }

  const adminUser = await signInWithEmail(adminEmail, adminPassword);
  // (Function meaning): Force a fresh ID token so [AuthContext.js] `checkFirmAdmin` does not get 401 right after firm setup sign-in.
  await adminUser.getIdToken(true);
  return adminUser;
}
