import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { buttonHazardConflicts,spikeSweptBounds } from './level-safety';

describe('v12.7 button safety and authored obstacle logic',()=>{
  it('computes the complete swept area of moving and orbiting spikes',()=>{
    expect(spikeSweptBounds({id:'moving',x:100,y:200,w:30,h:30,direction:'up',moving:{axis:'x',distance:60,speed:2}})).toEqual({x:40,y:200,w:150,h:30});
    expect(spikeSweptBounds({id:'orbit',x:0,y:0,w:20,h:20,direction:'down',orbit:{centerX:300,centerY:240,radiusX:50,radiusY:30,speed:1}})).toEqual({x:240,y:200,w:120,h:80});
  });

  it('reports spikes whose static or animated path crosses a button',()=>{
    const room={buttons:[{id:'button',x:100,y:100,w:40,h:20,target:'gate'}],spikes:[{id:'needle',x:30,y:100,w:20,h:20,direction:'right' as const,moving:{axis:'x' as const,distance:80,speed:1}}],lasers:[],crushers:[]};
    expect(buttonHazardConflicts(room)).toEqual([{buttonId:'button',hazardId:'needle',kind:'spike'}]);
  });

  it('keeps every normal-room button outside all lethal geometry',()=>{
    for(const room of rooms.filter(room=>room.kind==='normal'))expect(buttonHazardConflicts(room),room.id).toEqual([]);
    expect(validateRooms()).toEqual([]);
  });

  it('adds one chapter-readable feint only after the first two lessons',()=>{
    const normal=rooms.filter(room=>room.kind==='normal');
    for(const room of normal){
      const feints=[...room.spikes,...(room.lasers??[])].filter(entity=>entity.id.startsWith('v15-'));
      if((room.lesson?.step??0)<3)expect(feints,room.id).toHaveLength(0);
      else expect(feints.length,room.id).toBeGreaterThanOrEqual(1);
    }
  });
});
