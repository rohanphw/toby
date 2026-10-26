import { createSignal, createMemo, createEffect, untrack, onMount, onCleanup, For, Show } from 'solid-js';
import { Switch } from '@kobalte/core/switch';
import { createStore, reconcile } from 'solid-js/store';
import { ArrowDown, ArrowUp, Check, ChevronRight, Clock3, Download, ExternalLink, FileText, Folder, FolderOpen, MoreHorizontal, PanelLeftOpen, PanelRight, Paperclip, Pin, Plus, RefreshCw, Reply, Search, Send, Square, UserRound, Users, X, CircleAlert } from 'lucide-solid';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { IconButton, EditorDialog } from './components/Ui';
import { MessageBody } from './components/MessageBody';
import { MessageActions } from './components/MessageActions';
import { MessageAttachments } from './components/MessageAttachments';
import { ActivityGroup, ApprovalCard, WorkingIndicator } from './components/Activity';
import { AccessSettings } from './components/AccessSettings';
import { GroupMemoryPanel } from './components/GroupMemory';
import type { Agent, AgentInput, Attachment, Group, Provider, Snapshot, PermissionMode } from '../shared/contracts';
import { publicError } from '../shared/errors';
import { AGENT_AVATARS, agentAvatar } from '../shared/avatar';
import { messageText, taskSummary } from '../shared/activity';
import { conversationRows, publicMessage, publicSnapshot, type ConversationRow } from '../shared/conversation';
import { conversationLayout } from '../shared/conversation-layout';
import logo from '../../resources/toby.png';
import openaiLogo from './assets/openai-white.svg';
import grokLogo from './assets/grok-white.svg';

