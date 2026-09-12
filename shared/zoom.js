export const MIRROR={x:1517,y:837.5,width:538,height:749};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>x*x*(3-2*x);
export function zoomState(progress,width,height,mirrorFit,reduced=false){
 const p=clamp(progress),first=ease(clamp(p/.45)),second=reduced?1:ease(clamp((p-.45)/.55));
 // Keep the mirror center stationary. Cover both sides of that fixed anchor.
 const end=Math.max(width/(2*Math.min(MIRROR.x,3000-MIRROR.x)),height/(2*Math.min(MIRROR.y,2000-MIRROR.y)));
 const scale=mirrorFit*Math.pow(end/mirrorFit,second);
 const row=Math.min(73,Math.max(49,.04032*width+19));
 const font=Math.min(48,Math.max(26.4,.036*width));
 const menuHeight=4*row+font*1.12+14;
 const finalMenu=Math.min(.84,end*MIRROR.width*.72/220,end*MIRROR.height*.76/menuHeight);
 return {scale,x:-MIRROR.x*scale,y:-MIRROR.y*scale,innerScale:reduced?1:Math.pow(2.8/1.15,1-first),menuScale:1+(finalMenu-1)*(reduced?1:ease(p))};
}
