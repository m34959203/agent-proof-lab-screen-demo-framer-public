import http from 'node:http';import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID,createHash} from 'node:crypto';
import {inspect,run,exportArgs} from './media.mjs';import {validatePlan} from './plan.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function startServer({port=0,dir=path.join(here,'.local'),ffmpeg=process.env.FFMPEG,ffprobe=process.env.FFPROBE}={}){
 if(!ffmpeg||!ffprobe)throw Error('Set FFMPEG and FFPROBE to existing local executables');await fs.mkdir(dir,{recursive:true});
 let source=null,busy=false,job=null;const aborters=new Set();
 const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
 const json=(r,status,data)=>{r.writeHead(status,{'Content-Type':'application/json'});r.end(JSON.stringify(data));};
 async function body(req,max){let n=0;const parts=[];for await(const b of req){n+=b.length;if(n>max)throw Error('File/request exceeds size limit');parts.push(b);}return Buffer.concat(parts);}
 const server=http.createServer(async(req,res)=>{
 const origin=`http://127.0.0.1:${server.address().port}`;
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'");
 if(req.headers.host!==`127.0.0.1:${server.address().port}`||(req.headers.origin&&req.headers.origin!==origin)){json(res,403,{error:'Local origin required'});return;}
 if(req.method!=='GET'&&req.headers.origin!==origin){json(res,403,{error:'Same-origin request required'});return;}
 try{
 const url=new URL(req.url,origin);
 if(req.method==='GET'){
  const staticFiles={'/':'index.html','/app.mjs':'app.mjs','/style.css':'style.css','/plan.mjs':'plan.mjs','/geometry.mjs':'geometry.mjs'};
  if(staticFiles[url.pathname]){const f=staticFiles[url.pathname];res.setHeader('Content-Type',f.endsWith('html')?'text/html':f.endsWith('css')?'text/css':'text/javascript');res.end(await fs.readFile(path.join(here,f)));return;}
  if(url.pathname==='/api/job'){json(res,200,job?{id:job.id,state:job.state,error:job.error||null}:null);return;}
  let file=null;if(url.pathname==='/source'&&source)file=source.file;
  if(job?.state==='ready'&&url.pathname===`/export/${job.id}.mp4`)file=job.file;
  if(file){const stat=await fs.stat(file),m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');let start=0,end=stat.size-1;
   if(req.headers.range&&!m){res.writeHead(416);res.end();return;}
   if(m){start=Number(m[1]);end=m[2]?Math.min(end,Number(m[2])):end;if(start>end){res.writeHead(416);res.end();return;}}
   res.writeHead(m?206:200,{'Content-Type':'video/mp4','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${stat.size}`}:{})});createReadStream(file,{start,end}).pipe(res);return;}
 }
 if(req.method==='POST'&&url.pathname==='/api/import'){
  if(busy){json(res,409,{error:'Wait for current operation or cancel export'});return;}busy=true;const ac=new AbortController();aborters.add(ac);const file=path.join(dir,randomUUID()+'.mp4');
  try{const bytes=await body(req,500*1024*1024);if(req.headers['content-type']!=='video/mp4')throw Error('Choose an MP4');await fs.writeFile(file,bytes,{flag:'wx'});const info=await inspect(file,ffprobe,ac.signal);source={...info,sha256:digest(bytes),file};json(res,200,{...info,sha256:source.sha256});}catch(e){await fs.rm(file,{force:true});throw e;}finally{busy=false;aborters.delete(ac);}return;
 }
 if(req.method==='POST'&&url.pathname==='/api/export'){
  if(!source)throw Error('Import a source first');if(busy){json(res,409,{error:'One operation at a time'});return;}
  busy=true;let plan;try{plan=validatePlan(JSON.parse((await body(req,64000)).toString()),source);}catch(e){busy=false;throw e;}const snapshot={...source};
  const id=randomUUID(),temp=path.join(dir,id+'.partial.mp4'),file=path.join(dir,id+'.mp4'),ac=new AbortController();aborters.add(ac);job={id,state:'running',ac,file};const current=job;
  current.done=(async()=>{try{await run(ffmpeg,exportArgs(snapshot.file,plan,snapshot.audio,temp),{signal:ac.signal});if(ac.signal.aborted)throw Error('Cancelled');await fs.rename(temp,file);current.state='ready';}catch(e){current.state=ac.signal.aborted?'cancelled':'failed';current.error=ac.signal.aborted?'Cancelled':'Encoder failed; no output was published';await fs.rm(temp,{force:true});}finally{busy=false;aborters.delete(ac);}})();json(res,202,{id,state:job.state});return;
 }
 if(req.method==='POST'&&url.pathname==='/api/cancel'){if(job?.state==='running'){job.ac.abort();await job.done;}json(res,200,{state:job?.state||'idle'});return;}
 json(res,404,{error:'Not found'});
 }catch(e){json(res,400,{error:e.message});}
 });
 await new Promise(r=>server.listen(port,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}`,close:async()=>{for(const ac of aborters)ac.abort();if(job?.done)await job.done;await new Promise(r=>server.close(r));}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const s=await startServer({port:Number(process.env.PORT||4177)});console.log(s.url);for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await s.close();process.exit();});}
