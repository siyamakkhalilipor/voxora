let unregisterFn: (()=>Promise<void>) | null = null;
export async function registerGlobalPtt(shortcut:string,onPressed:(pressed:boolean)=>void) {
  if (!('__TAURI_INTERNALS__' in window)) return false;
  try {
    const mod = await import('@tauri-apps/plugin-global-shortcut');
    await mod.unregisterAll();
    await mod.register(shortcut, event => onPressed(event.state === 'Pressed'));
    unregisterFn = async () => { await mod.unregister(shortcut); };
    return true;
  } catch (error) { console.warn('Global PTT unavailable', error); return false; }
}
export async function unregisterGlobalPtt() { if (unregisterFn) await unregisterFn(); unregisterFn=null; }
