import { describe,expect,it } from 'vitest';
import { echoIndexAtPoint,echoesOutsideRespawnZone,type EchoBody } from './echo-management';

const echo=(x:number,y:number):EchoBody=>({x,y,w:38,h:15,tilt:0});

describe('echo management',()=>{
  it('right click selects only the newest echo under the pointer',()=>{expect(echoIndexAtPoint([echo(100,600),echo(104,600)],115,607)).toBe(1);});
  it('does not remove a carefully placed echo elsewhere in the route',()=>{expect(echoIndexAtPoint([echo(100,600),echo(420,500)],250,300)).toBe(-1);});
  it('removes only echoes that can block the respawn body',()=>{expect(echoesOutsideRespawnZone([echo(96,620),echo(430,500)],100,618,30,42)).toEqual([echo(430,500)]);});
});
