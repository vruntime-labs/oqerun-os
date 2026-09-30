import {
  corsHeaders,
  decryptSecret,
  encryptSecret,
  json,
  randomHex,
  readCookie,
  serializeCookie,
  validId
} from "./google";

const SESSION_COOKIE = "oqerun_onedrive_session";
const STATE_TTL = 600;
const SESSION_TTL = 60 * 60 * 24 * 30;
const GRAPH = "https://graph.microsoft.com/v1.0";

export interface OneDriveEnv {
  OQERUN_KV: KVNamespace;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  OQERUN_TOKEN_ENCRYPTION_KEY: string;
}

type Record = { provider:"onedrive"; refreshToken:string; createdAt:string; scope:string };
type Item = { id?:string; name?:string; folder?:object; file?:object; size?:number; lastModifiedDateTime?:string; webUrl?:string };

function missing(env:OneDriveEnv): boolean {
  return !env.MICROSOFT_CLIENT_ID?.trim() || !env.MICROSOFT_CLIENT_SECRET?.trim();
}
function redirectUri(request:Request):string {
  return new URL("/api/cloud/onedrive/callback", request.url).toString();
}
function callbackHtml(message:string, success:boolean, sessionId?:string):Response {
  const safe=message.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const payload=JSON.stringify({source:"oqerun-cloud",type:success?"onedrive-connected":"onedrive-error",sessionId:sessionId??null});
  return new Response(`<!doctype html><html><body style="font-family:system-ui;background:#07112c;color:#eef4ff;display:grid;place-items:center;min-height:100vh"><main style="text-align:center"><h1>Oqerun Cloud</h1><p>${safe}</p><p>You can close this window.</p></main><script>try{if(window.opener)window.opener.postMessage(${payload},"https://vruntime-labs.github.io")}catch{};if(${success})setTimeout(()=>window.close(),900)</script></body></html>`,{status:success?200:400,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}
async function session(request:Request,env:OneDriveEnv):Promise<{id:string;record:Record}|null>{
  const auth=request.headers.get("Authorization")??"";
  const bearer=auth.startsWith("Bearer ")?auth.slice(7).trim():null;
  const id=validId(bearer)?bearer:readCookie(request,SESSION_COOKIE);
  if(!id)return null;
  const raw=await env.OQERUN_KV.get(`oqerun:cloud:onedrive:session:${id}`);
  if(!raw)return null;
  const record=JSON.parse(raw) as Record;
  if(record.provider!=="onedrive"||!record.refreshToken)return null;
  return {id,record};
}
async function accessToken(request:Request,env:OneDriveEnv):Promise<string|null>{
  const s=await session(request,env); if(!s)return null;
  const refresh=await decryptSecret(s.record.refreshToken,env);
  const response=await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.MICROSOFT_CLIENT_ID!.trim(),client_secret:env.MICROSOFT_CLIENT_SECRET!.trim(),refresh_token:refresh,grant_type:"refresh_token",scope:"https://graph.microsoft.com/Files.ReadWrite offline_access"}).toString()});
  const data=await response.json() as {access_token?:string;refresh_token?:string};
  if(!response.ok||!data.access_token)throw new Error("The OneDrive session has expired. Please reconnect OneDrive.");
  if(data.refresh_token)s.record.refreshToken=await encryptSecret(data.refresh_token,env);
  await env.OQERUN_KV.put(`oqerun:cloud:onedrive:session:${s.id}`,JSON.stringify(s.record),{expirationTtl:SESSION_TTL});
  return data.access_token;
}
export function options(request:Request):Response{return new Response(null,{status:204,headers:corsHeaders(request)});}
export async function connect(request:Request,env:OneDriveEnv):Promise<Response>{
  if(missing(env))return json(request,{ok:false,error:"OneDrive is not configured on the Cloudflare Worker."},503);
  const state=randomHex(); await env.OQERUN_KV.put(`oqerun:cloud:onedrive:state:${state}`,state,{expirationTtl:STATE_TTL});
  const url=new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id",env.MICROSOFT_CLIENT_ID!.trim());url.searchParams.set("redirect_uri",redirectUri(request));url.searchParams.set("response_type","code");url.searchParams.set("response_mode","query");url.searchParams.set("scope","openid profile offline_access Files.ReadWrite");url.searchParams.set("state",state);
  return new Response(null,{status:302,headers:{Location:url.toString(),"Cache-Control":"no-store"}});
}
export async function callback(request:Request,env:OneDriveEnv):Promise<Response>{
  const u=new URL(request.url),code=u.searchParams.get("code"),state=u.searchParams.get("state"),saved=state?await env.OQERUN_KV.get(`oqerun:cloud:onedrive:state:${state}`):null;
  if(u.searchParams.get("error"))return callbackHtml("Microsoft authorization was not completed.",false);
  if(!code||!state||!saved)return callbackHtml("The OneDrive connection could not be verified. Please try again.",false);
  await env.OQERUN_KV.delete(`oqerun:cloud:onedrive:state:${state}`);
  if(missing(env))return callbackHtml("OneDrive backend configuration is incomplete.",false);
  try{
    const tr=await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.MICROSOFT_CLIENT_ID!.trim(),client_secret:env.MICROSOFT_CLIENT_SECRET!.trim(),code,redirect_uri:redirectUri(request),grant_type:"authorization_code"}).toString()});
    const td=await tr.json() as {refresh_token?:string;scope?:string};
    if(!tr.ok||!td.refresh_token)return callbackHtml("Microsoft authorization succeeded, but Oqerun could not create the secure OneDrive session.",false);
    const id=randomHex(),record:Record={provider:"onedrive",refreshToken:await encryptSecret(td.refresh_token,env),createdAt:new Date().toISOString(),scope:td.scope??""};
    await env.OQERUN_KV.put(`oqerun:cloud:onedrive:session:${id}`,JSON.stringify(record),{expirationTtl:SESSION_TTL});
    const response=callbackHtml("OneDrive is connected securely.",true,id);
    response.headers.append("Set-Cookie",serializeCookie(SESSION_COOKIE,id,{httpOnly:true,secure:true,sameSite:"None",path:"/",maxAge:SESSION_TTL}));
    return response;
  }catch(e){return callbackHtml("OneDrive connection failed: "+(e instanceof Error?e.message:"unknown error"),false);}
}
export async function status(request:Request,env:OneDriveEnv):Promise<Response>{
  return json(request,{connected:!!await session(request,env),provider:"onedrive"});
}
export async function disconnect(request:Request,env:OneDriveEnv):Promise<Response>{
  const s=await session(request,env);if(s)await env.OQERUN_KV.delete(`oqerun:cloud:onedrive:session:${s.id}`);
  const h=corsHeaders(request);h.set("Cache-Control","no-store");h.append("Set-Cookie",serializeCookie(SESSION_COOKIE,"",{httpOnly:true,secure:true,sameSite:"None",path:"/",maxAge:0}));
  return Response.json({connected:false},{headers:h});
}
export async function files(request:Request,env:OneDriveEnv):Promise<Response>{
  try{
    const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"OneDrive is not connected."},401);
    const parent=request.url.includes("parentId=")?new URL(request.url).searchParams.get("parentId"):"root";
    const url=parent&&parent!=="root"?`${GRAPH}/me/drive/items/${encodeURIComponent(parent)}/children`:`${GRAPH}/me/drive/root/children`;
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,"Accept":"application/json"}});
    const data=await response.json() as {value?:Item[];["@odata.nextLink"]?:string;error?:{message?:string}};
    if(!response.ok)return json(request,{ok:false,error:`Microsoft Graph request failed (${response.status}): ${data.error?.message??"unknown error"}`},response.status===401?401:502);
    return json(request,{ok:true,provider:"onedrive",files:(data.value??[]).map(i=>({id:i.id,name:i.name,mimeType:i.folder?"folder":i.file?"file":"file",size:i.size,modifiedTime:i.lastModifiedDateTime,webViewLink:i.webUrl})),nextPageToken:data["@odata.nextLink"]??null});
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"OneDrive unavailable."},503);}
}
export async function contentGet(request:Request,env:OneDriveEnv):Promise<Response>{
  try{
    const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"OneDrive is not connected."},401);
    const id=new URL(request.url).searchParams.get("fileId");if(!id)return json(request,{ok:false,error:"A OneDrive file id is required."},400);
    const response=await fetch(`${GRAPH}/me/drive/items/${encodeURIComponent(id)}/content`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok)return json(request,{ok:false,error:"OneDrive could not download this file."},response.status===404?404:502);
    const h=corsHeaders(request);h.set("Cache-Control","private,no-store");h.set("Content-Type",response.headers.get("Content-Type")??"application/octet-stream");
    return new Response(response.body,{headers:h});
  }catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"OneDrive content unavailable."},503);}
}
export async function createFolder(request:Request,env:OneDriveEnv):Promise<Response>{
  try{const token=await accessToken(request,env);if(!token)return json(request,{ok:false,error:"OneDrive is not connected."},401);const body=await request.json() as {name?:string;parentId?:string};const parent=body.parentId&&body.parentId!=="root"?`/items/${encodeURIComponent(body.parentId)}`:"/root";const response=await fetch(`${GRAPH}/me/drive${parent}/children`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({name:(body.name??"").trim(),folder:{},["@microsoft.graph.conflictBehavior"]:"fail"})});const data=await response.json();return json(request,response.ok?{ok:true,file:data}:{ok:false,error:"OneDrive could not create the folder."},response.ok?200:502);}catch(e){return json(request,{ok:false,error:e instanceof Error?e.message:"OneDrive folder creation failed."},503);}
}
