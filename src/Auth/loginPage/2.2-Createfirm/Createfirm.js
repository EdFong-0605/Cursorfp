/**
 * Firm setup screen: collect firm details, define roles, and create users.
 */
import { useState } from 'react';
import './Createfirm.css';
import '../../authShared.css';
import { FIRM_TYPES, TEAM_SIZES, TIMEZONES, FIRM_ACCESS_LEVELS, DEFAULT_FIRM_ACCESS } from './createfirmConstants';
import SignupUserFields, {
  createEmptySignupUser,
  validateSignupUserFields,
} from '../shared/SignupUserFields';
import { runFirmSetup } from '../../Events/firmSetupService';
import { useAuth } from '../../Events/AuthContext';

const ADMIN_ROLE_FIELD = { type: 'hidden', value: 'admin' };

// (Function meaning): One row in the firm roles chart — unique id, role name, and firm access level.
function createFirmRoleRow(name = '', firmAccess = DEFAULT_FIRM_ACCESS) {
  return {
    id: crypto.randomUUID(),
    name,
    firmAccess,
  };
}

// (Function meaning): Collect unique role names from the chart for dropdowns and validation.
function getFirmRoleNameList(firmRoles) {
  const seen = new Set();
  const names = [];
  for (const row of firmRoles) {
    const trimmed = row.name.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(trimmed);
  }
  return names;
}

