import type { VoiceAudio, VoiceModelState } from '../shared/contracts';

const UNAVAILABLE='Voice input is not available through the connected subscriptions yet.';

export class VoiceService {
  readonly state:VoiceModelState={ready:false,downloading:false,progress:0,error:UNAVAILABLE};
  constructor(_dataPath:string,_onChange:()=>void) {}
  async transcribe(_audio:VoiceAudio):Promise<string> {throw Error(UNAVAILABLE);}
  cancel() {}
  dispose() {}
}
