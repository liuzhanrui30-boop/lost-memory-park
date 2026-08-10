export interface BossVolleyShot {x:number;y:number;vx:number;vy:number;r:number;warning:number;color:string}

export function bossVolley(chapter:number,phase:number,beat:number,playerX:number):BossVolleyShot[]{
  const p=Math.max(1,phase),lane=(beat*197+chapter*83)%980+150,alternate=beat%2===0,shots:BossVolleyShot[]=[];
  if(chapter===1){
    shots.push({x:lane,y:-24,vx:alternate?24:-24,vy:170+p*24,r:17+p,warning:.58,color:'#c24d64'});
    if(p>=2)shots.push({x:1280-lane*.72,y:-24,vx:0,vy:205+p*20,r:14+p,warning:.68,color:'#c24d64'});
    if(p>=3)shots.push({x:playerX+15,y:-24,vx:0,vy:245,r:22,warning:.78,color:'#c24d64'});
  }else if(chapter===2){
    const left=alternate,y=245+(beat%5)*78;shots.push({x:left?-28:1308,y,vx:(left?1:-1)*(330+p*42),vy:0,r:15+p,warning:.5,color:'#d29b43'});
    if(p>=2)shots.push({x:left?1308:-28,y:600-y*.45,vx:(left?-1:1)*(300+p*38),vy:0,r:14,warning:.65,color:'#d29b43'});
  }else if(chapter===3){
    shots.push({x:alternate?-25:1305,y:280+(beat%4)*92,vx:(alternate?1:-1)*(260+p*35),vy:alternate?35:-35,r:17,warning:.72,color:'#648d91'});
    if(p>=2)shots.push({x:playerX+15,y:-20,vx:0,vy:220+p*18,r:15+p,warning:.82,color:'#648d91'});
  }else{
    const left=alternate;shots.push({x:left?-30:1310,y:190+(beat%6)*72,vx:(left?1:-1)*(340+p*46),vy:(beat%3-1)*38,r:15+p,warning:.44,color:'#9d3d55'});
    if(p>=2)shots.push({x:playerX+15,y:-24,vx:0,vy:245+p*18,r:18,warning:.64,color:'#9d3d55'});
    if(p>=4)shots.push({x:left?1310:-30,y:560-(beat%4)*88,vx:(left?-1:1)*410,vy:0,r:13,warning:.54,color:'#9d3d55'});
  }
  return shots;
}
