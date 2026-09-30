import type { CloudProvider, CloudProviderStatus } from "./CloudProvider";
const API="https://oqerun-os.vruntimelabs.workers.dev";
const KEY="oqerun.onedrive.session";
function token(){try{return sessionStorage.getItem(KEY)}catch{return null}} function save(v:string){try{sessionStorage.setItem(KEY,v)}catch{}} function clear(){try{sessionStorage.removeItem(KEY)}catch{}}
export class OneDriveProvider implements CloudProvider {
 readonly id="onedrive"; readonly name="OneDrive"; readonly description="Microsoft OneDrive through Microsoft Graph.";
 get status():CloudProviderStatus{return "available"}
 private url(path:string){return new URL(path,API+"/").toString()} private headers():HeadersInit{const t=token();return t?{Authorization:"Bearer "+t}:{}}
 async connect(){const p=window.open(this.url("/api/cloud/onedrive/connect"),"oqerun-onedrive-connect","popup,width=980,height=760,resizable=yes,scrollbars=yes");if(!p)throw new Error("Allow pop-ups for Oqerun.");if(!await this.waitForConnection())throw new Error("OneDrive authorization finished, but Oqerun could not confirm the session.")}
 async getConnectionStatus(){const r=await fetch(this.url("/api/cloud/onedrive/status"),{credentials:"include",headers:this.headers(),cache:"no-store"});if(!r.ok)throw new Error("OneDrive connection status could not be checked.");return await r.json() as {connected:boolean;provider?:string;error?:string}}
 async disconnect(){const r=await fetch(this.url("/api/cloud/onedrive/disconnect"),{credentials:"include",headers:this.headers()});if(!r.ok)throw new Error("OneDrive session could not be disconnected.");clear()}
 setSessionToken(v:string){if(/^[A-Za-z0-9_-]+$/.test(v))save(v)} clearSessionToken(){clear()}
 async waitForConnection(timeout=120000){const start=Date.now();while(Date.now()-start<timeout){try{if((await this.getConnectionStatus()).connected)return true}catch{}await new Promise(r=>setTimeout(r,1200))}return false}
 constructor(){window.addEventListener("message",(e)=>{if(e.origin===new URL(API).origin&&e.data?.source==="oqerun-cloud"&&e.data?.type==="onedrive-connected"&&typeof e.data.sessionId==="string")this.setSessionToken(e.data.sessionId)})}
}