// (Function meaning): Return true if two rows share the same role name (ignoring case).
function hasDuplicateRoleNames(firmRoles) {
  const seen = new Set();
  for (const row of firmRoles) {
    const trimmed = row.name.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}

// (Function meaning): Prepare firm roles for MongoDB — trim names, valid access, dedupe by name.
function normalizeFirmRolesForSave(firmRoles) {
  const seen = new Set();
  const result = [];
  for (const row of firmRoles) {
    const name = row.name.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const access = FIRM_ACCESS_LEVELS.some((l) => l.value === row.firmAccess)
      ? row.firmAccess
      : DEFAULT_FIRM_ACCESS;
    result.push({ name, firmAccess: access });
  }
  return result;
}

function createAdditionalUserRow() {
  return {
    id: crypto.randomUUID(),
    ...createEmptySignupUser(),
  };
}

// (Function meaning): Build the object we send to `save_firm` when the form passes validation.
function buildFirmPayload(form, firmRoles, additionalUsers) {
  const normalizedRoles = normalizeFirmRolesForSave(firmRoles);

  return {
    firmName: form.firmName.trim(),
    firmType: form.firmType,
    firmTypeOther: form.firmType === 'other' ? form.firmTypeOther.trim() : '',
    legalName: form.legalName.trim(),
    ein: form.ein.trim(),
    phone: form.phone.trim(),
    website: form.website.trim(),
    addressLine1: form.addressLine1.trim(),
    city: form.city.trim(),
    state: form.addressState.trim(),
    postalCode: form.postalCode.trim(),
    country: form.country.trim() || 'US',
    teamSize: form.teamSize,
    timezone: form.timezone,
    firmRoles: normalizedRoles,
    creatorFirmRole: 'firm_admin',
    adminAcknowledged: form.adminAcknowledged,
  };
}

// (Function meaning): Form where a new firm is saved, users are created, and Firm Admin is signed in at the end.
function Createfirm({ onBack }) {
  const { setFirmSetupInProgress } = useAuth();
  const [firmName, setFirmName] = useState('');
  const [firmType, setFirmType] = useState('');
  const [firmTypeOther, setFirmTypeOther] = useState('');
  const [legalName, setLegalName] = useState('');
  const [ein, setEin] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [teamSize, setTeamSize] = useState('');
  const [timezone, setTimezone] = useState('');
  const [adminAcknowledged, setAdminAcknowledged] = useState(false);
  const [firmRoles, setFirmRoles] = useState([]);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleInputError, setRoleInputError] = useState('');
  const [firmAdmin, setFirmAdmin] = useState(createEmptySignupUser);
  const [additionalUsers, setAdditionalUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const showFirmTypeOther = firmType === 'other';
  const firmRoleNameList = getFirmRoleNameList(firmRoles);
  const canAddUser = firmRoleNameList.length > 0;

  // (Function meaning): Add a new row to the firm roles chart.
  const addFirmRole = () => {
    setRoleInputError('');
    const trimmed = roleNameInput.trim();
    if (!trimmed) {
      setRoleInputError('Enter a role name.');
      return;
    }
    if (firmRoleNameList.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setRoleInputError('That role already exists.');
      return;
    }
    setFirmRoles((prev) => [...prev, createFirmRoleRow(trimmed, DEFAULT_FIRM_ACCESS)]);
    setRoleNameInput('');
  };

  // (Function meaning): Update one row in the firm roles chart (name or firm access).
  const updateFirmRole = (id, patch) => {
    setFirmRoles((prev) => {
      const existing = prev.find((r) => r.id === id);
      if (existing && patch.name !== undefined && patch.name !== existing.name) {
        setAdditionalUsers((users) =>
          users.map((u) => (u.role === existing.name ? { ...u, role: patch.name } : u)),
        );
      }
      return prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
    });
  };

  // (Function meaning): Remove a role row and clear it from any additional user rows that used it.
  const removeFirmRole = (id) => {
    setFirmRoles((prev) => {
      const removed = prev.find((r) => r.id === id);
      if (removed) {
        setAdditionalUsers((users) =>
          users.map((u) => (u.role === removed.name ? { ...u, role: '' } : u)),
        );
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  // (Function meaning): Append a blank additional-user row.
  const addAdditionalUser = () => {
    if (!canAddUser) {
      return;
    }
    setAdditionalUsers((prev) => [...prev, createAdditionalUserRow()]);
  };

  const updateAdditionalUser = (id, patch) => {
    setAdditionalUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    );
  };

  const removeAdditionalUser = (id) => {
    setAdditionalUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // (Function meaning): Check firm fields, roles, Firm Admin, optional users, then run save → verify → signups.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!firmName.trim()) {
      setError('Please enter your firm name.');
      return;
    }
    if (!firmType) {
      setError('Please select a firm type.');
      return;
    }
    if (firmType === 'other' && !firmTypeOther.trim()) {
      setError('Please describe your firm type when you select Other.');
      return;
    }
    if (!adminAcknowledged) {
      setError('Please confirm that you understand this firm must have at least one Firm Admin.');
      return;
    }

    if (firmRoles.some((r) => !r.name.trim())) {
      setError('Each firm role must have a name. Remove empty rows or fill in the role name.');
      return;
    }
    if (hasDuplicateRoleNames(firmRoles)) {
      setError('Firm role names must be unique.');
      return;
    }

    const adminValidation = validateSignupUserFields(firmAdmin, ADMIN_ROLE_FIELD);
    if (adminValidation) {
      setError(`Firm Admin: ${adminValidation}`);
      return;
    }

    const roleSelectField = { type: 'select', options: firmRoleNameList };
    for (let i = 0; i < additionalUsers.length; i += 1) {
      const u = additionalUsers[i];
      const msg = validateSignupUserFields(u, roleSelectField);
      if (msg) {
        setError(`Additional user ${i + 1}: ${msg}`);
        return;
      }
      if (!firmRoleNameList.includes(u.role.trim())) {
        setError(`Additional user ${i + 1}: Please select a valid firm role.`);
        return;
      }
    }

    const seenEmails = new Set();
    const adminEmailKey = firmAdmin.email.trim().toLowerCase();
    seenEmails.add(adminEmailKey);
    for (let i = 0; i < additionalUsers.length; i += 1) {
      const emailKey = additionalUsers[i].email.trim().toLowerCase();
      if (seenEmails.has(emailKey)) {
        setError(
          `Additional user ${i + 1}: That email is already used for another account on this form.`,
        );
        return;
      }
      seenEmails.add(emailKey);
    }

    const form = {
      firmName,
      firmType,
      firmTypeOther,
      legalName,
      ein,
      phone,
      website,
      addressLine1,
      city,
      addressState,
      postalCode,
      country,
      teamSize,
      timezone,
      adminAcknowledged,
    };
    const firmPayload = buildFirmPayload(form, firmRoles, additionalUsers);

    setBusy(true);
    setFirmSetupInProgress(true);
    try {
      await runFirmSetup({ firmPayload, firmAdmin, additionalUsers });
      setFirmSetupInProgress(false);
    } catch (err) {
      setError(err?.message || 'Something went wrong during firm setup.');
      setFirmSetupInProgress(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page createfirm-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Set up your firm</h1>
        <p className="auth-card__subtitle">
          Define your firm&apos;s roles, create your Firm Admin account, and optionally add team
          members now.
        </p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <fieldset className="createfirm-fieldset">
            <legend className="createfirm-fieldset__legend">Firm details</legend>
            <div className="auth-field">
              <label htmlFor="createfirm-name">Firm name</label>
              <input
                id="createfirm-name"
                type="text"
                autoComplete="organization"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-type">Type of firm</label>
              <select
                id="createfirm-type"
                value={firmType}
                onChange={(e) => setFirmType(e.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select firm type</option>
                {FIRM_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {showFirmTypeOther ? (
              <div className="auth-field">
                <label htmlFor="createfirm-type-other">Describe your firm type</label>
                <input
                  id="createfirm-type-other"
                  type="text"
                  value={firmTypeOther}
                  onChange={(e) => setFirmTypeOther(e.target.value)}
                  disabled={busy}
                />
              </div>
            ) : null}
            <div className="auth-field">
              <label htmlFor="createfirm-legal-name">Legal name (optional)</label>
              <input
                id="createfirm-legal-name"
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-ein">EIN / Tax ID (optional)</label>
              <input
                id="createfirm-ein"
                type="text"
                autoComplete="off"
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-phone">Phone (optional)</label>
              <input
                id="createfirm-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-website">Website (optional)</label>
              <input
                id="createfirm-website"
                type="url"
                autoComplete="url"
                placeholder="https://"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={busy}
              />
            </div>
          </fieldset>

          <fieldset className="createfirm-fieldset">
            <legend className="createfirm-fieldset__legend">Location (optional)</legend>
            <div className="auth-field">
              <label htmlFor="createfirm-address">Street address</label>
              <input
                id="createfirm-address"
                type="text"
                autoComplete="street-address"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-city">City</label>
              <input
                id="createfirm-city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-state">State / Province</label>
              <input
                id="createfirm-state"
                type="text"
                autoComplete="address-level1"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-postal">Postal code</label>
              <input
                id="createfirm-postal"
                type="text"
                autoComplete="postal-code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-country">Country</label>
              <input
                id="createfirm-country"
                type="text"
                autoComplete="country-name"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={busy}
              />
            </div>
          </fieldset>

          <fieldset className="createfirm-fieldset">
            <legend className="createfirm-fieldset__legend">Team</legend>
            <div className="auth-field">
              <label htmlFor="createfirm-team-size">Team size</label>
              <select
                id="createfirm-team-size"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                disabled={busy}
              >
                {TEAM_SIZES.map((opt) => (
                  <option key={opt.value || 'empty'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="createfirm-timezone">Timezone</label>
              <select
                id="createfirm-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={busy}
              >
                {TIMEZONES.map((opt) => (
                  <option key={opt.value || 'empty-tz'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="createfirm-fieldset">
            <legend className="createfirm-fieldset__legend">Firm roles</legend>
            <p className="createfirm-roles-intro">
              Add role names for your firm, then set each role&apos;s firm access level in the chart
              below. Team members you add later will pick from these roles.
            </p>
            <div className="createfirm-add-role-row">
              <div className="auth-field createfirm-add-role-row__input">
                <label htmlFor="createfirm-role-name">Role name</label>
                <input
                  id="createfirm-role-name"
                  type="text"
                  value={roleNameInput}
                  onChange={(e) => {
                    setRoleNameInput(e.target.value);
                    setRoleInputError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFirmRole();
                    }
                  }}
                  placeholder="e.g. Advisor"
                  disabled={busy}
                />
              </div>
              <button
                type="button"
                className="auth-btn auth-btn--ghost createfirm-add-role-row__btn"
                onClick={addFirmRole}
                disabled={busy}
              >
                Add role
              </button>
            </div>
            {roleInputError ? (
              <p className="createfirm-inline-error" role="alert">
                {roleInputError}
              </p>
            ) : null}
            {firmRoles.length > 0 ? (
              <div className="createfirm-roles-table-wrap">
                <table className="createfirm-roles-table" aria-label="Firm roles and access">
                  <thead>
                    <tr>
                      <th scope="col">Role name</th>
                      <th scope="col">Firm access</th>
                      <th scope="col">
                        <span className="createfirm-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmRoles.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <label htmlFor={`createfirm-role-name-${row.id}`} className="createfirm-sr-only">
                            Role name
                          </label>
                          <input
                            id={`createfirm-role-name-${row.id}`}
                            type="text"
                            className="createfirm-roles-table__input"
                            value={row.name}
                            onChange={(e) => updateFirmRole(row.id, { name: e.target.value })}
                            disabled={busy}
                          />
                        </td>
                        <td>
                          <label htmlFor={`createfirm-role-access-${row.id}`} className="createfirm-sr-only">
                            Firm access
                          </label>
                          <select
                            id={`createfirm-role-access-${row.id}`}
                            className="createfirm-roles-table__select"
                            value={row.firmAccess}
                            onChange={(e) => updateFirmRole(row.id, { firmAccess: e.target.value })}
                            disabled={busy}
                          >
                            {FIRM_ACCESS_LEVELS.map((level) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="createfirm-roles-table__actions">
                          <button
                            type="button"
                            className="auth-link createfirm-roles-table__remove"
                            onClick={() => removeFirmRole(row.id)}
                            disabled={busy}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="createfirm-hint">No roles added yet. Add at least one to invite team members.</p>
            )}
          </fieldset>

          <fieldset className="createfirm-fieldset">
            <legend className="createfirm-fieldset__legend">Firm Admin</legend>
            <p className="createfirm-roles-intro">
              Required. This account will have the <strong>admin</strong> role and full firm access.
            </p>
            <div className="createfirm-role-panel createfirm-role-panel--required">
              <SignupUserFields
                idPrefix="createfirm-admin"
                values={firmAdmin}
                onChange={(patch) => setFirmAdmin((prev) => ({ ...prev, ...patch }))}
                disabled={busy}
                roleField={ADMIN_ROLE_FIELD}
                className="createfirm-role-user-fields"
              />
            </div>

            <div className="createfirm-add-users-block">
              <h3 className="createfirm-add-users-block__title">Additional users (optional)</h3>
              <p className="createfirm-roles-intro">
                Create accounts for team members now, or skip and add them later.
              </p>
              {additionalUsers.map((userRow, index) => (
                <div key={userRow.id} className="createfirm-role-panel">
                  <div className="createfirm-role-panel__header">
                    <span className="createfirm-role-panel__title">User {index + 1}</span>
                    <button
                      type="button"
                      className="auth-link createfirm-remove-user"
                      onClick={() => removeAdditionalUser(userRow.id)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                  <SignupUserFields
                    idPrefix={`createfirm-user-${userRow.id}`}
                    values={userRow}
                    onChange={(patch) => updateAdditionalUser(userRow.id, patch)}
                    disabled={busy}
                    roleField={{ type: 'select', options: firmRoleNameList }}
                    className="createfirm-role-user-fields"
                  />
                </div>
              ))}
              {!canAddUser ? (
                <p className="createfirm-hint">Add at least one firm role above before adding users.</p>
              ) : null}
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                onClick={addAdditionalUser}
                disabled={busy || !canAddUser}
              >
                Add user
              </button>
            </div>

            <div className="createfirm-checkbox-row">
              <input
                id="createfirm-admin-ack"
                type="checkbox"
                checked={adminAcknowledged}
                onChange={(e) => setAdminAcknowledged(e.target.checked)}
                disabled={busy}
              />
              <label htmlFor="createfirm-admin-ack">
                I understand this firm must have at least one Firm Admin, and I will create
                the first Firm Admin account above.
              </label>
            </div>
          </fieldset>

          <button type="submit" className="auth-btn auth-btn--primary" disabled={busy}>
            {busy ? 'Creating firm…' : 'Create firm'}
          </button>
        </form>

        {onBack ? (
          <p className="auth-footer">
            <button type="button" className="auth-link" onClick={onBack} disabled={busy}>
              Back
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default Createfirm;
