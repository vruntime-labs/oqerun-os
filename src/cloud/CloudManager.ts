import { Kernel } from "../core/Kernel";
import { WindowManager } from "../window/WindowManager";
import { GoogleDriveProvider } from "./GoogleDriveProvider";
import { OneDriveProvider } from "./OneDriveProvider";
import { DropboxProvider } from "./DropboxProvider";

type Provider = GoogleDriveProvider | OneDriveProvider | DropboxProvider;

export class CloudManager {
  private readonly WINDOW_ID="cloud-manager";
  private readonly providers:Provider[];
  private readonly messages=new Map<string,string>();

  constructor(private kernel:Kernel,private wm:WindowManager){
    this.providers=[new GoogleDriveProvider(),new OneDriveProvider(),new DropboxProvider()];
    this.providers.forEach(p=>this.messages.set(p.id,"Connect your account through the provider's official authorization page."));
  }

  open():void{
    this.wm.open({id:this.WINDOW_ID,title:"Connected Cloud",width:760,height:560,x:100,y:60,content:this.render()});
    requestAnimationFrame(()=>{this.bindEvents();void this.refreshAll();});
  }

  private render():string{
    return `<div class="cloud-manager">
      <div class="cloud-manager-header"><div><h2>Connected Cloud</h2><p>Connect your own cloud storage accounts directly to Oqerun.</p></div><span class="cloud-manager-badge">DIRECT APIS</span></div>
      <div class="cloud-provider-grid">${this.providers.map(p=>this.renderProvider(p)).join("")}</div>
      <div class="cloud-manager-note"><strong>Your credentials stay server-side.</strong><span>Oqerun sends you to each provider's official authorization page. Passwords, OAuth secrets and refresh tokens are never entered into the OS.</span></div>
    </div>`;
  }

  private renderProvider(provider:Provider):string{
    const icon=provider.id==="google-drive"?"G":provider.id==="onedrive"?"O":"D";
    const label=provider.name;
    return `<section class="cloud-provider-card" data-provider="${provider.id}">
      <div class="cloud-provider-icon cloud-unified-icon">${icon}</div>
      <div class="cloud-provider-body">
        <div class="cloud-provider-title-row"><h3>${label}</h3><span class="cloud-provider-status status-${provider.status}" data-status>${provider.status==="available"?"Ready to connect":"Not configured"}</span></div>
        <p>${provider.description}</p>
        <div class="cloud-provider-services"><span>OAuth 2.0</span><span>Cloudflare KV sessions</span><span>Encrypted tokens</span></div>
        <div class="cloud-security-note"><strong>Security</strong><span>Authentication happens on the provider's official authorization page.</span></div>
        <div class="cloud-provider-selection" data-message>${this.messages.get(provider.id)??""}</div>
        <button class="cloud-provider-action" data-action="connect" type="button">Connect ${label}</button>
        <button class="cloud-provider-action cloud-provider-secondary-action" data-action="disconnect" type="button" style="display:none">Disconnect session</button>
      </div>
    </section>`;
  }

  private bindEvents():void{
    const win=document.getElementById(this.WINDOW_ID);if(!win)return;
    win.querySelectorAll<HTMLElement>("[data-provider]").forEach(card=>{
      const id=card.dataset.provider??"";
      const provider=this.providers.find(p=>p.id===id);if(!provider)return;
      card.querySelector<HTMLButtonElement>('[data-action="connect"]')?.addEventListener("click",()=>void this.connect(provider));
      card.querySelector<HTMLButtonElement>('[data-action="disconnect"]')?.addEventListener("click",()=>void this.disconnect(provider));
    });
  }

  private async connect(provider:Provider):Promise<void>{
    this.setMessage(provider.id,"Secure authorization opened. Approve only the permissions you expect.");
    this.refreshCard(provider.id,"connecting");
    try{
      await provider.connect();
      this.setMessage(provider.id,provider.name+" is securely connected to Oqerun.");
      this.kernel.notify.info(provider.name,provider.name+" is now connected.");
      await this.refresh(provider);
    }catch(error){
      this.setMessage(provider.id,error instanceof Error?error.message:provider.name+" connection failed.");
      this.refreshCard(provider.id,"error");
    }
  }

  private async disconnect(provider:Provider):Promise<void>{
    try{
      await provider.disconnect();
      if("clearSessionToken" in provider)provider.clearSessionToken();
      this.setMessage(provider.id,provider.name+" has been disconnected.");
      await this.refresh(provider);
    }catch(error){this.setMessage(provider.id,error instanceof Error?error.message:provider.name+" disconnect failed.");this.refreshCard(provider.id,"error");}
  }

  private async refreshAll(){for(const p of this.providers)await this.refresh(p);}

  private async refresh(provider:Provider):Promise<void>{
    try{
      const status=await provider.getConnectionStatus();
      this.refreshCard(provider.id,status.connected?"connected":provider.status,status.connected);
      if(status.connected)this.setMessage(provider.id,provider.name+" is securely connected to Oqerun.");
      else if(status.error)this.setMessage(provider.id,status.error);
    }catch(error){this.setMessage(provider.id,error instanceof Error?error.message:"Cloud connection status is unavailable.");this.refreshCard(provider.id,"error");}
  }

  private refreshCard(id:string,state:string,connected=false):void{
    const win=document.getElementById(this.WINDOW_ID);const card=win?.querySelector<HTMLElement>('[data-provider="'+id+'"]');if(!card)return;
    const status=card.querySelector<HTMLElement>("[data-status]");const connect=card.querySelector<HTMLButtonElement>('[data-action="connect"]');const disconnect=card.querySelector<HTMLButtonElement>('[data-action="disconnect"]');
    const provider=this.providers.find(p=>p.id===id);
    if(status){status.textContent=connected?"Connected":state==="connecting"?"Connecting…":state==="error"?"Connection error":state==="available"?"Ready to connect":"Not configured";status.className="cloud-provider-status status-"+(connected?"connected":state);}
    if(connect)connect.textContent=connected?"Reconnect "+(provider?.name??""): "Connect "+(provider?.name??"");
    if(disconnect)disconnect.style.display=connected?"":"none";
    const msg=card.querySelector<HTMLElement>("[data-message]");if(msg)msg.textContent=this.messages.get(id)??"";
  }

  private setMessage(id:string,message:string){this.messages.set(id,message);const card=document.getElementById(this.WINDOW_ID)?.querySelector<HTMLElement>('[data-provider="'+id+'"]');const el=card?.querySelector<HTMLElement>("[data-message]");if(el)el.textContent=message;}
}