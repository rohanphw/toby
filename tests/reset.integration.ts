import { app, dialog, session } from 'electron';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { Store } from '../src/main/store';

// Only use a caller-created temporary fixture. This never opens the user's data.
const root = process.env.TOBY_DATA_DIR!;
assert(root && basename(dirname(root)).startsWith('toby-reset-integration-'));
const completing = process.argv.includes('--complete-reset');
const exit = app.exit.bind(app), quit = app.quit.bind(app);
const timeout = setTimeout(() => { console.error('Reset integration timed out'); exit(1); }, 20_000);
app.exit = () => {}; // Keep the normal smoke exit from ending these additional checks.
process.argv.push('--smoke-test');
delete process.env.ELECTRON_RENDERER_URL;

if (!completing) {
  const store = new Store(root);
  const agent = store.saveAgent({name:'Old Toby',personality:'Old personality',specialization:'Old role',provider:'openai',model:'fixture'});
  store.saveGroup({name:'Old team',instructions:'Old instructions',members:[agent.id]});
  store.addMessage({chatId:agent.id,senderId:'user',role:'user',text:'Old chat',status:'done'});
  const task = store.task({chatId:agent.id,agentId:agent.id,prompt:'Old task'});
  store.put('tasks',{...task,status:'done'});
  for (const table of ['memories','skills','routines','connectors','attachments'] as const) store.put(table,{id:'fixture',name:'Old item',agentId:agent.id,enabled:false});
  store.setPreferences({onboardingComplete:true,autoCreateAgents:true,maxConcurrency:7});
  store.close();
  for (const name of ['runtimes','provider-probes','voice-models']) { await mkdir(join(root,name)); await writeFile(join(root,name,'old'),'old data'); }
  await writeFile(join(dirname(root),'keep-external.txt'),'external data');
}

app.on('browser-window-created', (_event, window) => {
  window.webContents.once('did-finish-load', () => { void (async () => {
    try {
      if (completing) {
        const snapshot = await window.webContents.executeJavaScript('window.toby.snapshot()');
        for (const key of ['agents','groups','messages','tasks','routines','skills','memories','connectors','approvals']) assert.equal(snapshot[key].length,0,key);
        assert.equal(snapshot.preferences.onboardingComplete,false); assert.equal(snapshot.preferences.autoCreateAgents,false); assert.equal(snapshot.preferences.maxConcurrency,3);
        assert.equal(await window.webContents.executeJavaScript('localStorage.getItem("reset-fixture")'),null);
        assert.equal(await window.webContents.executeJavaScript('document.querySelector("input[aria-label=Personality]")?.value'),'');
        for (const current of [session.defaultSession,session.fromPartition('persist:toby-browser')]) assert.deepEqual(await current.cookies.get({}),[]);
        for (const name of ['reset-pending','workspaces','runtimes','provider-probes','voice-models']) assert.equal(existsSync(join(root,name)),false,name);
        assert.equal(await readFile(join(dirname(root),'keep-external.txt'),'utf8'),'external data');
        console.log('RESET_RESTART_PASS: fresh SQLite, preferences, drafts, browser sessions and onboarding; external file preserved');
      } else {
        for (const current of [session.defaultSession,session.fromPartition('persist:toby-browser')]) {
          await current.cookies.set({url:'https://reset-fixture.example',name:'reset-fixture',value:'old session'}); await current.cookies.flushStore();
        }
        await window.webContents.executeJavaScript('localStorage.setItem("reset-fixture","old draft");localStorage.setItem("toby:first-profile",JSON.stringify({personality:"Old personality"}))');
        let response = 0, confirmations = 0, relaunched = false, quitting = false;
        dialog.showMessageBox = (async (_window: unknown, options: {defaultId:number;cancelId:number}) => { confirmations++; assert.equal(options.defaultId,0);assert.equal(options.cancelId,0);return {response,checkboxChecked:false}; }) as typeof dialog.showMessageBox;
        app.relaunch = () => { relaunched = true; }; app.quit = () => { quitting = true; };
        assert.equal(await window.webContents.executeJavaScript('window.toby.resetApp()'),false);
        assert.equal(existsSync(join(root,'reset-pending')),false); assert.equal(relaunched,false);
        const snapshot = await window.webContents.executeJavaScript('window.toby.snapshot()');assert.equal(snapshot.agents.length,1);assert.equal(snapshot.preferences.maxConcurrency,7);
        response = 1;
        assert.equal(await window.webContents.executeJavaScript('window.toby.resetApp()'),true);
        assert.equal(confirmations,2); assert.equal(relaunched,true);assert.equal(quitting,true);assert.equal(existsSync(join(root,'reset-pending')),true);
        await assert.rejects(() => window.webContents.executeJavaScript('window.toby.snapshot()'),/resetting/);
        console.log('RESET_CONFIRMATION_PASS: Cancel preserves data; Confirm queues reset, stops services, relaunches and blocks further writes');
      }
      clearTimeout(timeout); quit();
    } catch(error) { console.error(error); exit(1); }
  })(); });
});

await import(new URL('../out/main/index.js', import.meta.url).href);
