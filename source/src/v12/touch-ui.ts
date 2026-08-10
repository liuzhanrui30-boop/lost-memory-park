export type TouchMode='auto'|'on'|'off';

export function touchControlsEnabled(mode:TouchMode,touchCapable:boolean):boolean{
  return mode==='on'||(mode==='auto'&&touchCapable);
}

export function compactTouchViewport(width:number,height:number,touchCapable:boolean):boolean{
  return touchCapable&&Math.min(width,height)<=600;
}

export function directionForPointer(clientX:number,left:number,width:number):'left'|'right'{
  return clientX<left+width/2?'left':'right';
}