type Panel = 'activity' | 'files' | 'memory' | 'skills' | 'routines' | 'connectors' | 'settings';
type Editor = { kind: 'agent'; agent?: Agent } | { kind: 'group'; group?: Group } | null;
const api = window.toby;
const errorText = publicError;
const time = (stamp: number) => new Date(stamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const agentRole = (agent?: Agent) => (agent?.specialization.trim() || agent?.personality.trim() || 'Your thoughtful teammate').split('\n',1)[0];
const agentModel = (snapshot: Snapshot, agent: Agent) => snapshot.providers.find(provider=>provider.provider===agent.provider)?.models.find(model=>model.id===agent.model)?.name ?? 'Selected model';
const dayKey = (stamp: number) => new Date(stamp).toDateString();
function dayLabel(stamp: number) {
  const today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate()-1);
  if (dayKey(stamp)===today.toDateString()) return 'Today';
  if (dayKey(stamp)===yesterday.toDateString()) return 'Yesterday';
  return new Date(stamp).toLocaleDateString([], {month:'long',day:'numeric',...(new Date(stamp).getFullYear()!==today.getFullYear()?{year:'numeric' as const}:{})});
}
export default function App() {
  const [state, setState] = createStore<{snapshot?: Snapshot}>({});
  const snapshot = () => state.snapshot;
  const setSnapshot = (next: Snapshot) => setState('snapshot', reconcile(publicSnapshot(next), {key:'id'}));
  const [timeline, setTimeline] = createStore<{rows: ConversationRow[]}>({rows:[]});
  const [error, setError] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [chat, setChat] = createSignal('');
  const [panel, setPanel] = createSignal<Panel>('activity');
  const [contextOpen, setContextOpen] = createSignal(false);
  const [onboardingStep, setOnboardingStep] = createSignal<'profile'|'subscription'|'permissions'>('profile');
  const [editor, setEditor] = createSignal<Editor>(null);
  const [composerDrafts, setComposerDrafts] = createSignal<Record<string,{text:string;attachments:Attachment[];replyTo?:string}>>({});
  const composerDraft = () => composerDrafts()[chat()] ?? {text:'',attachments:[]};
  const draft = () => composerDraft().text;
  function updateComposer(id:string, change:Partial<{text:string;attachments:Attachment[];replyTo?:string}>) { setComposerDrafts(all=>({...all,[id]:{...(all[id]??{text:'',attachments:[]}),...change}})); }
  function setDraft(value:string|((previous:string)=>string)) { updateComposer(chat(),{text:typeof value==='function'?value(draft()):value}); }
  const [search, setSearch] = createSignal('');
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const [following, setFollowing] = createSignal(true);
  const [copied, setCopied] = createSignal('');
  const [attaching, setAttaching] = createSignal(false);
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(()=>clearTimeout(copiedTimer));
  let composerInput!: HTMLTextAreaElement;
  let searchInput!: HTMLInputElement;
  let onboardingAgentId: string | undefined;
  let transcript!: HTMLDivElement;
  let approvalDock!: HTMLDivElement;
  const agent = createMemo(() => snapshot()?.agents.find(a => a.id === chat()));
  const group = createMemo(() => snapshot()?.groups.find(g => g.id === chat()));
  const selectedAgent = createMemo(() => agent() ?? snapshot()?.agents.find(a => a.id === (group()?.leadAgentId??group()?.members[0])));
  const chatMessages = createMemo(() => snapshot()?.messages.filter(m => m.chatId === chat()) ?? []);
  const messages = createMemo(() => chatMessages().filter(m => !search() || messageText(m).toLowerCase().includes(search().toLowerCase())));
  const messageLayouts = createMemo(() => conversationLayout(chatMessages(), messages()));
  const members = createMemo(() => snapshot()?.agents.filter(agent => group()?.members.includes(agent.id)) ?? []);

  createEffect(() => setTimeline('rows', reconcile(conversationRows(messages()), {key:'id'})));
  const rowDate = (row: ConversationRow) => row.kind === 'message' ? row.message.createdAt : row.messages[0].createdAt;

  const tasks = createMemo(() => snapshot()?.tasks.filter(t => t.chatId === chat()) ?? []);
  const workTasks = createMemo(() => tasks().filter(task=>!task.channelParticipation||task.status==='failed'||task.status==='interrupted'));
  const approvals = createMemo(() => snapshot()?.approvals.filter(approval => approval.chatId ? approval.chatId===chat() : approval.agentId===chat() || !!group()?.members.includes(approval.agentId)) ?? []);
  const activeApproval = () => approvals()[0];
  let previousApproval: string | undefined;
  createEffect(() => {
    const current=activeApproval()?.id, hadApproval=!!previousApproval;
    if(current===previousApproval)return;
    previousApproval=current;
    queueMicrotask(()=>{
      if(activeApproval()?.id!==current||editor())return;
      if(current)approvalDock?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
      else if(hadApproval)composerInput?.focus({preventScroll:true});
    });
  });
  const runningTasks = createMemo(() => tasks().filter(t => t.status === 'running' || t.status === 'queued' || t.status === 'waiting'));
  const activeTasks = createMemo(() => runningTasks().filter(task => !task.channelParticipation));
  const working = createMemo(() => activeTasks().length > 0);
  const pinned = () => agent()?.pinned ?? group()?.pinned ?? false;
  const title = createMemo(() => agent()?.name ?? group()?.name ?? 'Toby');
  async function run(action: () => unknown | Promise<unknown>) { setError(''); try { return await action(); } catch (e) { setError(errorText(e)); } }
  onMount(() => {
    let receivedUpdate = false;
    const applySnapshot = (s: Snapshot) => {
      setSnapshot(s);
      if ((chat() || s.agents.length || s.groups.length) && !s.agents.some((a,index) => a.id === chat() && (!a.hidden || index===0)) && !s.groups.some(g => g.id === chat())) {
        setDraft(''); selectChat(s.agents.find((a,index)=>!a.hidden || index===0)?.id ?? s.groups[0]?.id ?? '');
      }
    };
    void run(async () => { const s = await api.snapshot(); if (!receivedUpdate) applySnapshot(s); });
    const unsubscribe = api.onChange(s => {
      receivedUpdate = true; applySnapshot(s);
    });
    const unsubscribeMessage = api.onMessage?.(message => {
      if (!state.snapshot) return;
      const visible = publicMessage(message, state.snapshot.tasks);
      if (!visible) return;
      message = visible;
      const index = state.snapshot.messages.findIndex(existing => existing.id === message.id);
      if (index < 0) setState('snapshot', 'messages', state.snapshot.messages.length, message);
      else setState('snapshot', 'messages', index, reconcile(message));
    });
    const unsubscribeAttention = api.onAttention?.(chatId => {
      setEditor(null);
      if(chatId){ selectChat(chatId); }
      else {setPanel('settings');setContextOpen(true);}
    });
    onCleanup(() => { unsubscribe(); unsubscribeMessage?.(); unsubscribeAttention?.(); });
  });
  createEffect(() => {
    messages().map(m => `${m.id}:${m.text.length}:${m.status}`).join('|');
    if (following()) queueMicrotask(() => scrollToLatest());
  });
  createEffect(() => { draft(); queueMicrotask(() => { if (composerInput) { composerInput.style.height = 'auto'; composerInput.style.height = `${Math.min(180, composerInput.scrollHeight)}px`; } }); });
  function scrollToLatest() { if (transcript) transcript.scrollTop = transcript.scrollHeight; }
  function toggleSearch() { setSearchOpen(!searchOpen()); if (searchOpen()) queueMicrotask(() => searchInput?.focus()); else setSearch(''); }
  async function copyMessage(id:string, text:string) { await run(async()=>{await navigator.clipboard.writeText(text);clearTimeout(copiedTimer);setCopied(id);copiedTimer=setTimeout(()=>setCopied(''),1800);}); }
  function selectChat(id: string) { setChat(id); setSearch(''); setFollowing(true); queueMicrotask(scrollToLatest); }
  async function send() {
    if ((!draft().trim() && !composerDraft().attachments.length) || !chat() || busy()) return;
    const target=chat(), submitted=composerDraft(), text=submitted.text.trim(); setBusy(true);
    try { await api.send(target,text,{replyTo:submitted.replyTo,attachments:submitted.attachments.map(a=>a.id)});
      const current=composerDrafts()[target]; if(current) updateComposer(target,{text:current.text===submitted.text?'':current.text,attachments:current.attachments.filter(a=>!submitted.attachments.some(sent=>sent.id===a.id)),replyTo:current.replyTo===submitted.replyTo?undefined:current.replyTo});
    } catch(e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function attachFiles() { const target=chat();if(!target||attaching())return;setAttaching(true);try{await run(async()=>{const added=await api.chooseAttachments(target);const existing=composerDrafts()[target]?.attachments??[];updateComposer(target,{attachments:[...existing,...added.filter(a=>!existing.some(old=>old.id===a.id))]});});}finally{setAttaching(false);} }
  const replyMessage = () => chatMessages().find(m=>m.id===composerDraft().replyTo);
  function replyAuthor(id:string) { const message=chatMessages().find(message=>message.id===id);return message?.role==='user'?'You':snapshot()?.agents.find(agent=>agent.id===message?.senderId)?.name??'Earlier message'; }
  function jumpToMessage(id:string) {
    setFollowing(false); setSearch('');
    requestAnimationFrame(()=>{ const target=document.getElementById(`message-${id}`);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true}); });
  }
  function quotedText(id:string) { const m=snapshot()?.messages.find(m=>m.id===id);return (m ? messageText(m).slice(0,180) : '') || m?.attachments?.map(a=>a.name).join(', ') || 'Earlier message'; }
  return <Show when={snapshot()} fallback={<main class="loading"><img src={logo} alt="Toby"/><h1>Toby</h1><p>{error() || 'Opening your workspace…'}</p><Show when={error()}><button onClick={() => location.reload()}>Try again</button></Show></main>}>{s => <>
    <div class={`app-shell ${sidebarOpen() ? '' : 'sidebar-collapsed'}`} inert={!s().preferences.onboardingComplete} aria-hidden={!s().preferences.onboardingComplete}>
      <Sidebar snapshot={s()} chatId={chat()} onSelectChat={selectChat} onTogglePin={async(id,pinned)=>{await run(()=>api.setChatPinned(id,pinned));}} onHide={()=>setSidebarOpen(false)} onAddAgent={()=>setEditor({kind:'agent'})} onCreateGroup={()=>setEditor({kind:'group'})} onOpenSettings={()=>{setPanel('settings');setContextOpen(true);}} onOpenWorkspace={()=>{setPanel('activity');setContextOpen(true);}} onOpenRoutines={()=>{setPanel('routines');setContextOpen(true);}}/>
      <main class="conversation" classList={{'conversation-empty':!messages().length&&!search()}}>
        <header class="chat-header"><div class="chat-identity"><Show when={!sidebarOpen()}><IconButton label="Show sidebar" onClick={()=>setSidebarOpen(true)}><PanelLeftOpen size={17}/></IconButton></Show><Show when={agent()} fallback={<span class="group-avatar"><Users size={16}/></span>}>{a=><Avatar agent={a()}/>}</Show><div><h1>{title()}</h1><p><Show when={group()}><span class="header-member-stack" aria-hidden="true"><For each={members().slice(0,4)}>{member=><Avatar agent={member}/>}</For></span></Show><Show when={working()}><span class="status-dot working"/></Show><span class="chat-subtitle">{group() ? members().map(member=>member.name).join(', ') : working() ? activeTasks().length>1?`Working on ${activeTasks().length} tasks`:'Working on your request' : agentRole(agent())}</span></p></div></div><div class="header-actions"><IconButton label={pinned()?'Unpin conversation':'Pin conversation'} active={pinned()} disabled={!chat()} onClick={()=>run(()=>api.setChatPinned(chat(),!pinned()))}><Pin size={16}/></IconButton><IconButton label="Search conversation" active={searchOpen()} onClick={toggleSearch}><Search size={17}/></IconButton><IconButton label={group()?'Edit group':'Edit agent'} onClick={() => setEditor(group() ? {kind:'group',group:group()} : {kind:'agent',agent:agent()})}><MoreHorizontal size={19}/></IconButton><IconButton label="Workspace details" active={contextOpen()} onClick={()=>setContextOpen(!contextOpen())}><PanelRight size={17}/></IconButton></div></header>
        <Show when={error()}><div role="alert" class="error-banner"><CircleAlert size={16}/><span>{error()}</span><button class="icon-button" aria-label="Dismiss error" onClick={()=>{setError('');}}><X size={15}/></button></div></Show>
        <Show when={searchOpen()}><div class="conversation-search"><Search size={15}/><input ref={searchInput} aria-label="Search conversation" placeholder="Find in this conversation" value={search()} onInput={e=>setSearch(e.currentTarget.value)} onKeyDown={e=>{if(e.key==='Escape')toggleSearch();}}/><Show when={search()}><small>{messages().length} results</small></Show><button class="icon-button" aria-label="Close search" onClick={toggleSearch}><X size={15}/></button></div></Show>
        <div class="transcript" classList={{'transcript-empty':!messages().length&&!search()}} ref={transcript} onScroll={()=>{if(transcript)setFollowing(transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight<80);}}>
          <Show when={messages().length} fallback={<div class="empty-conversation"><span class="empty-avatar"><Show when={agent()} fallback={<Users size={32}/>} >{a=><Avatar agent={a()}/>}</Show></span><h2>{search() ? 'No matching messages' : group() ? 'A little room to work together.' : `What’s on your mind?`}</h2><p>{search() ? 'Try a different word or phrase.' : `Start with an idea.`}</p></div>}>
            <For each={timeline.rows}>{(row,index)=><>
              <Show when={index()===0 || dayKey(rowDate(timeline.rows[index()-1]))!==dayKey(rowDate(row))} fallback={<Show when={row.kind==='message'&&messageLayouts().get(row.id)?.pause}><div class="conversation-pause"><time>{time(rowDate(row))}</time></div></Show>}><div class="conversation-day">{dayLabel(rowDate(row))}</div></Show>
              <Show when={row.kind==='message' ? row.message : undefined} fallback={<Show when={row.kind==='activity' ? row.messages : undefined}>{activities=><ActivityGroup messages={activities()} agents={s().agents} onOpenAttachment={id=>run(()=>api.openAttachment(id))}/>}</Show>}>{value=>{
                const m=value;
                const layout=()=>messageLayouts().get(m().id);
                const author=()=>m().routineId?'Scheduled':m().role==='user'?'You':s().agents.find(a=>a.id===m().senderId)?.name ?? (m().role==='system'?'Toby':title());
                return <article id={`message-${m().id}`} tabIndex={-1} aria-label={`${author()}, ${time(m().createdAt)}`} class={`message ${m().role} ${m().status==='streaming'?'streaming':''}`} classList={{'message-grouped':layout()?.grouped,'message-local-reply':layout()?.reply==='local'}} data-reply-target={layout()?.targetId}>
                  <Show when={layout()?.replyStem}><span class="reply-stem" aria-hidden="true"/></Show>
                  <Show when={layout()?.reply==='local'&&!layout()?.grouped}><span class="reply-connector" aria-hidden="true"/></Show>
                  <div class="message-avatar"><Show when={!layout()?.grouped}><Show when={m().role!=='user'} fallback={<span class="avatar user-avatar"><UserRound size={20}/></span>}><Show when={s().agents.find(a=>a.id===m().senderId)} fallback={<span class="avatar">{agentAvatar({id:m().senderId})}</span>}>{a=><Avatar agent={a()}/>}</Show></Show></Show></div>
                  <div class="message-content">
                    <Show when={!layout()?.grouped}><div class="message-heading"><strong>{author()}</strong><time dateTime={new Date(m().createdAt).toISOString()}>{time(m().createdAt)}</time><Show when={m().status==='streaming'}><span class="stream-label"><span class="status-dot working"/>Responding</span></Show></div></Show>
                    <div class="message-bubble">
                      <Show when={layout()?.reply==='reference'&&!layout()?.grouped}><button type="button" class="message-reference" aria-label={`In reply to ${replyAuthor(m().replyTo!)}`} disabled={!layout()?.targetId} title={layout()?.targetId?quotedText(m().replyTo!):'This message is unavailable'} onClick={()=>jumpToMessage(m().replyTo!)}><Reply size={13} aria-hidden="true"/><strong>{replyAuthor(m().replyTo!)}</strong><span>{layout()?.targetId?quotedText(m().replyTo!):'Message unavailable'}</span></button></Show>
                      <MessageBody text={messageText(m())} mentions={group()?members().map(member=>member.name):agent()?[agent()!.name]:[]} markdown={m().role==='assistant'} streaming={m().status==='streaming'} onContentChange={()=>{if(following())scrollToLatest();}}/>
                      <Show when={m().attachments?.length}><MessageAttachments attachments={m().attachments!} onOpen={id=>run(()=>api.openAttachment(id))}/></Show>
                    </div>
                    <Show when={m().status!=='streaming'}><MessageActions reactions={m().reactions} agentReactions={m().agentReactions?.map(reaction=>({...reaction,name:s().agents.find(agent=>agent.id===reaction.agentId)?.name??'Former teammate'}))} copied={copied()===m().id} replying={composerDraft().replyTo===m().id} canCopy={!!messageText(m())} onReply={()=>{updateComposer(chat(),{replyTo:m().id});composerInput?.focus();}} onCopy={()=>copyMessage(m().id,messageText(m()))} onReact={emoji=>run(()=>api.toggleReaction(m().id,emoji))}/></Show>
                    <Show when={m().status==='failed'}><small class="danger">Delivery failed. Open Activity to resume.</small></Show>
                  </div>
                </article>;
              }}</Show>
            </>}</For>
          </Show>
          <Show when={!search()&&working()}><WorkingIndicator group={!!group()} count={activeTasks().length} waiting={activeTasks().every(task=>task.status==='waiting')}/></Show>
        </div>
        <Show when={!following()&&messages().length}><div class="jump-container"><button class="jump-latest" onClick={()=>{setFollowing(true);scrollToLatest();}}><ArrowDown size={14}/>Latest messages</button></div></Show>
        <div class="composer-area">
          <div ref={approvalDock} class="composer-approval" aria-label="Permission request">
            <Show when={activeApproval()} keyed>{approval=><ApprovalCard approval={approval} agentName={s().agents.find(a=>a.id===approval.agentId)?.name??'Your agent'} queueLabel={approvals().length>1?`1 of ${approvals().length}`:undefined} onResolve={(allowed,alwaysAllow)=>api.resolveApproval(approval.id,allowed,alwaysAllow)}/>}</Show>
          </div>
          <div class="composer-content">
          <form class="composer" onSubmit={e=>{e.preventDefault();setFollowing(true);void send();}}><Show when={composerDraft().replyTo}><div class="reply-strip"><Reply size={15}/><div><small>Replying to {replyMessage()?.role==='user'?'you':s().agents.find(a=>a.id===replyMessage()?.senderId)?.name??'a message'}</small><p>{quotedText(composerDraft().replyTo!)}</p></div><button type="button" class="icon-button" aria-label="Cancel reply" onClick={()=>{updateComposer(chat(),{replyTo:undefined});composerInput?.focus();}}><X size={14}/></button></div></Show><Show when={composerDraft().attachments.length}><div class="attachment-chips"><For each={composerDraft().attachments}>{file=><span class="attachment-chip"><FileText size={13}/><span>{file.name}</span><button type="button" title="Remove from message; keep local file" aria-label={`Remove ${file.name} from message`} onClick={()=>updateComposer(chat(),{attachments:composerDraft().attachments.filter(a=>a.id!==file.id)})}><X size={13}/></button></span>}</For></div></Show><div class="composer-input-row"><button class="attach-button" type="button" title="Attach files" aria-label={attaching()?'Choosing attachments':'Attach files'} aria-busy={attaching()} disabled={!chat()||busy()||attaching()} onClick={attachFiles}><Paperclip size={18}/></button><textarea ref={composerInput} rows={1} aria-label="Message" placeholder={`Message ${title()}…`} value={draft()} onInput={e=>setDraft(e.currentTarget.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();setFollowing(true);void send();}}}/><div class="composer-controls"><Show when={runningTasks().length}><button type="button" class="stop-button" aria-label="Stop response" onClick={()=>run(()=>api.stop(chat()))}><Square size={12}/></button></Show><button class="send-button" type="submit" aria-label="Send message" disabled={(!draft().trim()&&!composerDraft().attachments.length) || busy() || !chat()}><Send size={17}/></button></div></div></form><Show when={!messages().length&&!search()}><div class="conversation-starters"><button onClick={()=>{setDraft('Help me think through an idea.');composerInput?.focus();}}>Think through an idea<ArrowUp size={13}/></button><button onClick={()=>{setDraft('Help me make a plan for today.');composerInput?.focus();}}>Make a plan<ArrowUp size={13}/></button></div></Show><div class="composer-note"><span><kbd>↵</kbd> send <span class="note-divider">·</span> <kbd>⇧ ↵</kbd> new line</span></div>
          </div>
        </div>
      </main>
      <Show when={contextOpen()}><aside class="context"><header><h2>Workspace</h2><IconButton label="Close workspace details" onClick={()=>setContextOpen(false)}><X size={17}/></IconButton></header><nav class="context-tabs" aria-label="Workspace sections"><For each={(['activity','files','memory','skills','routines','connectors','settings'] as Panel[])}>{p=><button aria-current={panel()===p?'page':undefined} class={panel()===p?'selected':''} onClick={()=>setPanel(p)}>{p[0].toUpperCase()+p.slice(1)}</button>}</For></nav><div class="context-body">
      <Show when={panel()==='activity'}><Show when={group()}>{g=><section class="channel-purpose"><h3>{g().name}</h3><p>{g().instructions||'Give this channel a purpose in Group settings.'}</p><small>Lead: {s().agents.find(a=>a.id===(g().leadAgentId??g().members[0]))?.name??'Choose a lead'}</small></section>}</Show><h3>Current work</h3><Show when={workTasks().length} fallback={<div class="panel-empty"><Clock3 size={23}/><strong>Ready when you are</strong><p>Tasks and progress will appear here as you work with {title()}.</p></div>}><For each={workTasks()}>{task=><section class="task"><div class="row"><strong>{s().agents.find(a=>a.id===task.agentId)?.name ?? 'Agent'}</strong><span class={`state ${task.status}`}>{task.status}</span></div><p>{taskSummary(task)}</p><Show when={task.status==='failed'||task.status==='interrupted'}><button onClick={()=>run(()=>api.resumeTask(task.id))}>{task.parentId?'Continue original request':'Resume task'}</button><Show when={!task.channelParticipation}><select aria-label="Reassign task" value="" onChange={e=>{const id=e.currentTarget.value;if(id)void run(()=>api.resumeTask(task.id,id));}}><option value="">Resume with another agent…</option><For each={s().agents}>{a=><option value={a.id}>{a.name}</option>}</For></select></Show></Show></section>}</For></Show><h3>Members</h3><For each={group()?s().agents.filter(a=>group()!.members.includes(a.id)):agent()?[agent()!]:[]}>{a=><div class="member"><Avatar agent={a}/><div><strong>{a.name}</strong><small>{a.status} · {a.provider==='openai'?'OpenAI':'Grok'}</small><small>{agentModel(s(),a)}</small></div><button onClick={()=>setEditor({kind:'agent',agent:a})}>Edit</button></div>}</For></Show>
      <Show when={panel()==='settings'}><Settings snapshot={s()} run={run}/></Show>
      <Show when={panel()==='files'}><Files agent={selectedAgent()} run={run}/></Show>
      <Show when={panel()==='memory'&&group()}>{g=><GroupMemoryPanel group={g()} snapshot={s()} run={run}/>}</Show><Show when={['memory','skills','routines','connectors'].includes(panel())&&!(panel()==='memory'&&group())}><Library kind={panel()} snapshot={s()} agent={selectedAgent()} group={group()} run={run}/></Show>
      </div></aside></Show>
    </div>
    <Show when={error() && (editor() || !s().preferences.onboardingComplete)}><div role="alert" class="overlay-error"><span>{error()}</span><button onClick={()=>{setError('');}}>Dismiss</button></div></Show>
    <EditorDialog open={!!editor()} title={editor()?.kind==='agent'?'Agent settings':'Group settings'} onClose={()=>setEditor(null)}><Show when={editor()}>{ed=><Show when={ed().kind==='agent'} fallback={<GroupForm snapshot={s()} group={(ed() as {group?:Group}).group} onSave={g=>run(async()=>{const result=await api.saveGroup(g);selectChat(result.id);setEditor(null);})}/>}><AgentForm snapshot={s()} agent={(ed() as {agent?:Agent}).agent} onDelete={async id=>{await api.deleteAgent(id);selectChat(s().agents.find((a,index)=>a.id!==id&&(!a.hidden||index===0))?.id??'');setEditor(null);}} onSave={a=>run(async()=>{const result=await api.saveAgent(a);selectChat(result.id);setEditor(null);})}/></Show>}</Show></EditorDialog>
    <Show when={!s().preferences.onboardingComplete}><Onboarding step={onboardingStep()}><AgentForm first onSetupStepChange={setOnboardingStep} snapshot={s()} agent={s().agents[0]} onSave={a=>run(async()=>{const result=await api.saveAgent({...a,id:onboardingAgentId??s().agents[0]?.id??a.id});onboardingAgentId=result.id;setChat(result.id);await api.setPreferences({onboardingComplete:true});try{localStorage.removeItem('toby:first-profile');localStorage.removeItem('toby:onboarding-started');}catch{}queueMicrotask(()=>composerInput?.focus());})}/></Onboarding></Show>
    <ProviderSetupProgress snapshot={s()} run={run}/>
  </>}</Show>;
}

