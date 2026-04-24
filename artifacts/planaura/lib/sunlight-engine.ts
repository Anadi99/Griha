/**
 * Sunlight Engine — offline directional approximation
 * Maps compass direction + hour → sunlit walls per room
 */
import { Room, Opening } from "@/lib/store";

export type SunHour = 6|7|8|9|10|11|12|13|14|15|16|17|18;

export interface RoomSunlight {
  roomId: string;
  litFraction: number;
  score: number;
  tag: "Morning Sun"|"Afternoon Sun"|"All-Day Sun"|"Low Light"|"Hot Zone";
  warmth: number;
}

export interface SunlightAnalysis {
  rooms: RoomSunlight[];
  overallScore: number;
  sunAngle: number;
  sunX: number;
  sunY: number;
}

const SUN_DIR: Record<number,{wall:"E"|"SE"|"S"|"SW"|"W";intensity:number}> = {
  6:{wall:"E",intensity:0.3},7:{wall:"E",intensity:0.6},8:{wall:"E",intensity:0.85},
  9:{wall:"E",intensity:1.0},10:{wall:"SE",intensity:1.0},11:{wall:"SE",intensity:0.95},
  12:{wall:"S",intensity:0.9},13:{wall:"S",intensity:0.9},14:{wall:"SW",intensity:0.95},
  15:{wall:"SW",intensity:1.0},16:{wall:"W",intensity:1.0},17:{wall:"W",intensity:0.85},
  18:{wall:"W",intensity:0.5},
};

function getLitWalls(hour:number):Array<"N"|"S"|"E"|"W">{
  const sun=SUN_DIR[hour];if(!sun)return[];
  const map:Record<string,Array<"N"|"S"|"E"|"W">>={E:["E"],SE:["E","S"],S:["S"],SW:["S","W"],W:["W"]};
  return map[sun.wall]??[];
}

function hasWindowOnWall(roomId:string,wall:"N"|"S"|"E"|"W",openings:Opening[]):boolean{
  return openings.some(o=>o.roomId===roomId&&o.wall===wall&&o.type==="window");
}

export function analyzeSunlight(rooms:Room[],openings:Opening[],hour:SunHour):SunlightAnalysis{
  const litWallsNow=getLitWalls(hour);
  const sun=SUN_DIR[hour];
  const roomResults:RoomSunlight[]=rooms.map(room=>{
    const hasAnyWindow=openings.some(o=>o.roomId===room.id&&o.type==="window");
    let litFraction=0;
    if(hasAnyWindow){
      const winOnLit=litWallsNow.filter(w=>hasWindowOnWall(room.id,w,openings));
      litFraction=winOnLit.length>0?(sun?.intensity??0)*(winOnLit.length/2):0;
    } else {
      const dir=room.direction;
      const east=["NE","E","SE"],west=["NW","W","SW"],south=["S","SE","SW"];
      if(hour<=10&&east.includes(dir))litFraction=sun?.intensity??0;
      else if(hour>=14&&west.includes(dir))litFraction=sun?.intensity??0;
      else if(hour>=11&&hour<=14&&south.includes(dir))litFraction=(sun?.intensity??0)*0.7;
      else litFraction=0.1;
    }
    litFraction=Math.min(1,litFraction);
    const hours:SunHour[]=[6,7,8,9,10,11,12,13,14,15,16,17,18];
    let dailyScore=0;
    for(const h of hours){
      const lw=getLitWalls(h);const s=SUN_DIR[h];
      const hasWin=hasAnyWindow
        ?lw.some(w=>hasWindowOnWall(room.id,w,openings))
        :lw.some(w=>{
          const d=room.direction;
          if(w==="E"&&["NE","E","SE"].includes(d))return true;
          if(w==="W"&&["NW","W","SW"].includes(d))return true;
          if(w==="S"&&["S","SE","SW"].includes(d))return true;
          return false;
        });
      if(hasWin)dailyScore+=(s?.intensity??0)*100;
    }
    dailyScore=Math.min(100,Math.round(dailyScore/hours.length));
    const dir=room.direction;
    let tag:RoomSunlight["tag"];
    if(dailyScore>=75)tag="All-Day Sun";
    else if(dailyScore>=50&&["NE","E","SE"].includes(dir))tag="Morning Sun";
    else if(dailyScore>=50&&["NW","W","SW"].includes(dir))tag="Afternoon Sun";
    else if(dailyScore>=70&&["S","SW","SE"].includes(dir))tag="Hot Zone";
    else tag="Low Light";
    return{roomId:room.id,litFraction,score:dailyScore,tag,warmth:litFraction};
  });
  const overallScore=roomResults.length>0
    ?Math.round(roomResults.reduce((s,r)=>s+r.score,0)/roomResults.length):0;
  const hourNorm=(hour-6)/12;
  return{rooms:roomResults,overallScore,sunAngle:hourNorm*180,sunX:hourNorm,sunY:1-Math.sin(hourNorm*Math.PI)*0.8};
}

export function getSunlightTag(score:number):string{
  if(score>=75)return"Excellent";if(score>=50)return"Good";if(score>=25)return"Moderate";return"Poor";
}
