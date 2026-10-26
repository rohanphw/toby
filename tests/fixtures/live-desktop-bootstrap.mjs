import {app} from 'electron';
// Exercise the production main/preload/renderer with an isolated profile and no visible windows.
if(!process.env.TOBY_DATA_DIR)throw Error('An isolated profile is required');
app.setPath('userData',process.env.TOBY_DATA_DIR);
app.commandLine.appendSwitch('remote-debugging-port','0');
app.on('browser-window-created',(_event,window)=>window.on('show',()=>window.hide()));
void app.whenReady().then(()=>app.dock?.hide());
await import('../../out/main/index.js');
process.on('SIGTERM',()=>app.quit());
process.on('SIGINT',()=>app.quit());
