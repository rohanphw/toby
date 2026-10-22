export type Provider = 'openai' | 'grok';
export type AgentStatus = 'idle' | 'queued' | 'working' | 'waiting' | 'failed';
export interface Agent { id: string; name: string; personality: string; specialization: string; provider: Provider; model: string; avatar: string; status: AgentStatus; workspace: string; createdAt: number; pinned?: boolean; hidden?: boolean; }
export interface Group { id: string; name: string; instructions: string; members: string[]; createdAt: number; }
export interface Attachment { id: string; name: string; path: string; bytes: number; agentId: string; }
export interface SendOptions { voice?: boolean; replyTo?: string; attachments?: string[]; }
export interface Message { id: string; chatId: string; senderId: string; role: 'user' | 'assistant' | 'system' | 'tool'; text: string; createdAt: number; status?: 'streaming' | 'done' | 'failed'; correlationId?: string; activity?: { title: string; detail?: string }; replyTo?: string; attachments?: Attachment[]; reactions?: string[]; }
export interface Task { id: string; chatId: string; agentId: string; prompt: string; displayPrompt?: string; status: 'queued' | 'running' | 'done' | 'failed' | 'interrupted'; parentId?: string; rootId?: string; hops?: number; result?: string; createdAt: number; }
export interface Routine { id: string; name: string; agentId: string; prompt: string; intervalMinutes: number; nextRun: number; enabled: boolean; }
export interface Skill { id: string; name: string; instructions: string; }
export interface Memory { id: string; agentId: string; text: string; }
export interface Connector { id: string; name: string; command: string; args: string[]; enabled: boolean; }
export interface Approval { id: string; agentId: string; title: string; detail: string; technicalDetails?: string; canApprove?: boolean; }
export interface ProviderSetup { phase: 'downloading' | 'verifying' | 'failed'; progress: number; downloadedBytes: number; totalBytes: number; error?: string; }
export interface ProviderState { provider: Provider; installed: boolean; connected: boolean; models: { id: string; name: string }[]; error?: string; authUrl?: string; setup?: ProviderSetup; }
export interface Preferences { onboardingComplete: boolean; autoCreateAgents: boolean; maxConcurrency: number; voice: string; }
export interface PermissionState { microphone: string; accessibility: boolean; screen: string; }
export interface VoiceModelState { ready: boolean; downloading: boolean; progress: number; error?: string; }
export interface Snapshot { agents: Agent[]; groups: Group[]; messages: Message[]; tasks: Task[]; routines: Routine[]; skills: Skill[]; memories: Memory[]; connectors: Connector[]; approvals: Approval[]; providers: ProviderState[]; preferences: Preferences; permissions: PermissionState; voiceModels: VoiceModelState; dataPath: string; }
export type AgentInput = Pick<Agent,'name' | 'personality' | 'specialization' | 'provider' | 'model'> & { avatar?: string; id?: string };
export interface VoiceAudio { samples: number[]; sampleRate: number; }
export interface TobyAPI {
 snapshot(): Promise<Snapshot>;
 onSuspend(callback: () => void): () => void;
 onChange(callback: (snapshot: Snapshot) => void): () => void;
 onMessage?(callback: (message: Message) => void): () => void;
 saveAgent(input: AgentInput): Promise<Agent>;
 deleteAgent(id: string): Promise<void>;
 saveGroup(input: { id?: string; name: string; instructions: string; members: string[] }): Promise<Group>;
 send(chatId: string, text: string, options?: SendOptions): Promise<void>;
 setAgentVisibility(id: string, options: { pinned?: boolean; hidden?: boolean }): Promise<void>;
 chooseAttachments(chatId: string): Promise<Attachment[]>;
 openAttachment(id: string): Promise<void>;
 toggleReaction(messageId: string, emoji: string): Promise<void>;
 stop(chatId: string): Promise<void>;
 resumeTask(id: string, agentId?: string): Promise<void>;
 setPreferences(input: Partial<Preferences>): Promise<void>;
 resetApp(): Promise<boolean>;
 connectProvider(provider: Provider): Promise<void>;
 refreshProviders(): Promise<void>;
 prepareProvider(provider: Provider): Promise<void>;
 requestPermission(kind: 'microphone' | 'accessibility' | 'screen'): Promise<PermissionState>;
 openPermissionSettings(kind: 'microphone' | 'accessibility' | 'screen'): Promise<void>;
 transcribe(audio: VoiceAudio): Promise<string>;
 cancelVoice(): Promise<void>;
 saveMemory(input: { id?: string; agentId: string; text: string }): Promise<void>;
 deleteMemory(id: string): Promise<void>;
 saveSkill(input: { id?: string; name: string; instructions: string }): Promise<void>;
 deleteSkill(id: string): Promise<void>;
 saveRoutine(input: Omit<Routine,'id' | 'nextRun'> & { id?: string }): Promise<void>;
 deleteRoutine(id: string): Promise<void>;
 saveConnector(input: Omit<Connector,'id'> & { id?: string }): Promise<void>;
 deleteConnector(id: string): Promise<void>;
 resolveApproval(id: string, approved: boolean): Promise<void>;
 openWorkspace(agentId?: string): Promise<void>;
 openExternal(url: string): Promise<void>;
 chooseWorkspace(agentId: string): Promise<void>;
 openBrowser(url: string): Promise<void>;
 listFiles(agentId: string, relativePath?: string): Promise<{name: string; directory: boolean; path: string}[]>;
 readFile(agentId: string, relativePath: string): Promise<string>;
}
declare global { interface Window { toby: TobyAPI; } }
