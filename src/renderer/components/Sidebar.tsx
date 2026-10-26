import { createMemo, createSignal, For, Show } from 'solid-js';
import { Laptop, PanelLeftClose, Pin, Plus, Search, Settings2, X } from 'lucide-solid';
import type { Agent, Group, Message, Snapshot } from '../../shared/contracts';
import { messageText } from '../../shared/activity';
import { agentAvatar } from '../../shared/avatar';
import { IconButton } from './Ui';
import logo from '../../../resources/toby.png';
import './Sidebar.css';

const agentRole = (agent: Agent) => (agent.specialization.trim() || agent.personality.trim() || 'Your thoughtful teammate').split('\n', 1)[0];

function SidebarAvatar(props: { agent: Agent }) {
  return <span class="avatar">{agentAvatar(props.agent)}</span>;
}

export function Sidebar(props: {
  snapshot: Snapshot;
  chatId: string;
  onSelectChat: (id: string) => void;
  onHide: () => void;
  onAddAgent: () => void;
  onCreateGroup: () => void;
  onOpenSettings: () => void;
  onOpenWorkspace: () => void;
  onOpenRoutines: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void | Promise<void>;
}) {
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  let searchInput!: HTMLInputElement;
  let searchButton!: HTMLButtonElement;
  const query = createMemo(() => search().trim().toLowerCase());
  const agents = createMemo(() => props.snapshot.agents.filter((agent, index) => (index === 0 || !agent.hidden) && (!query() || [agent.name, agent.specialization, agent.personality].join(' ').toLowerCase().includes(query()))));
  const groups = createMemo(() => props.snapshot.groups.filter(group => !query() || [group.name, group.instructions, ...group.members.map(id => {
    const agent = props.snapshot.agents.find(item => item.id === id);
    return agent ? `${agent.name} ${agentRole(agent)}` : '';
  })].join(' ').toLowerCase().includes(query())));
  const pinned = createMemo(() => [
    ...agents().filter(agent => agent.pinned).map(agent => ({ id: agent.id, name: agent.name, agent, group: undefined as Group | undefined })),
    ...groups().filter(group => group.pinned).map(group => ({ id: group.id, name: group.name, agent: undefined as Agent | undefined, group })),
  ]);
  const teammates = createMemo(() => agents().filter(agent => !agent.pinned));
  const unpinnedGroups = createMemo(() => groups().filter(group => !group.pinned));
  const previews = createMemo(() => {
    const latest = new Map<string, Message>();
    for (const message of props.snapshot.messages) {
      if (message.audience === 'internal' || (message.role !== 'user' && message.role !== 'assistant')) continue;
      if (!latest.has(message.chatId) || latest.get(message.chatId)!.createdAt <= message.createdAt) latest.set(message.chatId, message);
    }
    return new Map([...latest].map(([id, message]) => [id, messageText(message).replace(/\s+/g, ' ').trim() || (message.attachments?.length ? 'Shared an attachment' : '')]));
  });
  const approvalCount = (id: string) => props.snapshot.approvals.filter(approval => (approval.chatId ?? approval.agentId) === id).length;
  const activeRoutines = () => props.snapshot.routines.filter(routine => routine.enabled).length;
  const members = (group: Group) => group.members.map(id => props.snapshot.agents.find(agent => agent.id === id)).filter((agent): agent is Agent => !!agent);
  function GroupAvatar(props: { group: Group }) {
    return <span class="group-avatar-stack" aria-hidden="true"><For each={members(props.group).slice(0, 3)}>{agent => <SidebarAvatar agent={agent}/>}</For><Show when={!members(props.group).length}><span class="avatar initials">{props.group.name.slice(0, 1).toUpperCase()}</span></Show></span>;
  }
  function AgentAvatar(props: { agent: Agent }) {
    return <span class="roster-avatar"><SidebarAvatar agent={props.agent}/><Show when={props.agent.status !== 'idle'}><span class={`status-dot ${props.agent.status}`} title={props.agent.status}/></Show></span>;
  }
  function PermissionCount(props: { id: string }) {
    return <Show when={approvalCount(props.id)}><span class="permission-count" aria-label={`${approvalCount(props.id)} pending permissions`}>{approvalCount(props.id)}</span></Show>;
  }
  function closeSearch() { setSearch(''); setSearchOpen(false); searchButton?.focus(); }
  function toggleSearch() {
    if (searchOpen()) closeSearch();
    else { setSearchOpen(true); queueMicrotask(() => searchInput?.focus()); }
  }
  return <aside class="sidebar" aria-label="Your workspace">
    <div class="sidebar-toolbar">
      <span class="sidebar-brand"><img src={logo} alt=""/><span>Toby</span></span>
      <IconButton label="Hide sidebar" onClick={props.onHide}><PanelLeftClose size={16}/></IconButton>
    </div>
    <div class="sidebar-tools"><button ref={searchButton} class="sidebar-search-toggle" classList={{ active: searchOpen() }} aria-label="Search team" aria-expanded={searchOpen()} onClick={toggleSearch}><Search size={15}/><span>Search team</span></button><IconButton label="Add agent" onClick={props.onAddAgent}><Plus size={18}/></IconButton></div>
    <Show when={searchOpen()}><div class="roster-search"><Search size={14}/><input ref={searchInput} type="search" aria-label="Search agents and groups" placeholder="Find a teammate or group" value={search()} onInput={event => setSearch(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); if (search()) setSearch(''); else closeSearch(); } }}/><Show when={search()}><button class="icon-button" aria-label="Clear team search" onClick={() => { setSearch(''); searchInput?.focus(); }}><X size={13}/></button></Show></div></Show>
    <div class="sidebar-scroll">
      <Show when={pinned().length}><section class="pinned-section" aria-label="Pinned chats"><div class="section-label"><span>Pinned</span><Pin size={11}/></div><div class="pinned-grid"><For each={pinned()}>{chat => <div class="pinned-chat-container">
        <button class="agent-row pinned-chat" classList={{ selected: props.chatId === chat.id, 'group-row': !!chat.group }} aria-current={props.chatId === chat.id ? 'page' : undefined} onClick={() => props.onSelectChat(chat.id)}>
          <Show when={chat.agent}>{agent => <AgentAvatar agent={agent()}/>}</Show><Show when={chat.group}>{group => <GroupAvatar group={group()}/>}</Show>
          <strong>{chat.name}</strong><small class="role-chip" title={chat.agent ? agentRole(chat.agent) : members(chat.group!).map(agent => agent.name).join(', ')}>{chat.agent ? agentRole(chat.agent) : `${chat.group!.members.length} teammates`}</small>
          <Show when={previews().get(chat.id)}>{preview => <small class="agent-preview">{preview()}</small>}</Show><PermissionCount id={chat.id}/>
        </button>
        <Show when={props.onTogglePin}><button class="pinned-unpin" aria-label={`Unpin ${chat.name}`} title={`Unpin ${chat.name}`} onClick={() => { void props.onTogglePin?.(chat.id, false); }}><Pin size={12}/></button></Show>
      </div>}</For></div></section></Show>
      <Show when={teammates().length}><div class="section-label teammates-label"><span>Teammates</span><span>{teammates().length}</span></div></Show>
      <div class="roster-agents" role="group" aria-label="Agents"><For each={teammates()}>{agent => <button class="agent-row" classList={{ selected: props.chatId === agent.id }} aria-current={props.chatId === agent.id ? 'page' : undefined} onClick={() => props.onSelectChat(agent.id)}>
        <AgentAvatar agent={agent}/><span class="agent-label"><span class="agent-name-line"><strong>{agent.name}</strong></span><small class="agent-preview" title={agentRole(agent)}>{previews().get(agent.id) || agentRole(agent)}</small></span><PermissionCount id={agent.id}/>
      </button>}</For></div>
      <Show when={!query() || unpinnedGroups().length}><div class="section-label groups-label"><span>Groups</span><IconButton label="Create group" onClick={props.onCreateGroup}><Plus size={14}/></IconButton></div></Show>
      <For each={unpinnedGroups()}>{group => <button class="agent-row group-row" classList={{ selected: props.chatId === group.id }} aria-current={props.chatId === group.id ? 'page' : undefined} onClick={() => props.onSelectChat(group.id)}>
        <GroupAvatar group={group}/><span class="agent-label"><span class="agent-name-line"><strong>{group.name}</strong></span><small class="agent-preview">{previews().get(group.id) || members(group).map(agent => agent.name).join(', ')}</small></span><PermissionCount id={group.id}/>
      </button>}</For>
      <Show when={!props.snapshot.groups.length && !query()}><button class="group-empty" onClick={props.onCreateGroup}>Create a shared conversation</button></Show>
      <Show when={query() && !agents().length && !groups().length}><p class="roster-empty" role="status">No teammates or groups found.<small>Try a name or specialization.</small></p></Show>
    </div>
    <div class="sidebar-bottom"><div class="sidebar-shortcuts"><button onClick={props.onOpenSettings}><Settings2 size={15}/><span>Settings</span></button><button aria-label="Open workspace" onClick={props.onOpenWorkspace}><Laptop size={15}/><span>Workspace</span></button></div><div class="host-status"><span class="status-dot idle"/><span>On this Mac</span><Show when={activeRoutines()}><button onClick={props.onOpenRoutines}>{activeRoutines()} active routines</button></Show></div></div>
  </aside>;
}
