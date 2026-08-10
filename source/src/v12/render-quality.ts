const clamp=(value:number,min:number,max:number):number=>Math.max(min,Math.min(max,value));

/**
 * Keeps the backing canvas above the 1280×720 logical scene resolution while
 * allowing full-HD output on larger desktop windows. The cap protects fill
 * rate and cache memory, so quality is gained without unbounded Retina cost.
 */
export function preferredRenderScale(width:number,height:number,logicalWidth=1280,logicalHeight=720,compactTouch=false):number{
  if(compactTouch)return 1;
  const viewportScale=Math.min(width/logicalWidth,height/logicalHeight);
  return clamp(viewportScale,1.25,1.5);
}
