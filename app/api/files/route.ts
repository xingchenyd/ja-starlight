import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export async function POST(request:Request){
  const h=await headers(); const realId=h.get("oai-authenticated-user-id"); const local=new URL(request.url).hostname==="localhost";
  const userId=realId??(local?"demo-preview-user":null); if(!userId)return Response.json({error:"请先登录"},{status:401});
  const form=await request.formData(); const file=form.get("file");
  if(!(file instanceof File))return Response.json({error:"请选择文件"},{status:400});
  if(file.size>10*1024*1024)return Response.json({error:"文件不能超过 10MB"},{status:413});
  const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if(!allowed.includes(file.type))return Response.json({error:"仅支持 PDF 或 DOCX"},{status:415});
  const key=`resumes/${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type},customMetadata:{owner:userId,originalName:file.name}});
  return Response.json({ok:true,key,name:file.name,size:file.size,status:"待审核"});
}
