import type { Rect } from '../v2/types';

export interface EchoBody extends Rect {tilt:number}

export function echoIndexAtPoint(echoes:readonly EchoBody[],x:number,y:number,padding=12):number{
  for(let index=echoes.length-1;index>=0;index--){const echo=echoes[index];if(x>=echo.x-padding&&x<=echo.x+echo.w+padding&&y>=echo.y-padding&&y<=echo.y+echo.h+padding)return index;}
  return-1;
}

export function echoesOutsideRespawnZone(echoes:readonly EchoBody[],respawnX:number,respawnY:number,playerW:number,playerH:number,padding=18):EchoBody[]{
  const safe={x:respawnX-padding,y:respawnY-padding,w:playerW+padding*2,h:playerH+padding*2};
  return echoes.filter(echo=>!overlaps(echo,safe));
}

function overlaps(a:Rect,b:Rect):boolean{return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
