/**
 * Dropdown and role-list data for the Create Firm screen (easy to update in one place).
 */

// (Function meaning): Each item is one choice in the "Type of firm" dropdown — `value` is what we send to the API later, `label` is what the user reads.
export const FIRM_TYPES = [
  { value: 'ria', label: 'Registered Investment Advisor (RIA)' },
  { value: 'broker_dealer', label: 'Broker-Dealer' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'cpa_tax', label: 'CPA / Tax Advisory' },
  { value: 'insurance', label: 'Insurance Agency' },
  { value: 'bank_trust', label: 'Bank / Trust' },
  { value: 'other', label: 'Other' },
];

// (Function meaning): Each item is one choice in the "Team size" dropdown — `value` is the band stored on the firm record.
export const TEAM_SIZES = [
  { value: '', label: 'Select team size (optional)' },
  { value: 'solo', label: 'Just me' },
  { value: '2-5', label: '2–5 people' },
  { value: '6-20', label: '6–20 people' },
  { value: '21+', label: '21 or more' },
];

// (Function meaning): Each item is one choice in the "Timezone" dropdown — `value` is an IANA timezone id (e.g. America/New_York).
export const TIMEZONES = [
  { value: '', label: 'Select timezone (optional)' },
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (America/Phoenix)' },
  { value: 'America/Anchorage', label: 'Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Pacific/Honolulu)' },
  { value: 'UTC', label: 'UTC' },
];

// (Function meaning): Each item is one choice in the "Firm access" column when defining firm roles — `value` is stored on the firm record, `label` is what the user reads.
export const FIRM_ACCESS_LEVELS = [
  { value: 'full', label: 'Full access' },
  { value: 'standard', label: 'Standard access' },
  { value: 'read_only', label: 'Read-only' },
];

export const DEFAULT_FIRM_ACCESS = 'standard';
