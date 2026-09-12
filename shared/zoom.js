export const MIRROR={x:1517,y:837.5,width:538,height:749};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>x*x*(3-2*x);
export function menuDimensions(viewportWidth,viewportHeight){
 const width=Math.min(176,viewportWidth*.36,viewportHeight*.28);
 return {width,height:width*1.5,font:width*.125};
}
export function zoomState(progress,width,height,mirrorFit,reduced=false){
 const p=clamp(progress),first=ease(clamp(p/.45)),second=reduced?1:ease(clamp((p-.45)/.55));
 // Keep the mirror center stationary. Cover both sides of that fixed anchor.
 const end=Math.max((width+4)/(2*Math.min(MIRROR.x,3000-MIRROR.x)),(height+4)/(2*Math.min(MIRROR.y,2000-MIRROR.y)));
 const scale=mirrorFit*Math.pow(end/mirrorFit,second);
 const menu=menuDimensions(width,height);
 const finalMenu=Math.min(.84,end*MIRROR.width*.72/menu.width,end*MIRROR.height*.76/menu.height);
 return {scale,x:-MIRROR.x*scale,y:-MIRROR.y*scale,innerScale:reduced?1:Math.pow(1.15,1-first),menuScale:1+(finalMenu-1)*(reduced?1:ease(p))};
}

// Move the SVG camera within a viewport-sized surface, never a giant CSS layer.
export function cameraViewBox(scale,width,height){
 const w=width/scale,h=height/scale;
 return `${MIRROR.x-w/2} ${MIRROR.y-h/2} ${w} ${h}`;
}
export function setCamera(camera,scale,width,height){
 camera.setAttribute('viewBox',cameraViewBox(scale,width,height));
 camera.dataset.scale=String(scale);
}
