import type { PermissionCategory } from './contracts';

export const PERMISSION_LABELS: Record<PermissionCategory, string> = {
  terminal: 'terminal commands', browser: 'browser interactions', computer: 'Mac actions',
  files: 'file changes', network: 'network access', connectors: 'connected app actions',
  agents: 'specialist creation', routines: 'recurring work',
};
export const PERMISSION_CATEGORIES = Object.keys(PERMISSION_LABELS) as PermissionCategory[];
