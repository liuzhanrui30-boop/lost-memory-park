import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { buttonHazardConflicts,spikeObstacleConflicts,spikeSweptBounds } from './level-safety';

describe('v12.8 button safety and authored obstacle logic',()=>{
  it('computes the complete swept area of moving and orbiting spikes',()=>{
    expect(spikeSweptBounds({id:'moving',x:100,y:200,w:30,h:30,direction:'up',moving:{axis:'x',distance:60,speed:2}})).toEqual({x:46,y:208,w:138,h:22});
    expect(spikeSweptBounds({id:'orbit',x:0,y:0,w:20,h:20,direction:'down',orbit:{centerX:300,centerY:240,radiusX:50,radiusY:30,speed:1}})).toEqual({x:246,y:200,w:108,h:72});
  });

  it('reports spikes whose static or animated path crosses a button',()=>{
    const room={buttons:[{id:'button',x:100,y:100,w:40,h:20,target:'gate'}],spikes:[{id:'needle',x:30,y:100,w:20,h:20,direction:'right' as const,moving:{axis:'x' as const,distance:80,speed:1}}],lasers:[],crushers:[]};
    expect(buttonHazardConflicts(room)).toEqual([{buttonId:'button',hazardId:'needle',kind:'spike'}]);
  });

  it('reports dynamic spikes tunnelling through platforms but keeps edge spikes valid',()=>{
    const blocks=[{id:'platform',x:100,y:300,w:120,h:28}],spikes=[
      {id:'moving',x:110,y:330,w:30,h:30,direction:'up' as const,moving:{axis:'y' as const,distance:80,speed:1}},
      {id:'edge',x:110,y:270,w:30,h:30,direction:'up' as const},
    ];
    expect(spikeObstacleConflicts({blocks,spikes})).toEqual([{spikeId:'moving',blockId:'platform'}]);
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
