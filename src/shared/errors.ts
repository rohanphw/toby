const readableErrors = new Set([
  'Enter an agent name up to 100 characters', 'Agent instructions are too long',
  'Connect the subscription and select an available model first.',
  'Stop this agent before changing its configuration', 'Stop this agent before deleting it',
  'Your first Toby agent cannot be deleted', 'A group needs a name and at least one member',
  'Enter a message up to 100,000 characters', 'Conversation no longer exists',
  'Add an agent to this group first', 'Attachment does not belong to this conversation',
  'Reply must reference this conversation', 'Only stopped or failed work can be continued',
  'Add this agent to the group before assigning work', 'File is too large for text preview',
  'This file is binary. Open it from the workspace.', 'Cannot delegate to yourself',
  'Add the recipient to this group before delegating', 'You are not a member of that group',
  'Use an interval of at least one minute', 'File is already in your workspace',
  'Enter passwords yourself in the browser', 'Enable Toby in Privacy & Security → Accessibility first.',
  'Enable Screen Recording for Toby in Settings first.', 'Screen capture is unavailable',
  'Stop this agent before hiding it', 'Attach up to 20 files at once',
  'Attachments must be files up to 100 MB', 'Attachment is no longer available',
  'Attach up to 20 files per message', 'Set up Toby first', 'Choose 1–8 simultaneous tasks',
  'Enter a memory', 'Enter a name and instructions', 'Enter a name and task',
  'Enter a name and executable path', 'Stop this agent before changing workspace',
  'Toby is resetting. Please wait.', 'Sign in with your ChatGPT subscription.',
  'Sign-in expired. Try again.', 'Grok returned no available models. Refresh after signing in.',
  'Selected Grok model is no longer available. Choose another in agent settings.',
  'Toby requires a ChatGPT subscription sign-in. API-key billing is not supported.',
  'This build currently supports Apple Silicon Macs.',
  'Rename the connector using the reserved Toby name before continuing.',
  'Choose a connector name other than Toby or a Toby-prefixed internal name.',
  'Voice input is not available through your subscription yet.',
  'Voice input is not available through the connected subscriptions yet.',
  'Setup could not finish. Please retry the download.',
  'Sign-in did not complete. Please try again.',
  'Local data could not be cleared. Check access to Toby’s data folder and try again.',
]);

const translatedErrors: [RegExp, string][] = [
  [/^(?:Agent creation|Command|Browser action|Computer action|Scheduling) declined$/, 'You declined this action. Nothing was run.'],
  [/^(?:Task stopped|Interrupted|Provider stopped)$/, 'Stopped. You can continue when you’re ready.'],
  [/ENOENT|no such file|not found/i, 'The requested file or app could not be found. Check that it is still available.'],
  [/EACCES|EPERM|permission denied/i, 'Toby doesn’t have access to this item. Check its permissions and try again.'],
  [/ENOSPC|disk.*full/i, 'Your Mac is out of storage. Free up some space and try again.'],
  [/timed? out|timeout/i, 'This took too long to respond. Please try again.'],
  [/429|rate.?limit|usage.?limit|quota/i, 'Your provider’s usage limit has been reached. Wait a while or choose another connected model.'],
  [/401|unauthori[sz]ed|unauthenticated|authentication|not logged|token.*expired/i, 'Your subscription sign-in needs attention. Reconnect it in Settings.'],
  [/fetch failed|ECONN|ENOTFOUND|network|disconnected|Provider exited/i, 'The connection was interrupted. Check your internet connection and try again.'],
  [/checksum|Unsafe runtime archive/i, 'The downloaded app component could not be verified. Retry the download.'],
  [/Runtime download|Runtime .*size/i, 'The app component could not be downloaded. Please retry setup.'],
  [/Path must stay|Symlink leaves/, 'This file is outside the agent’s workspace. Choose a file inside its workspace.'],
  [/Another task (?:owns|is controlling)/, 'Another task is using this browser or Mac. Try again after it finishes.'],
  [/Unknown (?:agent|recipient|group member)|Agent no longer exists/, 'This teammate is no longer available. Choose another teammate.'],
  [/Element disappeared|Invalid element index/, 'The webpage changed. Ask the agent to check the page again.'],
  [/Invalid |Tool arguments|Unknown (?:Toby tool|tool)|Unsupported provider interaction/, 'The requested action was incomplete or unsupported. Ask the agent to try again.'],
  [/Delegation depth/, 'This task has passed between teammates too many times. Ask for the results collected so far.'],
  [/Write artifacts up to/, 'This file is too large to save in one action. Ask the agent to split it into smaller files.'],
  [/Use an http or https URL|Invalid URL/, 'Enter a complete website address starting with https://.'],
  [/absolute executable path/, 'Choose the full path to the connector’s app or executable.'],
];

/** Only known product copy crosses the error boundary; provider diagnostics stay internal. */
export function publicError(error: unknown, fallback = 'Toby couldn’t complete this action. Please try again.'): string {
  let message = typeof error === 'string' ? error : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : '';
  message = message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '').replace(/^Error:\s*/, '').trim();
  if (readableErrors.has(message) || message === fallback) return message;
  for (const [pattern, copy] of translatedErrors) if (message === copy || pattern.test(message)) return copy;
  return fallback;
}
