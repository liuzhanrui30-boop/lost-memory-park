import { shade, type ChapterArt } from '../v4/art-direction';
import type { BeatDefinition, CrusherDef, LandmarkId, LauncherDef, PortalDef, SpotlightDef } from '../v2/types';
import { crusherPoseAt, spotlightStateAt } from './stage-mechanics';
import { segmentRoleLabel } from '../v14/progression';

function rr(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number):void{c.beginPath();c.roundRect(x,y,w,h,r);}
function gear(c:CanvasRenderingContext2D,x:number,y:number,r:number,teeth:number,angle:number,art:ChapterArt,fill=art.accent):void{
  c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=fill;c.strokeStyle=art.ink;c.lineWidth=Math.max(2,r*.08);c.beginPath();for(let i=0;i<teeth*2;i++){const a=i*Math.PI/teeth,rad=i%2?r:r*.78;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}c.closePath();c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.arc(0,0,r*.28,0,Math.PI*2);c.fill();c.stroke();c.restore();
}
function string(c:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,art:ChapterArt):void{c.strokeStyle=shade(art.ink,.12);c.lineWidth=3;c.beginPath();c.moveTo(x1,y1);c.bezierCurveTo(x1+8,y1+(y2-y1)*.35,x2-9,y1+(y2-y1)*.68,x2,y2);c.stroke();}

export function drawLauncher(c:CanvasRenderingContext2D,def:LauncherDef,art:ChapterArt,time:number,ready:boolean):void{
  const dir=def.facing??(def.vx<0?-1:1),pulse=.5+.5*Math.sin(time*8+def.x*.01);c.save();c.translate(def.x+def.w/2,def.y+def.h/2);c.scale(dir,1);c.shadowColor='rgba(18,10,20,.42)';c.shadowBlur=10;c.shadowOffsetY=7;
  c.fillStyle=shade(art.platformDark,-.1);c.strokeStyle=art.ink;c.lineWidth=4;rr(c,-def.w*.42,def.h*.05,def.w*.84,def.h*.34,7);c.fill();c.stroke();c.shadowColor='transparent';
  c.fillStyle=shade(art.platform,.08);c.beginPath();c.moveTo(-def.w*.2,def.h*.12);c.lineTo(-def.w*.32,-def.h*.34);c.quadraticCurveTo(def.w*.1,-def.h*.52,def.w*.42,-def.h*.15);c.lineTo(def.w*.25,def.h*.12);c.closePath();c.fill();c.stroke();
  c.fillStyle=art.ink;c.beginPath();c.ellipse(def.w*.28,-def.h*.2,def.w*.17,def.h*.22,-.2,0,Math.PI*2);c.fill();c.fillStyle=ready?art.glow:shade(art.glow,-.45);c.beginPath();c.ellipse(def.w*.3,-def.h*.2,def.w*.095,def.h*.13,-.2,0,Math.PI*2);c.fill();
  c.globalAlpha=.28+.32*pulse;c.fillStyle=art.glow;c.beginPath();c.moveTo(def.w*.38,-def.h*.32);c.lineTo(def.w*.72,-def.h*.48);c.lineTo(def.w*.66,-def.h*.02);c.closePath();c.fill();c.globalAlpha=1;
  gear(c,-def.w*.24,def.h*.28,10,8,time*2,art,art.secondary);gear(c,def.w*.18,def.h*.28,10,8,-time*2,art,art.accent);c.restore();
}

