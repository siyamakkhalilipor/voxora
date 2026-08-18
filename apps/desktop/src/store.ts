import { create } from 'zustand';
import type { ServerEvent, ServerState, VoxoraUser } from '@voxora/protocol';

type Message = Extract<ServerEvent,{type:'message.created'}>;
interface AppState {
  sessionToken: string | null;
  self: VoxoraUser | null;
  state: ServerState | null;
  connected: boolean;
  messages: Message[];
  setSession(token:string,user:VoxoraUser,state:ServerState):void;
  apply(event:ServerEvent):void;
  setConnected(value:boolean):void;
  clear():void;
}
export const useAppStore = create<AppState>((set) => ({
  sessionToken:null,self:null,state:null,connected:false,messages:[],
  setSession:(sessionToken,self,state)=>set({sessionToken,self,state,connected:true}),
  setConnected:(connected)=>set({connected}),
  clear:()=>set({sessionToken:null,self:null,state:null,connected:false,messages:[]}),
  apply:(event)=>set(current=>{
    if (event.type==='state.snapshot') return {state:event.state};
    if (event.type==='message.created') return {messages:[...current.messages,event].slice(-100)};
    if (!current.state) return {};
    const state = current.state;
    if (event.type==='user.joined') return {state:{...state,users:[...state.users.filter(u=>u.id!==event.user.id),event.user]}};
    if (event.type==='user.left') return {state:{...state,users:state.users.filter(u=>u.id!==event.userId)}};
    if (event.type==='moderation.kicked') return {state:{...state,users:state.users.filter(u=>u.id!==event.userId)}};
    if (event.type==='user.updated') return {state:{...state,users:state.users.map(u=>u.id===event.user.id?event.user:u)}, self:current.self?.id===event.user.id?event.user:current.self};
    if (event.type==='channel.created') return {state:{...state,channels:[...state.channels,event.channel]}};
    if (event.type==='channel.deleted') return {state:{...state,channels:state.channels.filter(c=>c.id!==event.channelId)}};
    return {};
  })
}));