function ProviderSetupProgress(props:{snapshot:Snapshot;run:Runner}) {
  const pending = () => props.snapshot.providers.filter(provider=>provider.setup);
  return <Show when={pending().length}><div class="setup-downloads" classList={{'onboarding-downloads':!props.snapshot.preferences.onboardingComplete}} aria-label="Provider setup"><For each={pending()}>{provider=><div class={`download-pill ${provider.setup?.phase==='failed'?'failed':''}`}><div class="download-icon"><Show when={provider.setup?.phase==='failed'} fallback={<Download size={17}/>}><CircleAlert size={17}/></Show></div><div class="download-copy"><strong role="status" aria-live="polite">{provider.provider==='openai'?'Codex':'Grok'} {provider.setup?.phase==='failed'?'setup needs attention':provider.setup?.phase==='verifying'?'finishing setup':'setting up'}</strong><Show when={provider.setup?.phase==='failed'} fallback={<><small>{provider.setup?.phase==='verifying'?'Finishing installation':provider.setup?.totalBytes?`${Math.round(provider.setup.progress)}% · ${(provider.setup.downloadedBytes/1024/1024).toFixed(1)} / ${(provider.setup.totalBytes/1024/1024).toFixed(1)} MB`:`${((provider.setup?.downloadedBytes??0)/1024/1024).toFixed(1)} MB downloaded`}</small><progress max="100" value={provider.setup?.totalBytes?provider.setup.progress:undefined} aria-label={`${provider.provider} setup progress`}/></>}><small>{publicError(provider.setup?.error, 'Couldn’t complete the download. Try again.')}</small></Show></div><Show when={provider.setup?.phase==='failed'}><button onClick={()=>props.run(()=>api.prepareProvider(provider.provider))}>Retry</button></Show></div>}</For></div></Show>;
}