export function drawPortal(c:CanvasRenderingContext2D,def:PortalDef,art:ChapterArt,time:number):void{
  const x=def.x+def.w/2,y=def.y+def.h/2,phase=time*2.4+def.x*.013;c.save();c.translate(x,y);c.shadowColor=def.color??art.glow;c.shadowBlur=18+Math.sin(phase)*4;
  const frame=c.createLinearGradient(-def.w/2,0,def.w/2,0);frame.addColorStop(0,shade(art.platformDark,-.08));frame.addColorStop(.5,art.paper);frame.addColorStop(1,shade(art.platform,-.05));c.fillStyle=frame;c.strokeStyle=art.ink;c.lineWidth=4;rr(c,-def.w/2-7,-def.h/2-8,def.w+14,def.h+16,def.w*.42);c.fill();c.stroke();c.shadowColor='transparent';
  const voidFill=c.createRadialGradient(0,0,2,0,0,def.h*.48);voidFill.addColorStop(0,shade(art.secondary,-.28));voidFill.addColorStop(.68,shade(art.curtain,-.15));voidFill.addColorStop(1,art.ink);c.fillStyle=voidFill;rr(c,-def.w/2+2,-def.h/2+1,def.w-4,def.h-2,def.w*.35);c.fill();
  c.globalCompositeOperation='screen';c.strokeStyle=def.color??art.glow;c.lineWidth=3;for(let i=0;i<4;i++){c.globalAlpha=.25+i*.14;c.beginPath();c.ellipse(0,0,def.w*(.35-i*.045),def.h*(.39-i*.055),phase*(i%2?1:-1)+i,0,Math.PI*1.65);c.stroke();}c.globalCompositeOperation='source-over';c.globalAlpha=1;
  c.fillStyle=art.accent;c.strokeStyle=art.ink;c.lineWidth=2;c.beginPath();c.moveTo(def.exitDirection*9,-5);c.lineTo(def.exitDirection*17,0);c.lineTo(def.exitDirection*9,5);c.closePath();c.fill();c.stroke();c.restore();
}

