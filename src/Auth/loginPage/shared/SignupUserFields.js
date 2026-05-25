/**
 * Shared sign-up field blocks used by Createuser and Createfirm.
 */

// (Function meaning): Minimum password length — same rule as [Createuser.js].
export const PASSWORD_MIN_LENGTH = 6;

// (Function meaning): Empty sign-up fields object for a new user row.
export function createEmptySignupUser() {
  return {
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
}

/**
 * @param {{ type: 'hidden', value: string } | { type: 'text' } | { type: 'select', options: string[] }} roleField
 * @returns {string}
 */
function resolveRoleValue(fields, roleField) {
  if (roleField.type === 'hidden') {
    return roleField.value;
  }
  if (roleField.type === 'select') {
    return fields.role?.trim() || '';
  }
  return fields.role?.trim() || '';
}

/**
 * @param {{ firstName?: string, lastName?: string, role?: string, email?: string, password?: string, confirmPassword?: string, firmRole?: string }} fields
 * @param {{ type: 'hidden', value: string } | { type: 'text' } | { type: 'select', options: string[] }} roleField
 * @returns {string | null}
 */
// (Function meaning): Check that all user fields are filled and passwords match before signup.
export function validateSignupUserFields(fields, roleField) {
  if (!fields.firstName?.trim()) {
    return 'Please enter first name.';
  }
  if (!fields.lastName?.trim()) {
    return 'Please enter last name.';
  }
  const roleValue = resolveRoleValue(fields, roleField);
  if (roleField.type === 'select' && !roleValue) {
    return 'Please select a role.';
  }
  if (roleField.type === 'text' && !roleValue) {
    return 'Please enter role.';
  }
  if (!fields.email?.trim()) {
    return 'Please enter email.';
  }
  if (!fields.password) {
    return 'Please enter password.';
  }
  if (fields.password !== fields.confirmPassword) {
    return 'Passwords do not match.';
  }
  if (fields.password.length < PASSWORD_MIN_LENGTH) {
    return `Password should be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

/**
 * @param {{
 *   idPrefix: string,
 *   values: ReturnType<typeof createEmptySignupUser>,
 *   onChange: (patch: Partial<ReturnType<typeof createEmptySignupUser>>) => void,
 *   disabled?: boolean,
 *   roleField: { type: 'hidden', value: string } | { type: 'text' } | { type: 'select', options: string[] },
 *   className?: string,
 * }} props
 */
// (Function meaning): Show first name, last name, role, email, password, and confirm password for sign-up.
function SignupUserFields({
  idPrefix,
  values,
  onChange,
  disabled = false,
  roleField,
  className = '',
}) {
  const rootClass = className ? `signup-user-fields ${className}` : 'signup-user-fields';

  return (
    <div className={rootClass}>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-first-name`}>First name</label>
        <input
          id={`${idPrefix}-first-name`}
          type="text"
          autoComplete="given-name"
          value={values.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-last-name`}>Last name</label>
        <input
          id={`${idPrefix}-last-name`}
          type="text"
          autoComplete="family-name"
          value={values.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      {roleField.type === 'hidden' ? (
        <input type="hidden" value={roleField.value} readOnly />
      ) : (
        <div className="auth-field">
          <label htmlFor={`${idPrefix}-role`}>Role</label>
          {roleField.type === 'select' ? (
            <select
              id={`${idPrefix}-role`}
              value={values.role}
              onChange={(e) => onChange({ role: e.target.value })}
              required
              disabled={disabled}
            >
              <option value="">Select role</option>
              {roleField.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-role`}
              type="text"
              autoComplete="organization-title"
              placeholder="e.g. Advisor, Admin"
              value={values.role}
              onChange={(e) => onChange({ role: e.target.value })}
              required
              disabled={disabled}
            />
          )}
        </div>
      )}
      {roleField.type === 'hidden' ? (
        <div className="auth-field">
          <span className="signup-user-fields__fixed-role">Role: {roleField.value}</span>
        </div>
      ) : null}
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-email`}>Email</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-password`}>Password</label>
        <input
          id={`${idPrefix}-password`}
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => onChange({ password: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-confirm`}>Confirm password</label>
        <input
          id={`${idPrefix}-confirm`}
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => onChange({ confirmPassword: e.target.value })}
          required
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default SignupUserFields;
