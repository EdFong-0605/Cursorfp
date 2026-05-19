/**
 * HTTP client for `brain_chat` in `functions/main.py` (OpenAI Chat Completions via server).
 *
 * (External references): URL rules shared with [clientfetch.js] via `getCloudFunctionUrl`.
 */

import {
  getCloudFunctionUrl,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_LOCAL_FIREBASE_PROJECT_ID,
} from './clientfetch';

/** Must match the Python `@https_fn.on_request()` function name `brain_chat`. */
export const BRAIN_CHAT_FUNCTION_NAME = 'brain_chat';

function getBrainChatUrl() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(BRAIN_CHAT_FUNCTION_NAME, projectId, region);
}

/**
 * Sends the full conversation so far (roles: user, assistant, optional system) to the backend.
 *
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ reply: string }>}
 */
export async function postChat(messages) {
  const url = getBrainChatUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = data?.error;
    const msg =
      typeof err === 'string' && err.trim()
        ? err
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  if (typeof data.reply !== 'string') {
    throw new Error('Unexpected response from chat service.');
  }
  return { reply: data.reply };
}
