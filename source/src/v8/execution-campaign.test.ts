import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { EXECUTION_SCRIPTS,LOCK_SCRIPTS } from '../v6/campaign';

describe('v8 no-hold-forward execution campaign',()=>{
  const normal=rooms.filter(room=>room.kind==='normal');

  it('authors a distinct two-part execution script for all 24 rooms',()=>{
    expect(EXECUTION_SCRIPTS).toHaveLength(24);
    expect(new Set(EXECUTION_SCRIPTS.map(script=>`${script.second}/${script.finale}`)).size).toBeGreaterThanOrEqual(20);
  });

  it('uses all eight pure run-and-jump skills across authored director locks',()=>{
    expect(LOCK_SCRIPTS).toHaveLength(24);
    expect(new Set(LOCK_SCRIPTS.flatMap(script=>[script.A,script.B]))).toEqual(new Set(['airborne','reverse','still','double-jump','combo','momentum','rising','falling']));
  });

  it('kills a grounded right-only route before it can become the golden path',()=>{
    for(const room of normal){
      const opening=room.spikes.filter(spike=>spike.id.includes('-opening-fence-a-'));
      expect(opening.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...opening.map(spike=>spike.x))).toBeLessThan(240);
      expect(opening.every(spike=>spike.y+spike.h>=660)).toBe(true);
    }
  });

  it('requires two route-confirming switches instead of allowing a straight run to the exit',()=>{
    for(const room of normal){
      const gates=room.blocks.filter(block=>block.id.includes('-lock-'));
      const switches=(room.buttons??[]).filter(button=>button.id.includes('-lock-'));
      expect(gates).toHaveLength(2);expect(switches).toHaveLength(2);
      for(const gate of gates){const button=switches.find(item=>item.target===gate.id);expect(button).toBeTruthy();expect(button!.x).toBeLessThan(gate.x);expect(button!.requires).not.toBe('touch');const support=room.blocks.find(block=>Math.abs(block.y-(button!.y+button!.h))<.1&&block.x<button!.x+button!.w&&block.x+block.w>button!.x);expect(support).toBeTruthy();expect(['solid','oneway','ice','sticky','conveyor',undefined]).toContain(support!.kind);}
      const secondGate=gates.find(gate=>gate.id.endsWith('-A'))!;expect(room.checkpoints?.some(cp=>cp.x>secondGate.x)).toBe(true);
    }
  });

  it('makes the prologue demand a real jump before auto-launch devices can help',()=>{
    const prologue=rooms.find(room=>room.kind==='prologue')!;
    expect(prologue.spikes.filter(spike=>spike.id.startsWith('opening-mandatory-jump-'))).toHaveLength(3);
    expect(prologue.tutorialSigns).toHaveLength(1);
  });

  it('remains free of data soft-locks and invalid timing windows',()=>expect(validateRooms()).toEqual([]));
});
