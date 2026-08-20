import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export async function POST(request:Request){
  const h=await headers(); const realId=h.get("oai-authenticated-user-id"); const demo=request.headers.get("x-starlight-demo-id");
  const userId=realId??(demo&&/^[a-zA-Z0-9-]{8,80}$/.test(demo)?`demo-${demo}`:null); if(!userId)return Response.json({error:"缺少体验身份"},{status:401});
  const form=await request.formData(); const file=form.get("file"); const purpose=String(form.get("purpose")??"media");
  if(!(file instanceof File))return Response.json({error:"请选择文件"},{status:400});
  if(file.size>20*1024*1024)return Response.json({error:"示例文件不能超过 20MB"},{status:413});
  const documents=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const allowed=purpose==="resume"?documents:[...documents,"image/jpeg","image/png","image/webp","video/mp4","video/webm"];
  if(!allowed.includes(file.type))return Response.json({error:purpose==="resume"?"简历仅支持 PDF 或 DOCX":"支持图片、MP4/WebM 视频、PDF 或 DOCX"},{status:415});
  const folder=purpose==="resume"?"resumes":"media"; const key=`${folder}/${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type},customMetadata:{owner:userId,originalName:file.name,visibility:purpose==="resume"?"private":"public",purpose}});
  return Response.json({ok:true,key,url:purpose==="resume"?null:`/api/files?key=${encodeURIComponent(key)}`,name:file.name,size:file.size,status:purpose==="resume"?"仅自己可见":"上传成功",type:file.type});
}

export async function GET(request:Request){const key=new URL(request.url).searchParams.get("key");if(!key)return new Response("Not found",{status:404});const object=await env.FILES.get(key);if(!object)return new Response("Not found",{status:404});const visibility=object.customMetadata?.visibility; if(visibility!=="public"){const h=await headers();const real=h.get("oai-authenticated-user-id");const demo=request.headers.get("x-starlight-demo-id");const actor=real??(demo?`demo-${demo}`:null);if(!actor||actor!==object.customMetadata?.owner)return new Response("Forbidden",{status:403})}return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType??"application/octet-stream","cache-control":visibility==="public"?"public, max-age=3600":"private, no-store"}})}
