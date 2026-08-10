export interface OrbitSpec {centerX:number;centerY:number;radiusX:number;radiusY:number;speed:number;phase?:number}

export function phaseActiveAt(time:number,period=3,activeFor=2,offset=0):boolean{
  const safePeriod=Math.max(.1,period),phase=((time+offset)%safePeriod+safePeriod)%safePeriod;return phase<Math.max(0,Math.min(safePeriod,activeFor));
}

export function orbitPosition(spec:OrbitSpec,time:number):{x:number;y:number}{
  const angle=time*spec.speed+(spec.phase??0);return{x:spec.centerX+Math.cos(angle)*spec.radiusX,y:spec.centerY+Math.sin(angle)*spec.radiusY};
}

export function windDelta(forceX:number,forceY:number,dt:number):{x:number;y:number}{return{x:forceX*dt,y:forceY*dt};}
