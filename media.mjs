import {spawn} from 'node:child_process';
export function run(bin,args,{signal,max=10*1024*1024}={}){return new Promise((resolve,reject)=>{
 const p=spawn(bin,args,{stdio:['ignore','pipe','pipe'],signal});let out='',err='',size=0;
 p.stdout.on('data',b=>{size+=b.length;if(size>max)p.kill();else out+=b;});p.stderr.on('data',b=>{err=(err+b).slice(-12000);});
 p.on('error',reject);p.on('close',code=>code===0&&!err.trim()?resolve(out):reject(Error(`Media process failed (${code}); input unsupported or encoder could not finish`)));
});}
export async function inspect(file,ffprobe,signal){
 const j=JSON.parse(await run(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_format','-show_streams','-of','json',file],{signal}));
 const vs=j.streams.filter(s=>s.codec_type==='video'),as=j.streams.filter(s=>s.codec_type==='audio');const v=vs[0];
 const ratio=x=>{const [a,b]=x.split('/').map(Number);return a/b;};
 if(vs.length!==1||j.streams.length!==vs.length+as.length||!j.format.format_name.split(',').includes('mp4')||!['isom','mp41','mp42','avc1'].includes(j.format.tags?.major_brand))throw Error('Use an MP4 with one H.264 video and optional AAC audio');
 const fps=ratio(v.r_frame_rate),avg=ratio(v.avg_frame_rate),duration=Number(v.duration||j.format.duration);
 if(v.codec_name!=='h264'||![[1920,1080],[2560,1440]].some(([w,h])=>v.width===w&&v.height===h)||![25,30].includes(fps)||Math.abs(avg-fps)>0.001||v.sample_aspect_ratio!=='1:1'||Number(v.tags?.rotate||0)!==0||v.side_data_list?.some(s=>Number(s.rotation||0)!==0)||as.length>1||as.some(a=>a.codec_name!=='aac')||!Number.isFinite(duration)||duration<20||duration>300)throw Error('Supported: 1080p/1440p landscape, H.264, CFR 25/30, square pixels, no rotation, 20–300s; optional one AAC track');
 const frames=JSON.parse(await run(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',file],{signal})).frames;
 if(frames.length<2||frames.some((f,i)=>i&&Math.abs(Number(f.best_effort_timestamp_time)-Number(frames[i-1].best_effort_timestamp_time)-1/fps)>0.0001))throw Error('Variable frame rate is unsupported');
 return {width:v.width,height:v.height,fps,duration,audio:as.length===1};
}
export function exportArgs(file,plan,audio,output){
 const filters=plan.shots.map((s,i)=>{
 const view=s.mode==='crop'?`crop=${s.crop.width}:${s.crop.height}:${s.crop.x}:${s.crop.y},scale=1080:1920:flags=lanczos`:'scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x101820';
 return `[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS,${view},setsar=1,fps=30[v${i}]`;
 });
 filters.push(plan.shots.map((_,i)=>`[v${i}]`).join('')+`concat=n=${plan.shots.length}:v=1:a=0[v]`);
 if(audio)filters.push(`[0:a]atrim=start=${plan.start}:end=${plan.end},asetpts=PTS-STARTPTS,apad,atrim=duration=${plan.end-plan.start}[a]`);
 return ['-hide_banner','-nostdin','-v','error','-y','-threads','2','-protocol_whitelist','file,pipe','-i',file,'-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[v]',...(audio?['-map','[a]','-c:a','aac','-b:a','160k']:['-an']),'-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-t',String(plan.end-plan.start),'-movflags','+faststart',output];
}