export function drawCrusher(c:CanvasRenderingContext2D,def:CrusherDef,art:ChapterArt,time:number):void{
  const pose=crusherPoseAt(def,time),x=def.x+(def.axis==='x'?pose.offset:0),y=def.y+(def.axis==='y'?pose.offset:0);c.save();
  string(c,def.x+def.w*.28,0,x+def.w*.28,y,art);string(c,def.x+def.w*.72,0,x+def.w*.72,y,art);
  if(pose.warning){c.globalAlpha=.22+.2*Math.sin(time*28);c.fillStyle=art.hazard;c.fillRect(x-18,y-16,def.w+36,def.h+32);c.globalAlpha=1;}
  c.shadowColor='rgba(14,8,17,.46)';c.shadowBlur=14;c.shadowOffsetY=9;const body=c.createLinearGradient(x,y,x+def.w,y+def.h);body.addColorStop(0,shade(art.paper,.12));body.addColorStop(.42,art.platform);body.addColorStop(1,shade(art.platformDark,-.16));c.fillStyle=body;c.strokeStyle=art.ink;c.lineWidth=5;rr(c,x,y,def.w,def.h,9);c.fill();c.stroke();c.shadowColor='transparent';
  c.fillStyle=shade(art.platformDark,-.04);rr(c,x+12,y+17,def.w-24,def.h-43,6);c.fill();c.stroke();c.fillStyle=art.paper;c.font=`900 ${Math.max(10,Math.min(18,def.w*.13))}px monospace`;c.textAlign='center';c.fillText('STAGE',x+def.w/2,y+45);c.fillText('PRESS',x+def.w/2,y+65);
  c.fillStyle=pose.dangerous?art.hazard:art.accent;c.beginPath();c.arc(x+def.w/2,y+def.h-34,12,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle=art.ink;const edge=def.axis==='x'?(def.distance>=0?x+def.w:x):(y+def.h);if(def.axis==='y'){for(let px=x;px<x+def.w;px+=22){c.beginPath();c.moveTo(px,edge);c.lineTo(px+11,edge+13);c.lineTo(px+22,edge);c.closePath();c.fill();}}else{const sx=def.distance>=0?edge:edge-14;for(let py=y;py<y+def.h;py+=24){c.beginPath();c.moveTo(sx,py);c.lineTo(sx+(def.distance>=0?14:-14),py+12);c.lineTo(sx,py+24);c.closePath();c.fill();}}
  c.restore();
}

export function drawSpotlight(c:CanvasRenderingContext2D,def:SpotlightDef,art:ChapterArt,time:number):void{
  const state=spotlightStateAt(def,time),cx=def.x+def.w/2,lampY=Math.max(20,def.y-125),alpha=state.active ? .3 : state.warning ? .13 : 0;c.save();if(alpha>0){const beam=c.createLinearGradient(cx,lampY,cx,def.y+def.h);beam.addColorStop(0,state.active?'rgba(255,238,170,.54)':'rgba(226,76,82,.18)');beam.addColorStop(1,'rgba(255,233,160,.03)');c.globalAlpha=alpha/.3;c.fillStyle=beam;c.beginPath();c.moveTo(cx-25,lampY+20);c.lineTo(def.x+def.w,def.y+def.h);c.lineTo(def.x,def.y+def.h);c.closePath();c.fill();}
  c.globalAlpha=1;string(c,cx-6,0,cx-6,lampY,art);c.translate(cx,lampY);c.rotate(Math.sin(time*.7+def.x)*.055);c.fillStyle=shade(art.platformDark,-.12);c.strokeStyle=art.ink;c.lineWidth=4;rr(c,-34,-18,68,36,8);c.fill();c.stroke();c.fillStyle=state.active?art.glow:state.warning?art.hazard:shade(art.paperShadow,-.2);c.beginPath();c.ellipse(0,19,25,10,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.paper;c.font='900 8px monospace';c.textAlign='center';c.fillText(state.active?'FREEZE':state.warning?'READY':'SLEEP',0,3);c.restore();
}

export function drawBeatMarker(c:CanvasRenderingContext2D,beat:BeatDefinition,index:number,completed:boolean,art:ChapterArt,time:number):void{
  c.save();c.globalAlpha=completed ? .32 : .76;c.strokeStyle=completed?art.secondary:shade(art.paper,.1);c.lineWidth=2;c.setLineDash([8,10]);c.beginPath();c.moveTo(beat.x,118);c.lineTo(beat.x,655);c.stroke();c.setLineDash([]);c.translate(beat.x,123);c.rotate(completed?-.04:.04*Math.sin(time*2+index));c.fillStyle=completed?art.secondary:art.paper;c.strokeStyle=art.ink;c.lineWidth=3;rr(c,-58,-21,116,42,5);c.fill();c.stroke();c.fillStyle=art.ink;c.font='900 10px "PingFang SC",sans-serif';c.textAlign='center';c.fillText(completed?'已通过':`第 ${index+1} 段 · ${segmentRoleLabel(beat.role)}`,0,-3);c.font='700 8px "PingFang SC",sans-serif';c.fillText(beat.label.slice(0,9),0,12);c.restore();
}

export function drawLandmark(c:CanvasRenderingContext2D,id:LandmarkId|undefined,worldWidth:number,art:ChapterArt,time:number):void{
  if(!id)return;const x=Math.max(520,worldWidth*.72),y=410,bob=Math.sin(time*.65)*5;c.save();c.translate(x,y+bob);c.globalAlpha=.72;c.lineJoin='round';c.lineCap='round';c.shadowColor='rgba(14,8,17,.36)';c.shadowBlur=20;c.shadowOffsetY=15;c.strokeStyle=art.ink;c.lineWidth=7;
  if(id==='candy-press'){
    c.fillStyle=shade(art.platformDark,-.12);rr(c,-150,-285,300,345,18);c.fill();c.stroke();c.fillStyle=art.paper;rr(c,-112,-244,224,126,12);c.fill();c.stroke();c.fillStyle=art.hazard;c.font='900 29px monospace';c.textAlign='center';c.fillText('SMILE',0,-174);c.fillStyle=art.accent;rr(c,-122,-90,244,54,8);c.fill();c.stroke();for(let i=-4;i<=4;i++){c.fillStyle=i%2?art.paper:art.platformLight;c.beginPath();c.arc(i*24,-63,13,0,Math.PI*2);c.fill();c.stroke();}string(c,-77,-340,-77,-285,art);string(c,77,-340,77,-285,art);
  }else if(id==='lollipop-gears'){
    gear(c,-88,-80,102,14,time*.18,art,art.platformLight);gear(c,78,-16,83,12,-time*.24,art,art.accent);gear(c,8,-178,55,10,time*.32,art,art.secondary);c.strokeStyle=art.paper;c.lineWidth=14;c.beginPath();c.moveTo(-88,18);c.lineTo(-88,180);c.moveTo(78,67);c.lineTo(78,180);c.stroke();
  }else if(id==='gift-jaw'){
    c.fillStyle=art.platform;rr(c,-165,-190,330,250,16);c.fill();c.stroke();c.fillStyle=art.accent;c.fillRect(-24,-190,48,250);c.fillRect(-165,-92,330,48);c.strokeRect(-24,-190,48,250);c.strokeRect(-165,-92,330,48);c.fillStyle=art.ink;for(let i=-5;i<=5;i++){c.beginPath();c.moveTo(i*27-13,-45);c.lineTo(i*27,-14);c.lineTo(i*27+13,-45);c.closePath();c.fill();c.beginPath();c.moveTo(i*27-13,8);c.lineTo(i*27, -14);c.lineTo(i*27+13,8);c.closePath();c.fill();}c.fillStyle=art.paper;c.beginPath();c.arc(-54,-120,17,0,Math.PI*2);c.arc(54,-120,17,0,Math.PI*2);c.fill();c.stroke();
  }else if(id==='cannon-stack'){
    for(let i=0;i<3;i++){c.save();c.translate((i-1)*80,i*-62);c.rotate((i-1)*.18);c.fillStyle=i===1?art.accent:art.platform;rr(c,-70,-30,140,60,20);c.fill();c.stroke();c.fillStyle=art.ink;c.beginPath();c.ellipse(66,0,24,30,0,0,Math.PI*2);c.fill();c.fillStyle=art.glow;c.beginPath();c.ellipse(68,0,12,17,0,0,Math.PI*2);c.fill();gear(c,-48,32,22,9,time*(i%2?-.4:.4),art,art.secondary);c.restore();}
  }else if(id==='applause-eye'){
    c.fillStyle=shade(art.curtain,.02);c.beginPath();c.moveTo(-174,80);c.quadraticCurveTo(-112,-235,0,-238);c.quadraticCurveTo(112,-235,174,80);c.closePath();c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.ellipse(0,-92,103,66,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.secondary;c.beginPath();c.arc(Math.sin(time*.9)*23,-92,38,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.ink;c.beginPath();c.arc(Math.sin(time*.9)*23,-92,15,0,Math.PI*2);c.fill();for(let i=-4;i<=4;i++){c.strokeStyle=art.accent;c.lineWidth=10;c.beginPath();c.moveTo(i*34,45);c.quadraticCurveTo(i*39,12,i*28,-12);c.stroke();}
  }else if(id==='living-curtain'){
    c.fillStyle=shade(art.curtain,.08);c.beginPath();c.moveTo(-188,-255);for(let i=0;i<=12;i++){const px=-188+i*31.4;c.lineTo(px,55+(i%2)*30);}c.lineTo(188,-255);c.closePath();c.fill();c.stroke();c.strokeStyle=art.accent;c.lineWidth=14;c.beginPath();c.moveTo(-190,-225);c.quadraticCurveTo(0,-190,190,-225);c.stroke();c.fillStyle=art.glow;c.beginPath();c.ellipse(-55,-118,13,21,0,0,Math.PI*2);c.ellipse(55,-118,13,21,0,0,Math.PI*2);c.fill();c.strokeStyle=art.hazard;c.lineWidth=9;c.beginPath();c.arc(0,-60,58,.2,Math.PI-.2);c.stroke();
  }else if(id==='broken-mirror'){
    c.fillStyle=shade(art.platformDark,-.08);c.beginPath();c.ellipse(0,-80,142,218,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='rgba(185,244,220,.32)';c.beginPath();c.ellipse(0,-80,112,188,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.glow;c.lineWidth=5;c.beginPath();c.moveTo(-20,-260);c.lineTo(22,-118);c.lineTo(-74,-25);c.moveTo(22,-118);c.lineTo(92,-196);c.moveTo(22,-118);c.lineTo(103,10);c.moveTo(-74,-25);c.lineTo(-18,104);c.stroke();
  }else if(id==='twin-shadow'){
    for(const side of [-1,1]){c.save();c.translate(side*70,0);c.scale(side,1);c.fillStyle=side<0?art.paper:shade(art.secondary,-.18);c.beginPath();c.arc(0,-170,45,0,Math.PI*2);c.fill();c.stroke();rr(c,-38,-125,76,170,26);c.fill();c.stroke();c.strokeStyle=side<0?art.accent:art.glow;c.lineWidth=13;c.beginPath();c.moveTo(28,-90);c.quadraticCurveTo(78,-35,42,35);c.stroke();c.restore();}c.strokeStyle=art.glow;c.lineWidth=3;c.setLineDash([10,9]);c.beginPath();c.moveTo(0,-260);c.lineTo(0,95);c.stroke();c.setLineDash([]);
  }else if(id==='rotating-room'){
    c.save();c.rotate(Math.sin(time*.25)*.14);c.fillStyle=shade(art.platformDark,-.12);c.fillRect(-175,-220,350,300);c.strokeRect(-175,-220,350,300);c.fillStyle='rgba(185,244,220,.22)';for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/2);c.fillRect(-130,-15,260,30);c.strokeRect(-130,-15,260,30);c.restore();}gear(c,0,-70,72,14,time*.22,art,art.secondary);c.restore();
  }else if(id==='clock-hand'){
    gear(c,0,-88,154,18,time*.08,art,shade(art.platformDark,-.04));c.fillStyle=art.paper;c.beginPath();c.arc(0,-88,118,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.ink;c.lineWidth=7;for(let i=0;i<12;i++){c.save();c.translate(0,-88);c.rotate(i*Math.PI/6);c.beginPath();c.moveTo(0,-91);c.lineTo(0,-108);c.stroke();c.restore();}c.save();c.translate(0,-88);c.rotate(time*.28);c.fillStyle=art.hazard;c.beginPath();c.moveTo(-8,22);c.lineTo(-12,-96);c.lineTo(12,-96);c.lineTo(8,22);c.closePath();c.fill();c.stroke();c.restore();
  }else if(id==='memory-furnace'){
    c.fillStyle=shade(art.platformDark,-.1);rr(c,-165,-245,330,330,18);c.fill();c.stroke();c.fillStyle=art.ink;rr(c,-112,-145,224,180,80);c.fill();c.stroke();const fire=c.createRadialGradient(0,-32,10,0,-35,100);fire.addColorStop(0,art.glow);fire.addColorStop(.55,art.accent);fire.addColorStop(1,art.hazard);c.fillStyle=fire;c.beginPath();c.moveTo(-72,15);c.quadraticCurveTo(-90,-58,-38,-104);c.quadraticCurveTo(-35,-48,0,-128);c.quadraticCurveTo(24,-63,66,-100);c.quadraticCurveTo(96,-36,72,15);c.closePath();c.fill();c.stroke();for(let i=-1;i<=1;i++){c.fillStyle=art.paper;rr(c,i*74-27,-214,54,42,5);c.fill();c.stroke();c.fillStyle=art.ink;c.font='900 10px monospace';c.textAlign='center';c.fillText('MEM',i*74,-190);}
  }else{
    c.fillStyle=shade(art.platformDark,-.12);rr(c,-180,-225,360,310,18);c.fill();c.stroke();gear(c,0,-70,105,16,-time*.15,art,art.accent);for(const side of [-1,1]){c.fillStyle=side<0?art.secondary:art.hazard;rr(c,side*88-48,20,96,52,8);c.fill();c.stroke();c.fillStyle=art.paper;c.font='900 13px monospace';c.textAlign='center';c.fillText(side<0?'KEEP':'BURN',side*88,52);}c.strokeStyle=art.glow;c.lineWidth=5;c.beginPath();c.moveTo(0,-180);c.lineTo(0,15);c.stroke();
  }
  c.shadowColor='transparent';c.restore();
}
