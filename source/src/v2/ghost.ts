import type { GhostPoint } from './types';

export interface GhostSample {t:number;x:number;y:number}

export function compressGhost(samples:GhostSample[],maxPoints=360):GhostPoint[]{
  if(samples.length===0||maxPoints<=0)return[];
  const count=Math.min(samples.length,Math.max(1,Math.floor(maxPoints))),result:GhostPoint[]=[];
  for(let i=0;i<count;i++){
    const index=count===1?0:Math.round(i*(samples.length-1)/(count-1)),sample=samples[index];
    result.push([Math.round(sample.t*100),Math.round(sample.x),Math.round(sample.y)]);
  }
  return result;
}

export function ghostPositionAt(points:GhostPoint[],elapsed:number):{x:number;y:number}|null{
  if(!points.length)return null;const t=Math.max(0,elapsed*100);
  if(t<=points[0][0])return{x:points[0][1],y:points[0][2]};
  for(let i=1;i<points.length;i++){const b=points[i];if(t>b[0])continue;const a=points[i-1],span=Math.max(1,b[0]-a[0]),f=(t-a[0])/span;return{x:a[1]+(b[1]-a[1])*f,y:a[2]+(b[2]-a[2])*f};}
  const last=points[points.length-1];return{x:last[1],y:last[2]};
}
