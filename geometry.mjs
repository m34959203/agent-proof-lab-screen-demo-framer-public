export function normalizeCrop(x,y,height,source){
 const h=Math.max(32,Math.min(Math.floor(source.height/32)*32,Math.round(height/32)*32));
 const w=h*9/16;
 return {x:Math.max(0,Math.min(source.width-w,Math.round(x/2)*2)),y:Math.max(0,Math.min(source.height-h,Math.round(y/2)*2)),width:w,height:h};
}
export function imageRect(box,source){
 const scale=Math.min(box.width/source.width,box.height/source.height);
 return {left:box.left+(box.width-source.width*scale)/2,top:box.top+(box.height-source.height*scale)/2,width:source.width*scale,height:source.height*scale,scale};
}
export function pointToSource(clientX,clientY,box,source){
 const r=imageRect(box,source);
 return {x:Math.max(0,Math.min(source.width,(clientX-r.left)/r.scale)),y:Math.max(0,Math.min(source.height,(clientY-r.top)/r.scale))};
}
