import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, CirclePlus, Headphones, LogOut, Mic, MicOff, Radio, Send, Settings, Shield, Signal, Trash2, UserRound, Volume2 } from 'lucide-react';
import type { ClientEvent, ServerEvent, VoxoraChannel } from '@voxora/protocol';
import { api, getServerUrl, getWsUrl, setServerUrl } from './api';
import { voiceSession, type AudioMode } from './audio';
import { registerGlobalPtt, unregisterGlobalPtt } from './hotkeys';
import { useAppStore } from './store';
import './styles.css';

function channelChildren(channels:VoxoraChannel[], parent:string|null) { return channels.filter(c=>c.parentChannelId===parent).sort((a,b)=>a.order-b.order); }

export default function App() {
  const {sessionToken,self,state,connected,messages,setSession,apply,setConnected,clear}=useAppStore();
  const [nickname,setNickname]=useState(''); const [adminKey,setAdminKey]=useState(''); const [serverAddress,setServerAddress]=useState(getServerUrl()); const [error,setError]=useState('');
  const [joining,setJoining]=useState<string|null>(null); const [expanded,setExpanded]=useState<Set<string>>(new Set(['gaming','community']));
  const [muted,setMuted]=useState(false); const [deafened,setDeafened]=useState(false); const [mode,setMode]=useState<AudioMode>('ptt'); const [pttDown,setPttDown]=useState(false);
  const [chatText,setChatText]=useState(''); const [showCreate,setShowCreate]=useState(false); const [newChannel,setNewChannel]=useState('');
  const wsRef=useRef<WebSocket|null>(null);

  const send=(event:ClientEvent)=>{ const ws=wsRef.current; if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify(event)); };

  useEffect(()=>{
    if(!sessionToken) return;
    const ws=new WebSocket(`${getWsUrl()}/ws?session=${encodeURIComponent(sessionToken)}`); wsRef.current=ws;
    ws.onopen=()=>setConnected(true); ws.onclose=()=>setConnected(false); ws.onmessage=e=>{try{apply(JSON.parse(e.data) as ServerEvent)}catch{}};
    return()=>{ws.close();wsRef.current=null};
  },[sessionToken,apply,setConnected]);

  useEffect(()=>{
    voiceSession.speakingListener=(identity,speaking)=>{ if(identity===self?.id) send({type:'presence.speaking',speaking}); };
    return()=>{ voiceSession.speakingListener=null; };
  },[self?.id]);

  useEffect(()=>{
    const setTransmit=async(active:boolean)=>{ if(mode!=='ptt'||muted)return; setPttDown(active); await voiceSession.setMicrophone(active); send({type:'presence.speaking',speaking:active}); };
    const keydown=(e:KeyboardEvent)=>{ if(e.code==='Space'&&!e.repeat&&!['INPUT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {e.preventDefault();void setTransmit(true);} };
    const keyup=(e:KeyboardEvent)=>{ if(e.code==='Space') {e.preventDefault();void setTransmit(false);} };
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
    void registerGlobalPtt('Alt+V',active=>void setTransmit(active));
    return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);void unregisterGlobalPtt();};
  },[mode,muted]);

  useEffect(()=>{ if(mode==='continuous'&&!muted) void voiceSession.setMicrophone(true); else if(mode==='vad'&&!muted) void voiceSession.setMicrophone(true); else if(mode==='ptt') void voiceSession.setMicrophone(false); },[mode,muted]);

  async function connect(){setError('');try{setServerUrl(serverAddress);await api.health();const res=await api.connect(nickname,adminKey);setSession(res.sessionToken,res.user,res.state);}catch(e){setError(e instanceof Error?e.message:'Connection failed')}}
  async function joinChannel(channelId:string){if(!sessionToken)return;setJoining(channelId);setError('');try{const creds=await api.voiceJoin(sessionToken,channelId);await voiceSession.connect(creds);if(mode!=='ptt'&&!muted)await voiceSession.setMicrophone(true);}catch(e){setError(e instanceof Error?e.message:'Voice join failed')}finally{setJoining(null)}}
  async function disconnect(){await voiceSession.disconnect();wsRef.current?.close();clear();}
  async function toggleMute(){const next=!muted;setMuted(next);await voiceSession.setMicrophone(next?false:mode!=='ptt');send({type:'presence.audio_state',muted:next,deafened});}
  function toggleDeafen(){const next=!deafened;setDeafened(next);voiceSession.setDeafened(next);send({type:'presence.audio_state',muted,deafened:next});}
  async function createChannel(){if(!sessionToken||!newChannel.trim())return;try{await api.createChannel(sessionToken,{name:newChannel.trim(),parentChannelId:null,maxUsers:null});setNewChannel('');setShowCreate(false);}catch(e){setError(e instanceof Error?e.message:'Create failed')}}
  function sendChat(){if(!chatText.trim())return;send({type:'message.send',scope:self?.channelId?'channel':'server',channelId:self?.channelId??undefined,text:chatText});setChatText('');}

  const canAdmin=self?.role==='owner'||self?.role==='admin';
  const channelMessages=useMemo(()=>messages.filter(m=>m.scope==='server'||(self?.channelId&&m.channelId===self.channelId)),[messages,self?.channelId]);

  if(!sessionToken||!self||!state) return <div className="login-shell"><div className="brand-orb"/><div className="login-card"><div className="logo-mark"><Radio size={28}/></div><p className="eyebrow">VOICE COMMUNICATION</p><h1>Voxora</h1><p className="subtitle">Fast, private, self-hosted voice channels. No account required.</p><label>Server address<input value={serverAddress} onChange={e=>setServerAddress(e.target.value)} placeholder="voice.example.com:8787"/></label><label>Nickname<input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Your nickname" onKeyDown={e=>e.key==='Enter'&&void connect()}/></label><label>Admin key <span>optional</span><input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)} placeholder="Leave empty for Guest"/></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={nickname.trim().length<2} onClick={()=>void connect()}><Signal size={18}/> Connect to server</button><div className="login-note">Connect to any Voxora server · WebRTC / Opus via LiveKit</div></div></div>;

  function renderChannel(channel:VoxoraChannel,depth=0):React.ReactNode {
    const children=channelChildren(state.channels,channel.id); const users=state.users.filter(u=>u.channelId===channel.id); const open=expanded.has(channel.id);
    return <div key={channel.id} className="channel-group"><div className={`channel-row ${self.channelId===channel.id?'active':''}`} style={{paddingLeft:12+depth*16}} onDoubleClick={()=>void joinChannel(channel.id)}>{children.length?<button className="chev" onClick={()=>setExpanded(s=>{const n=new Set(s);n.has(channel.id)?n.delete(channel.id):n.add(channel.id);return n})}>{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>:<span className="chev-space"/>}<Volume2 size={15}/><span className="channel-name">{channel.name}</span><span className="count">{users.length}{channel.maxUsers?`/${channel.maxUsers}`:''}</span>{joining===channel.id&&<span className="pulse-dot"/>}{canAdmin&&!['lobby','gaming','community','afk'].includes(channel.id)&&<button className="row-action" title="Delete channel" onClick={e=>{e.stopPropagation();void api.deleteChannel(sessionToken,channel.id)}}><Trash2 size={13}/></button>}</div>{users.map(u=><div className="user-row" key={u.id} style={{paddingLeft:42+depth*16}}><span className={`avatar ${u.speaking?'speaking':''}`}>{u.nickname.slice(0,1).toUpperCase()}</span><span>{u.nickname}</span>{u.role==='owner'&&<Shield size={13} className="owner"/>}{u.muted&&<MicOff size={12}/>}<span className="role">{u.role}</span>{canAdmin&&u.id!==self.id&&<button className="kick" onClick={()=>void api.kick(sessionToken,u.id)} title="Kick"><LogOut size={12}/></button>}</div>)}{open&&children.map(c=>renderChannel(c,depth+1))}</div>;
  }

  return <div className="app-shell">
    <aside className="server-rail"><div className="logo-small"><Radio size={20}/></div><button className="server-pill active">VD</button><button className="server-pill add"><CirclePlus size={19}/></button><div className="rail-spacer"/><button className="icon-btn"><Settings size={19}/></button></aside>
    <section className="channels-panel"><header><div><p className="eyebrow">CONNECTED SERVER</p><h2>{state.server.name}</h2></div><div className={`status ${connected?'online':'offline'}`}><span/>{connected?'Connected':'Reconnecting'}</div></header><div className="welcome">{state.server.welcomeMessage}</div><div className="section-title"><span>VOICE CHANNELS</span>{canAdmin&&<button onClick={()=>setShowCreate(v=>!v)}><CirclePlus size={15}/></button>}</div>{showCreate&&<div className="create-row"><input autoFocus value={newChannel} onChange={e=>setNewChannel(e.target.value)} placeholder="Channel name" onKeyDown={e=>e.key==='Enter'&&void createChannel()}/><button onClick={()=>void createChannel()}>Create</button></div>}<div className="tree">{channelChildren(state.channels,null).map(c=>renderChannel(c))}</div></section>
    <main className="main-panel"><header className="main-header"><div><p className="eyebrow">CURRENT CHANNEL</p><h2>{state.channels.find(c=>c.id===self.channelId)?.name??'Not in voice'}</h2></div><div className="latency"><Signal size={15}/> Voice ready</div></header><div className="hero"><div className={`talk-ring ${pttDown?'active':''}`}><Mic size={42}/></div><h3>{self.channelId?'You are in voice':'Join a voice channel'}</h3><p>{self.channelId?(mode==='ptt'?'Hold Space or Alt+V to talk.':'Microphone transmission is active.'):'Double-click a channel on the left to connect your audio.'}</p></div><div className="people-grid">{state.users.filter(u=>u.channelId===self.channelId&&self.channelId).map(u=><div className={`person-card ${u.speaking?'speaking':''}`} key={u.id}><div className="person-avatar">{u.nickname[0]?.toUpperCase()}</div><div><strong>{u.nickname}</strong><span>{u.speaking?'Speaking':u.role}</span></div>{u.speaking?<Mic size={16}/>:<UserRound size={16}/>}</div>)}</div>{error&&<div className="inline-error">{error}</div>}</main>
    <aside className="chat-panel"><header><div><p className="eyebrow">TEXT CHAT</p><h3>{self.channelId?'Channel chat':'Server chat'}</h3></div></header><div className="messages">{channelMessages.length===0&&<div className="empty-chat">No messages yet.<br/>Voice is the main event here.</div>}{channelMessages.map(m=><div className="message" key={m.id}><div><strong>{m.senderName}</strong><time>{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.text}</p></div>)}</div><div className="composer"><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Message…"/><button onClick={sendChat}><Send size={16}/></button></div></aside>
    <footer className="control-bar"><div className="identity"><span className="avatar self">{self.nickname[0]?.toUpperCase()}</span><div><strong>{self.nickname}</strong><span>{self.role}</span></div></div><div className="controls"><button className={muted?'danger':''} onClick={()=>void toggleMute()}>{muted?<MicOff/>:<Mic/>}<span>{muted?'Unmute':'Mute'}</span></button><button className={deafened?'danger':''} onClick={toggleDeafen}><Headphones/><span>{deafened?'Undeafen':'Deafen'}</span></button><select value={mode} onChange={e=>setMode(e.target.value as AudioMode)}><option value="ptt">Push to Talk</option><option value="vad">Voice Activation</option><option value="continuous">Continuous</option></select></div><div className="connection"><span className="quality-bars"><i/><i/><i/></span><div><strong>Excellent</strong><span>{self.channelId?'Voice connected':'Control connected'}</span></div><button className="disconnect" onClick={()=>void disconnect()}><LogOut size={17}/></button></div></footer>
  </div>;
}