function Avatar(props:{agent:Agent}) { return <span class="avatar">{agentAvatar(props.agent)}</span>; }
function AgentForm(props:{snapshot:Snapshot;agent?:Agent;first?:boolean;onSetupStepChange?:(step:'profile'|'subscription'|'permissions')=>void;onDelete?:(id:string)=>Promise<void>;onSave:(input:AgentInput)=>Promise<unknown>}) {
  let savedProfile: Partial<AgentInput> = {};
  if(props.first&&!props.agent) { try { const value=JSON.parse(localStorage.getItem('toby:first-profile')??'{}');if(value&&typeof value==='object')savedProfile=value; } catch {} }
  const savedText=(key:'personality'|'specialization'|'avatar'|'model')=>typeof savedProfile[key]==='string'?savedProfile[key]!:'';
  const [name,setName]=createSignal(props.first?'Toby':props.agent?.name??'');
  const [personality,setPersonality]=createSignal(props.agent?.personality??savedText('personality'));
  const [specialization,setSpecialization]=createSignal(props.agent?.specialization??savedText('specialization'));
  const [provider,setProvider]=createSignal<Provider>(props.agent?.provider??(savedProfile.provider==='grok'?'grok':'openai'));
  const [model,setModel]=createSignal(props.agent?.model??savedText('model'));
  const [avatar,setAvatar]=createSignal(agentAvatar({id:props.agent?.id??crypto.randomUUID(),name:name(),avatar:props.agent?.avatar??savedText('avatar')}));
  const [error,setError]=createSignal('');
  const [saving,setSaving]=createSignal(false);
  const [step,setStep]=createSignal<'profile'|'subscription'|'permissions'>('profile');
  createEffect(()=>{if(props.first)props.onSetupStepChange?.(step());});
  const [agentAccess,setAgentAccess]=createSignal<'inherit'|PermissionMode>(props.agent?.permissionMode??'inherit');
  const [accessMode,setAccessMode]=createSignal<PermissionMode>('full');
  const [notify,setNotify]=createSignal(props.snapshot.preferences.notifyOnIntervention!==false);
  const [avatarPicker,setAvatarPicker]=createSignal(false);
  const [confirmDelete,setConfirmDelete]=createSignal(false);
  createEffect(()=>{if(props.first){const value={personality:personality(),specialization:specialization(),avatar:avatar(),provider:provider(),model:model()};try{localStorage.setItem('toby:first-profile',JSON.stringify(value));}catch{}}});
  const state=createMemo(()=>props.snapshot.providers.find(p=>p.provider===provider()));
  const liveAgent=createMemo(()=>props.snapshot.agents.find(a=>a.id===props.agent?.id));
  const validModel=createMemo(()=>!!state()?.connected && !!state()?.models.some(m=>m.id===model()));
  createEffect(()=>{const current=state();if(current?.connected && model() && !current.models.some(m=>m.id===model()))setModel('');});
  async function action(f:()=>unknown|Promise<unknown>){setError('');setSaving(true);try{await f();}catch(e){setError(errorText(e));}finally{setSaving(false);}}
  function submit(event:SubmitEvent) {
    event.preventDefault();if(saving()||!name().trim())return;
    if(props.first&&step()==='profile'){setStep('subscription');return;}
    if(!validModel())return;
    if(props.first&&step()==='subscription'){setStep('permissions');return;}
    void action(async()=>{if(props.first)await api.setPreferences({permissionMode:accessMode(),allowedActions:[],notifyOnIntervention:notify()});return props.onSave({id:props.agent?.id,name:name().trim(),personality:personality(),specialization:specialization(),provider:provider(),model:model(),avatar:avatar(),...(!props.first?{permissionMode:agentAccess()==='inherit'?null:agentAccess() as PermissionMode}:{})});});
  }
  return <form class="stack-form agent-form" onSubmit={submit}><div class="form-scroll">
    <Show when={!props.first}><div class="form-heading"><h2>{props.agent?'Edit '+props.agent.name:'Add a teammate'}</h2><p class="muted">Give your agent a name, a purpose, and a model.</p></div></Show>
    <Show when={!props.first||step()==='profile'}>
      <div class="profile-identity">
        <button type="button" class="avatar-preview" aria-label="Choose an avatar" aria-expanded={avatarPicker()} onClick={()=>setAvatarPicker(!avatarPicker())}>
          <span>{avatar()}</span><span class="avatar-edit"><Plus size={12}/></span>
        </button>
        <Show when={props.first} fallback={<label>Name<input required placeholder="What should we call them?" value={name()} onInput={e=>setName(e.currentTarget.value)}/></label>}><div><strong>Toby</strong><button type="button" class="text-button" onClick={()=>setAvatarPicker(!avatarPicker())}>Change avatar</button></div></Show>
      </div>
      <Show when={avatarPicker()}><div class="avatar-picker" aria-label="Choose avatar"><For each={AGENT_AVATARS}>{emoji=><button type="button" aria-label={`Use ${emoji} avatar`} aria-pressed={avatar()===emoji} onClick={()=>{setAvatar(emoji);setAvatarPicker(false);}}>{emoji}</button>}</For></div></Show>
      <div class="profile-fields"><label>{props.first?'Personality':'Personality'} <span>optional</span><Show when={!props.first}><span class="sr-only">Agent personality</span></Show><textarea rows={2} aria-label="Personality" placeholder="Thoughtful, direct, a little curious…" value={personality()} onInput={e=>setPersonality(e.currentTarget.value)}/></label><label>Specialization <span>optional</span><input aria-label="Specialization" placeholder="What should Toby focus on?" value={specialization()} onInput={e=>setSpecialization(e.currentTarget.value)}/></label></div>
      <Show when={props.first}><p class="form-footnote">You can change these anytime.</p></Show>
    </Show>
    <Show when={!props.first||step()==='subscription'}>
      <fieldset class="provider-picker"><legend>Choose your subscription</legend><For each={(['openai','grok'] as Provider[])}>{p=><button type="button" aria-pressed={provider()===p} class={provider()===p?'selected':''} onClick={()=>{if(provider()!==p){setProvider(p);setModel('');}}}><img class="provider-logo" src={p==='openai'?openaiLogo:grokLogo} alt="" aria-hidden="true"/><span class="provider-option-copy"><strong>{p==='openai'?'OpenAI':'Grok'}</strong><small>{p==='openai'?'ChatGPT / Codex':'Grok subscription'}</small></span><span class="choice-mark"><Show when={provider()===p}><Check size={14}/></Show></span></button>}</For></fieldset>
      <div class="provider-status"><div><span class={`status-dot ${state()?.connected?'idle':'waiting'}`}/><span>{state()?.connected?'Connected':state()?.setup?.phase==='failed'?'Setup needs attention':state()?.setup?'Preparing in the background':state()?.installed?'Ready to connect':'Preparing provider'}</span></div><div><button type="button" disabled={saving()||!!state()?.setup&&state()?.setup?.phase!=='failed'} onClick={()=>action(()=>state()?.installed?api.connectProvider(provider()):api.prepareProvider(provider()))}>{saving()?'Connecting…':state()?.connected?'Reconnect':state()?.installed?'Connect subscription':state()?.setup?.phase==='failed'?'Retry setup':'Preparing…'}</button><button type="button" title="Refresh connection and models" aria-label="Refresh connection and models" disabled={saving()} onClick={()=>action(()=>api.refreshProviders())}><RefreshCw size={14}/></button></div></div>
      <Show when={state()?.error}><p class="inline-error" role="alert">{publicError(state()?.error)}</p></Show>
      <label>Choose a model<select required value={model()} onChange={e=>setModel(e.currentTarget.value)}><option value="">{state()?.models.length?'Select a model':'Connect above to see your models'}</option><For each={state()?.models??[]}>{m=><option value={m.id}>{m.name}</option>}</For></select></label>
    </Show>
    <Show when={props.first&&step()==='permissions'}><AccessSettings compact mode={accessMode()} notify={notify()} onMode={setAccessMode} onNotify={setNotify}/><Permissions compact snapshot={props.snapshot} run={action}/></Show>
    <Show when={error()}><p class="inline-error" role="alert">{error()}</p></Show>
    <Show when={!props.first}><label>Permissions<select aria-label="Agent permissions" value={agentAccess()} onChange={event=>setAgentAccess(event.currentTarget.value as 'inherit'|PermissionMode)}><option value="inherit">Use workspace setting</option><option value="ask">Ask first</option><option value="full">Full access</option></select></label><p class="access-note">Controls this teammate’s actions. macOS permissions still apply.</p></Show>
    <Show when={props.agent&&!props.first}><div class="agent-visibility"><button type="button" disabled={saving()} onClick={()=>action(()=>api.setAgentVisibility(props.agent!.id,{pinned:!liveAgent()?.pinned}))}>{liveAgent()?.pinned?'Unpin agent':'Pin agent'}</button><Show when={props.snapshot.agents[0]?.id!==props.agent?.id}><button type="button" disabled={saving()} onClick={()=>action(()=>api.setAgentVisibility(props.agent!.id,{hidden:!liveAgent()?.hidden}))}>{liveAgent()?.hidden?'Restore to sidebar':'Hide from sidebar'}</button></Show><small>Hidden agents keep their history, files, and group memberships.</small></div></Show>
    <Show when={props.agent && props.snapshot.agents[0]?.id !== props.agent.id && props.onDelete}><div class="delete-agent"><Show when={confirmDelete()}><p class="muted">Remove this agent from your team and groups, and remove its routines? Saved history and workspace files are retained. Stop active work first.</p></Show><button type="button" class="danger" disabled={saving()} onClick={()=>confirmDelete()?action(()=>props.onDelete!(props.agent!.id)):setConfirmDelete(true)}>{confirmDelete()?'Confirm removal':'Remove agent'}</button><Show when={confirmDelete()}><button type="button" onClick={()=>setConfirmDelete(false)}>Cancel</button></Show></div></Show>
    </div>
    <button class="primary wide" disabled={saving()||!name().trim()||((!props.first||step()!=='profile')&&!validModel())}>{saving()?'One moment…':props.first?(step()==='permissions'?'Open your workspace':'Continue'):props.agent?'Save changes':'Create agent'}</button>
    <Show when={props.first&&step()!=='profile'}><button type="button" class="text-button" onClick={()=>setStep(step()==='permissions'?'subscription':'profile')}>{step()==='permissions'?'Back to your subscription':'Back to Toby’s personality'}</button></Show>
  </form>;
}
function GroupForm(props:{snapshot:Snapshot;group?:Group;onSave:(input:{id?:string;name:string;instructions:string;members:string[];leadAgentId?:string})=>Promise<unknown>}) {
 const [name,setName]=createSignal(props.group?.name??'');const [instructions,setInstructions]=createSignal(props.group?.instructions??'');const [members,setMembers]=createSignal(props.group?.members??[]);const [lead,setLead]=createSignal(props.group?.leadAgentId??props.group?.members[0]??'');const [busy,setBusy]=createSignal(false);
 return <form class="stack-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await props.onSave({id:props.group?.id,name:name(),instructions:instructions(),members:members(),leadAgentId:members().includes(lead())?lead():members()[0]});}finally{setBusy(false);}}}><div class="form-scroll"><h2>{props.group?'Edit group':'Bring a team together'}</h2><p class="muted">A shared conversation with persistent members and context.</p><label>Group name<input required value={name()} onInput={e=>setName(e.currentTarget.value)} placeholder="Your team's name"/></label><label>Shared instructions<textarea value={instructions()} onInput={e=>setInstructions(e.currentTarget.value)} placeholder="What is this group working toward?"/></label><label>Channel lead<select aria-label="Channel lead" value={members().includes(lead())?lead():members()[0]??''} onChange={event=>setLead(event.currentTarget.value)}><Show when={!members().length}><option value="">Choose members below</option></Show><For each={props.snapshot.agents.filter(a=>members().includes(a.id))}>{a=><option value={a.id}>{a.name}</option>}</For></select></label><p class="access-note">The lead helps coordinate work. Every member can read, react and reply.</p><h3>Members</h3><For each={props.snapshot.agents}>{a=><label class="member check"><input type="checkbox" checked={members().includes(a.id)} onChange={e=>setMembers(e.currentTarget.checked?[...members(),a.id]:members().filter(id=>id!==a.id))}/><Avatar agent={a}/><div><strong>{a.name}</strong><small>{a.provider==='openai'?'OpenAI':'Grok'} · {agentModel(props.snapshot,a)}</small></div></label>}</For><Show when={props.snapshot.agents.length<2}><p class="muted">Add a second agent to create a group.</p></Show></div><button class="primary" disabled={busy()||!name().trim()||members().length<2}>{busy()?'Saving…':'Save group'}</button></form>;
}
type Runner = (action:()=>unknown | Promise<unknown>)=>Promise<unknown>;
function Permissions(props:{snapshot:Snapshot;run:Runner;compact?:boolean}) {
 const granted=(kind:'microphone'|'accessibility'|'screen')=>props.snapshot.permissions[kind]===true||props.snapshot.permissions[kind]==='granted';
 const labels={microphone:'Microphone',accessibility:'Accessibility',screen:'Screen recording'};
 const descriptions={microphone:'Not required while voice input is unavailable.',accessibility:'Use the keyboard and pointer on this Mac.',screen:'Understand your screen when you request help.'};
 if(props.compact)return <div class="setup-mac-access"><strong>Mac access <small>optional</small></strong><div><For each={['accessibility','screen'] as const}>{kind=><button type="button" disabled={granted(kind)} onClick={()=>props.run(()=>api.requestPermission(kind))}><Show when={granted(kind)}><Check size={13}/></Show>{kind==='accessibility'?'Control this Mac':'See the screen'}</button>}</For></div><p class="access-note">macOS will ask you to allow each permission.</p></div>;
 return <><Show when={!props.compact}><h3>Voice input</h3><p class="muted">Voice input will be available when supported by your subscription. All replies appear as text.</p></Show><h3>Mac permissions</h3><Show when={props.compact}><p class="access-note">Enable these in macOS when you want Toby to see or control your screen.</p></Show><For each={(props.snapshot.voiceModels.ready?['microphone','accessibility','screen']:['accessibility','screen']) as ('microphone'|'accessibility'|'screen')[]}>{kind=><div class="permission"><div><strong>{labels[kind]}</strong><small>{descriptions[kind]}</small></div><Show when={granted(kind)} fallback={<button onClick={()=>props.run(()=>api.requestPermission(kind))}>Enable</button>}><span class="permission-granted"><Check size={13}/>Allowed</span></Show><button class="icon-button" title="Open System Settings" aria-label={`Open ${labels[kind]} settings`} onClick={()=>props.run(()=>api.openPermissionSettings(kind))}><ExternalLink size={14}/></button></div>}</For></>;
}
function Settings(props:{snapshot:Snapshot;run:Runner}) {
 const [url,setUrl]=createSignal('');
 const [resetting,setResetting]=createSignal(false);
 async function resetToby(){setResetting(true);try{await props.run(()=>api.resetApp());}finally{setResetting(false);}}
 return <div class="settings-content">
  <h3>Subscriptions</h3><For each={props.snapshot.providers}>{p=><section class="provider-setting"><div class="row"><div class="provider-setting-name"><img src={p.provider==='openai'?openaiLogo:grokLogo} alt=""/><strong>{p.provider==='openai'?'OpenAI':'Grok'}</strong></div><span class={`provider-connection ${p.connected?'connected':''}`}><span class={`status-dot ${p.connected?'idle':'waiting'}`}/>{p.connected?'Connected':p.setup&&p.setup.phase!=='failed'?'Preparing':'Not connected'}</span></div><Show when={p.error}><p class="inline-error">{publicError(p.error)}</p></Show><button disabled={!!p.setup&&p.setup.phase!=='failed'} onClick={()=>props.run(()=>p.installed?api.connectProvider(p.provider):api.prepareProvider(p.provider))}>{p.connected?'Reconnect':p.installed?'Connect subscription':p.setup?.phase==='failed'?'Retry setup':'Preparing provider…'}</button></section>}</For><button class="text-button settings-refresh" onClick={()=>props.run(()=>api.refreshProviders())}><RefreshCw size={12}/>Refresh providers and models</button>
  <h3>Permissions</h3><AccessSettings mode={props.snapshot.preferences.permissionMode??'ask'} notify={props.snapshot.preferences.notifyOnIntervention!==false} allowed={props.snapshot.preferences.allowedActions} onMode={mode=>void props.run(()=>api.setPreferences({permissionMode:mode,...(mode==='ask'?{allowedActions:[]}:{} )}))} onNotify={notifyOnIntervention=>void props.run(()=>api.setPreferences({notifyOnIntervention}))} onRevoke={permission=>void props.run(()=>api.setPreferences({allowedActions:props.snapshot.preferences.allowedActions?.filter(value=>value!==permission)??[]}))}/>
  <Show when={props.snapshot.preferences.permissionMode==='full'}><p class="access-note">Switching to Ask stops work using the workspace default. Agent overrides stay unchanged.</p></Show><h3>Agent autonomy</h3><Switch class="toggle-row" checked={props.snapshot.preferences.permissionMode==='full'||props.snapshot.preferences.autoCreateAgents} disabled={props.snapshot.preferences.permissionMode==='full'} onChange={checked=>void props.run(()=>api.setPreferences({autoCreateAgents:checked}))}><Switch.Label><strong>Create specialists as needed</strong><small>Let agents create persistent teammates. You can always add agents yourself.</small></Switch.Label><Switch.Input/><Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb"/></Switch.Control></Switch><label class="field concurrency-field"><span>Concurrent tasks<small>Tasks running at the same time, including for one agent</small></span><input type="number" min="1" max="8" value={props.snapshot.preferences.maxConcurrency} onChange={e=>{const n=Number(e.currentTarget.value);if(Number.isInteger(n)&&n>0&&n<=8)void props.run(()=>api.setPreferences({maxConcurrency:n}));}}/></label><p class="muted">Scheduled work needs Toby running on an awake Mac.</p>
  <Permissions snapshot={props.snapshot} run={props.run}/>
  <h3>Browser workspace</h3><form class="browser-form" onSubmit={e=>{e.preventDefault();void props.run(()=>api.openBrowser(url()));}}><label class="field">Website<input required type="url" placeholder="https://example.com" value={url()} onInput={e=>setUrl(e.currentTarget.value)}/></label><button><ExternalLink size={13}/>Open browser</button></form>
  <Show when={props.snapshot.agents.some(a=>a.hidden)}><h3>Hidden agents</h3><For each={props.snapshot.agents.filter(a=>a.hidden)}>{a=><div class="member"><Avatar agent={a}/><div><strong>{a.name}</strong><small>History and workspace retained</small></div><button onClick={()=>props.run(()=>api.setAgentVisibility(a.id,{hidden:false}))}>Restore</button></div>}</For></Show>
  <h3>Storage</h3><p class="muted path">{props.snapshot.dataPath}</p><button onClick={()=>props.run(()=>api.openWorkspace())}><FolderOpen size={14}/>Open workspace in Finder</button>
  <section class="settings-reset"><h3>Start over</h3><p class="muted">Delete Toby’s local data and return to onboarding. You’ll be asked to confirm.</p><button type="button" class="danger" disabled={resetting()} onClick={resetToby}>{resetting()?'Resetting…':'Reset Toby…'}</button></section>
 </div>;
}
function Files(props:{agent?:Agent;run:Runner}) {
 const [files,setFiles]=createSignal<{name:string;directory:boolean;path:string}[]>([]);const [path,setPath]=createSignal('');const [preview,setPreview]=createSignal('');const [filename,setFilename]=createSignal('');const [loading,setLoading]=createSignal(false);let generation=0;
 async function load(next:string){const id=props.agent?.id;if(!id)return;const ticket=++generation;setLoading(true);await props.run(async()=>{const result=await api.listFiles(id,next);if(ticket===generation){setFiles(result);setPath(next);}});if(ticket===generation)setLoading(false);}
 const fileAgentId=createMemo(()=>props.agent?.id);
 createEffect(()=>{fileAgentId();generation++;setFiles([]);setPath('');setPreview('');setFilename('');untrack(()=>void load(''));});
 onCleanup(()=>{generation++;});
 return <><div class="row"><h3>Files</h3><button disabled={!props.agent} onClick={()=>load(path())}>Refresh</button></div><Show when={props.agent} fallback={<p class="muted">Choose an agent to browse its workspace.</p>}><div class="actions"><button onClick={()=>props.run(()=>api.openWorkspace(props.agent!.id))}>Open in Finder</button><button onClick={()=>props.run(()=>api.chooseWorkspace(props.agent!.id))}>Choose folder</button></div><p class="muted path">/{path()}</p><Show when={path()}><button class="file-row" onClick={()=>load(path().split('/').slice(0,-1).join('/'))}><FolderOpen size={14}/>Parent folder</button></Show><Show when={loading()}><p class="muted">Loading files…</p></Show><For each={files()}>{file=><button class="file-row" onClick={()=>file.directory?load(file.path):props.run(async()=>{const id=props.agent!.id;const text=await api.readFile(id,file.path);if(props.agent?.id===id){setFilename(file.name);setPreview(text);}})}><span>{file.directory?<Folder size={15}/>:<FileText size={15}/>}</span>{file.name}</button>}</For><Show when={!files().length&&!loading()}><p class="muted">No files in this folder.</p></Show><Show when={filename()}><div class="row"><h3>{filename()}</h3><button aria-label="Close file preview" onClick={()=>setFilename('')}><X size={15}/></button></div><pre class="file-preview">{preview()}</pre></Show></Show></>;
}
function Library(props:{kind:Panel;snapshot:Snapshot;agent?:Agent;group?:Group;run:Runner}) {
 const [editing,setEditing]=createSignal(false);
 const singular=()=>props.kind==='memory'?'memory':props.kind==='skills'?'skill':props.kind==='routines'?'routine':'connector';
 const [id,setId]=createSignal<string>();const [name,setName]=createSignal('');const [text,setText]=createSignal('');const [owner,setOwner]=createSignal('');const [interval,setInterval]=createSignal(60);const [enabled,setEnabled]=createSignal(true);const [args,setArgs]=createSignal('');const [busy,setBusy]=createSignal(false);
 function reset(){setEditing(false);setId(undefined);setName('');setText('');setOwner(props.group?.id??props.agent?.id??props.snapshot.agents[0]?.id??'');setInterval(60);setEnabled(true);setArgs('');}
 const libraryAgentId=createMemo(()=>props.agent?.id);
 createEffect(()=>{props.kind;libraryAgentId();props.group?.id;untrack(reset);});
 const entries=createMemo(()=>props.kind==='memory'?props.snapshot.memories.filter(m=>m.agentId===props.agent?.id).map(m=>({id:m.id,name:props.agent?.name??'Memory',text:m.text})):props.kind==='skills'?props.snapshot.skills.map(s=>({id:s.id,name:s.name,text:s.instructions})):props.kind==='routines'?props.snapshot.routines.map(r=>({id:r.id,name:r.name,text:r.prompt})):props.snapshot.connectors.map(c=>({id:c.id,name:c.name,text:c.enabled?'Available to your agents':'Paused'})));
 function edit(entry:{id:string;name:string;text:string}){setEditing(true);setId(entry.id);setName(entry.name);setText(entry.text);if(props.kind==='routines'){const r=props.snapshot.routines.find(r=>r.id===entry.id)!;setOwner(r.chatId??r.agentId);setInterval(r.intervalMinutes);setEnabled(r.enabled);}if(props.kind==='connectors'){const c=props.snapshot.connectors.find(c=>c.id===entry.id)!;setText(c.command);setArgs(c.args.join('\n'));setEnabled(c.enabled);}}
 async function save(){setBusy(true);await props.run(async()=>{if(props.kind==='memory'){if(!props.agent)throw Error('Choose an agent first.');await api.saveMemory({id:id(),agentId:props.agent.id,text:text()});}else if(props.kind==='skills')await api.saveSkill({id:id(),name:name(),instructions:text()});else if(props.kind==='routines'){const target=props.snapshot.groups.find(g=>g.id===owner());await api.saveRoutine({id:id(),name:name(),agentId:target?(target.leadAgentId??target.members[0]):owner(),chatId:target?.id,prompt:text(),intervalMinutes:interval(),enabled:enabled()});}else await api.saveConnector({id:id(),name:name(),command:text(),args:args().split('\n').filter(Boolean),enabled:enabled()});reset();});setBusy(false);}
 return <><div class="row"><h3>{props.kind==='memory'?`${props.agent?.name??'Agent'}'s memory`:props.kind[0].toUpperCase()+props.kind.slice(1)}</h3><Show when={!editing()}><button onClick={()=>{reset();setEditing(true);}}>Add {singular()}</button></Show></div><p class="muted">{props.kind==='memory'?'Review, correct, or forget the context your agent keeps.':props.kind==='skills'?'Reusable instructions available to your agents.':props.kind==='routines'?'Scheduled work runs while Toby is open and your Mac is awake.':'Connect apps and services through a local connector. Connectors run on this Mac.'}</p><For each={entries()}>{entry=><section class="task"><strong>{entry.name}</strong><p class="entry-text">{entry.text}</p><Show when={props.kind==='routines'}>{(()=>{const r=props.snapshot.routines.find(r=>r.id===entry.id)!;return <p class="muted">{r.enabled?`Every ${r.intervalMinutes} min · next ${time(r.nextRun)}`:'Paused'}</p>;})()}</Show><div class="actions"><button onClick={()=>edit(entry)}>Edit</button><Show when={props.kind==='routines'}><button onClick={()=>props.run(async()=>{const r=props.snapshot.routines.find(r=>r.id===entry.id)!;await api.saveRoutine({...r,enabled:!r.enabled});})}>{props.snapshot.routines.find(r=>r.id===entry.id)?.enabled?'Pause':'Resume'}</button><button onClick={()=>props.run(async()=>{const r=props.snapshot.routines.find(r=>r.id===entry.id)!;await api.send(r.chatId??r.agentId,r.prompt);})}>Run now</button></Show><button class="danger" onClick={()=>props.run(async()=>{if(props.kind==='memory')await api.deleteMemory(entry.id);else if(props.kind==='skills')await api.deleteSkill(entry.id);else if(props.kind==='routines')await api.deleteRoutine(entry.id);else await api.deleteConnector(entry.id);if(id()===entry.id)reset();})}>Remove</button></div></section>}</For><Show when={!entries().length}><p class="empty-list">Nothing saved yet.</p></Show><Show when={editing()}><form class="stack-form library-form" onSubmit={e=>{e.preventDefault();void save();}}><h3>{id()?'Edit':'Add'} {props.kind==='memory'?'memory':props.kind==='skills'?'skill':props.kind==='routines'?'routine':'connector'}</h3><Show when={props.kind!=='memory'}><label>Name<input required value={name()} onInput={e=>setName(e.currentTarget.value)}/></label></Show><Show when={props.kind==='routines'}><label>Send to<select required aria-label="Routine destination" value={owner()} onChange={e=>setOwner(e.currentTarget.value)}><For each={props.snapshot.agents}>{a=><option value={a.id}>{a.name}</option>}</For><For each={props.snapshot.groups}>{g=><option value={g.id}>{g.name} (channel)</option>}</For></select></label><label>Interval in minutes<input type="number" required min="1" value={interval()} onInput={e=>setInterval(Number(e.currentTarget.value))}/></label></Show><label>{props.kind==='connectors'?'Executable command':props.kind==='memory'?'What should your agent remember?':'Instructions'}<textarea required value={text()} onInput={e=>setText(e.currentTarget.value)}/></label><Show when={props.kind==='connectors'}><label>Arguments <span>one per line</span><textarea value={args()} onInput={e=>setArgs(e.currentTarget.value)} placeholder="/path/to/mcp-server"/></label></Show><Show when={props.kind==='connectors'||props.kind==='routines'}><label class="check"><input type="checkbox" checked={enabled()} onChange={e=>setEnabled(e.currentTarget.checked)}/> Enabled</label></Show><button class="primary" disabled={busy()||!text().trim()||(props.kind==='memory'&&!props.agent)}>{busy()?'Saving…':'Save'}</button><button type="button" class="text-button" disabled={busy()} onClick={reset}>Cancel</button></form></Show></>;
}
