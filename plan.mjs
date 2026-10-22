const fail=msg=>{throw Error(msg);};
const keys=(o,wanted)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join()!==wanted.slice().sort().join())fail('Unexpected or missing plan fields');};
const num=n=>typeof n==='number'&&Number.isFinite(n);
const frame=n=>num(n)&&Math.abs(n*30-Math.round(n*30))<1e-6;
export function validatePlan(p,s){
 keys(p,['schemaVersion','sourceSha256','source','start','end','shots']);
 if(p.schemaVersion!==1||p.sourceSha256!==s.sha256)fail('Plan version or source SHA does not match');
 keys(p.source,['width','height','fps','duration']);
 for(const k of ['width','height','fps','duration'])if(p.source[k]!==s[k])fail('Source metadata does not match');
 if(!frame(p.start)||!frame(p.end)||p.start<0||p.end>s.duration+1e-6||p.end-p.start<20||p.end-p.start>60)fail('Choose a 20–60 second range on 30fps boundaries');
 if(!Array.isArray(p.shots)||p.shots.length<1||p.shots.length>6)fail('Use one to six shots');
 let edge=p.start;
 for(const shot of p.shots){
  keys(shot,shot.mode==='crop'?['start','end','mode','crop']:['start','end','mode']);
  if(!frame(shot.start)||!frame(shot.end)||Math.abs(shot.start-edge)>1e-6||shot.end-shot.start<1-1e-6)fail('Shots need continuous coverage and at least one second each');
  if(shot.mode==='crop'){
   keys(shot.crop,['x','y','width','height']);const c=shot.crop;
   if(!Object.values(c).every(n=>Number.isSafeInteger(n)&&n%2===0)||c.x<0||c.y<0||c.width<=0||c.height<=0||c.width*16!==c.height*9||c.x+c.width>s.width||c.y+c.height>s.height)fail('Crop must be even-pixel 9:16 and inside source');
  }else if(shot.mode!=='fit')fail('Unknown framing mode');
  edge=shot.end;
 }
 if(Math.abs(edge-p.end)>1e-6)fail('Shots must cover the selected range exactly');
 return structuredClone(p);
}
export function defaultPlan(s){return {schemaVersion:1,sourceSha256:s.sha256,source:{width:s.width,height:s.height,fps:s.fps,duration:s.duration},start:0,end:20,shots:[{start:0,end:20,mode:'fit'}]};}
export function shotAt(p,t){return p.shots.find(s=>t>=s.start&&t<s.end)||p.shots.at(-1);}
