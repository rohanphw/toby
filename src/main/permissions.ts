import { desktopCapturer, shell, systemPreferences } from 'electron';
import type { PermissionState } from '../shared/contracts';
type Kind = 'microphone'|'accessibility'|'screen';
export function getPermissions(): PermissionState {
  return {microphone:systemPreferences.getMediaAccessStatus('microphone'),accessibility:systemPreferences.isTrustedAccessibilityClient(false),screen:systemPreferences.getMediaAccessStatus('screen')};
}
export async function requestPermission(kind: Kind): Promise<PermissionState> {
  if (kind === 'microphone') await systemPreferences.askForMediaAccess('microphone');
  else if (kind === 'accessibility') systemPreferences.isTrustedAccessibilityClient(true);
  else {
    // This explicit user action initiates TCC screen capture consent; no image is retained.
    await desktopCapturer.getSources({ types:['screen'], thumbnailSize:{width:0,height:0}, fetchWindowIcons:false });
  }
  return getPermissions();
}
export async function openPermissionSettings(kind: Kind) {
  const panel = {microphone:'Microphone',accessibility:'Accessibility',screen:'ScreenCapture'}[kind];
  await shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?Privacy_${panel}`);
}
