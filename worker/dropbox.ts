import { corsHeaders, decryptSecret, encryptSecret, json, randomHex, readCookie, serializeCookie, validId } from "./google";

const SESSION_COOKIE = "oqerun_dropbox_session";
const STATE_TTL = 600;
const SESSION_TTL = 60 * 60 * 24 * 30;
export interface DropboxEnv { OQERUN_KV: KVNamespace; DROPBOX_APP_KEY?: string; DROPBOX_APP_SECRET?: string; OQERUN_TOKEN_ENCRYPTION_KEY: string; }
type SessionRecord = { provider: "dropbox"; refreshToken: string; createdAt: string };

function missing(env: DropboxEnv) { return !env.DROPBOX_APP_KEY?.trim() || !env.DROPBOX_APP_SECRET?.trim(); }
function redirectUri(request: Request) { return new URL("/api/cloud/dropbox/callback", request.url).toString(); }
function callbackHtml(message: string, success: boolean, sessionId?: string) {
  const safe = message.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const payload = JSON.stringify({ source:"oqerun-cloud", type:success?"dropbox-connected":"dropbox-error", sessionId:sessionId ?? null });
  return new Response('<!doctype html><html><body style="font-family:system-ui;background:#07112c;color:#eef4ff;display:grid;place-items:center;min-height:100vh"><main style="text-align:center"><h1>Oqerun Cloud</h1><p>'+safe+'</p><p>You can close this window.</p></main><script>try{if(window.opener)window.opener.postMessage('+payload+',"https://vruntime-labs.github.io")}catch{};if('+success+')setTimeout(()=>window.close(),900)</script></body></html>',{status:success?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
async function session(request: Request, env: DropboxEnv) {
  const auth=request.headers.get("Authorization")??"";
  const bearer=auth.startsWith("Bearer ")?auth.slice(7).trim():null;
  const id=validId(bearer)?bearer:readCookie(request,SESSION_COOKIE);
  if(!id)return null;
  const raw=await env.OQERUN_KV.get("oqerun:cloud:dropbox:session:"+id);
  if(!raw)return null;
  const record=JSON.parse(raw) as SessionRecord;
  return record.provider==="dropbox"&&record.refreshToken?{id,record}:null;
}
async function accessToken(request:Request,env:DropboxEnv){
  const s=await session(request,env); if(!s)return null;
  const refresh=await decryptSecret(s.record.refreshToken,env);
  const r=await fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({refresh_token:refresh,grant_type:"refresh_token",client_id:env.DROPBOX_APP_KEY!.trim(),client_secret:env.DROPBOX_APP_SECRET!.trim()}).toString()});
  const d=await r.json() as {access_token?:string};
  if(!r.ok||!d.access_token)throw new Error("The Dropbox session has expired. Please reconnect Dropbox.");
  return d.access_token;
}
async function api(token:string,path:string,body:unknown){
  return fetch("https://api.dropboxapi.com/2/"+path,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
export function options(request:Request){return new Response(null,{status:204,headers:corsHeaders(request)});}
export async function connect(request:Request,env:DropboxEnv){
  if(missing(env))return json(request,{ok:false,error:"Dropbox is not configured on the Cloudflare Worker."},503);
  const state=randomHex(); await env.OQERUN_KV.put("oqerun:cloud:dropbox:state:"+state,state,{expirationTtl:STATE_TTL});
  const u=new URL("https://www.dropbox.com/oauth2/authorize");
  u.searchParams.set("client_id",env.DROPBOX_APP_KEY!.trim()); u.searchParams.set("redirect_uri",redirectUri(request)); u.searchParams.set("response_type","code"); u.searchParams.set("token_access_type","offline"); u.searchParams.set("state",state);
  return new Response(null,{status:302,headers:{Location:u.toString(),"Cache-Control":"no-store"}});
}
export async function callback(request:Request,env:DropboxEnv){
  const u=new URL(request.url),code=u.searchParams.get("code"),state=u.searchParams.get("state"),saved=state?await env.OQERUN_KV.get("oqerun:cloud:dropbox:state:"+state):null;
  if(u.searchParams.get("error"))return callbackHtml("Dropbox authorization was not completed.",false);
  if(!code||!state||!saved)return callbackHtml("The Dropbox connection could not be verified. Please try again.",false);
  await env.OQERUN_KV.delete("oqerun:cloud:dropbox:state:"+state);
  if(missing(env))return callbackHtml("Dropbox backend configuration is incomplete.",false);
  try{
    const r=await fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,grant_type:"authorization_code",client_id:env.DROPBOX_APP_KEY!.trim(),client_secret:env.DROPBOX_APP_SECRET!.trim(),redirect_uri:redirectUri(request)}).toString()});
    const d=await r.json() as {refresh_token?:string};
    if(!r.ok||!d.refresh_token)return callbackHtml("Dropbox authorization succeeded, but Oqerun could not create the secure session.",false);
    const id=randomHex();
    await env.OQERUN_KV.put("oqerun:cloud:dropbox:session:"+id,JSON.stringify({provider:"dropbox",refreshToken:await encryptSecret(d.refresh_token,env),createdAt:new Date().toISOString()}),{expirationTtl:SESSION_TTL});
    const response=callbackHtml("Dropbox is connected securely.",true,id);
    response.headers.append("Set-Cookie",serializeCookie(SESSION_COOKIE,id,{httpOnly:true,secure:true,sameSite:"None",path:"/",maxAge:SESSION_TTL}));
    return response;
  }catch(e){return callbackHtml("Dropbox connection failed: "+(e instanceof Error?e.message:"unknown error"),false);}
}
export async function status(request:Request,env:DropboxEnv){return json(request,{connected:!!await session(request,env),provider:"dropbox"});}
export async function disconnect(request:Request,env:DropboxEnv){
  const s=await session(request,env); if(s)await env.OQERUN_KV.delete("oqerun:cloud:dropbox:session:"+s.id);
  const h=corsHeaders(request);h.set("Cache-Control","no-store");h.append("Set-Cookie",serializeCookie(SESSION_COOKIE,"",{httpOnly:true,secure:true,sameSite:"None",path:"/",maxAge:0}));
  return Response.json({connected:false},{headers:h});
}
export async function files(request:Request,env:DropboxEnv){
  try{
    const token=await accessToken(request,env); if(!token)return json(request,{ok:false,error:"Dropbox is not connected."},401);
    const parent=new URL(request.url).searchParams.get("parentId");
    const path=parent&&parent!=="root"?parent:"";
    const r=await api(token,"files/list_folder",{path});
    const d=await r.json() as {entries?:Array<{id?:string;name?:string;".tag"?:string;size?:number;server_modified?:string;path_display?:string}>;cursor?:string;error_summary?:string};
    if(!r.ok)return json(request,{ok:false,error:"Dropbox request failed ("+r.status+"): "+(d.error_summary??"unknown error")},r.status===401?401:502);
    return json(request,{ok:true,provider:"dropbox",files:(d.entries??[]).map(i=>({id:i.path_display??i.id,name:i.name,mimeType:i[".tag"]==="folder"?"folder":"file",size:i.size,modifiedTime:i.server_modified,path:i.path_display})),nextPageToken:d.cursor??null});
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"Dropbox unavailable."},503);}
}
export async function contentGet(request:Request,env:DropboxEnv){
  try{
    const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"Dropbox is not connected."},401);
    const id=new URL(request.url).searchParams.get("fileId");if(!id)return json(request,{ok:false,error:"A Dropbox file id is required."},400);
    const r=await fetch("https://content.dropboxapi.com/2/files/download",{method:"POST",headers:{Authorization:"Bearer "+token,"Dropbox-API-Arg":JSON.stringify({path:id})}});
    if(!r.ok)return json(request,{ok:false,error:"Dropbox could not download this file."},r.status===401?401:502);
    const h=corsHeaders(request);h.set("Cache-Control","private,no-store");h.set("Content-Type",r.headers.get("Content-Type")??"application/octet-stream");
    return new Response(r.body,{headers:h});
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"Dropbox content unavailable."},503);}
}
export async function createFolder(request:Request,env:DropboxEnv){
  try{
    const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"Dropbox is not connected."},401);
    const b=await request.json() as {name?:string;parentId?:string};
    const parent=b.parentId&&b.parentId!=="root"?b.parentId:"";
    const path=(parent+"/"+(b.name??"").trim()).replace(/^\\/,"/");
    const r=await api(token,"files/create_folder_v2",{path});
    const d=await r.json();
    return json(request,r.ok?{ok:true,file:d.metadata}:{ok:false,error:"Dropbox could not create the folder."},r.ok?200:502);
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"Dropbox folder creation failed."},503);}
}
export async function contentPost(request:Request,env:DropboxEnv){
  try{
    const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"Dropbox is not connected."},401);
    const form=await request.formData(),file=form.get("file"),name=String(form.get("name")??"").trim(),parent=String(form.get("parentId")??"");
    if(!(file instanceof File)||!name)return json(request,{ok:false,error:"A file and file name are required."},400);
    if(file.size>4*1024*1024)return json(request,{ok:false,error:"Cloud uploads are currently limited to 4 MB."},413);
    const path=((parent?parent:"")+"/"+name).replace(/^\\/,"/");
    const r=await fetch("https://content.dropboxapi.com/2/files/upload",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/octet-stream","Dropbox-API-Arg":JSON.stringify({path,mode:"overwrite",autorename:false,mute:false})},body:await file.arrayBuffer()});
    const d=await r.json();return json(request,r.ok?{ok:true,file:d}:{ok:false,error:"Dropbox could not upload the file."},r.ok?200:502);
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"Dropbox upload failed."},503);}
}
