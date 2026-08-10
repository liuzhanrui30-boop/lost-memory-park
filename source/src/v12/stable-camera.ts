export interface CameraFrame {x:number;target:number;insideDeadzone:boolean}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function fixedBackdropOffset(_cameraX:number):number{return 0;}

export function stableCameraTarget(cameraX:number,playerCenterX:number,worldWidth:number,viewportWidth=1280):CameraFrame{
  const maxX=Math.max(0,worldWidth-viewportWidth),left=viewportWidth*.40,right=viewportWidth*.56,screenX=playerCenterX-cameraX;
  let target=cameraX;
  if(screenX<left)target=playerCenterX-left;
  else if(screenX>right)target=playerCenterX-right;
  target=clamp(target,0,maxX);
  return{x:cameraX,target,insideDeadzone:screenX>=left&&screenX<=right};
}

export function smoothCamera(cameraX:number,target:number,dt:number,rate=4.8):number{
  const follow=1-Math.exp(-rate*Math.max(0,dt)),next=cameraX+(target-cameraX)*follow;
  return Math.abs(target-next)<.05?target:next;
}

export function snapCameraX(playerCenterX:number,worldWidth:number,viewportWidth=1280):number{
  return clamp(playerCenterX-viewportWidth*.47,0,Math.max(0,worldWidth-viewportWidth));
}

export function gentleShake(time:number,trauma:number,strength:number,reducedMotion=false):{x:number;y:number}{
  if(reducedMotion||strength<=0||trauma<=0)return{x:0,y:0};
  const amount=Math.min(1,trauma)*Math.min(1,strength);
  return{x:Math.sin(time*31)*4*amount*amount,y:Math.sin(time*43+1.7)*2.5*amount*amount};
}
