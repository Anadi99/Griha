/**
 * Layout Generator — offline rule-based Vastu layout generation
 */
import { Room } from "@/lib/store";

export interface GeneratorInput {
  plotWidth: number;
  plotHeight: number;
  rooms: Array<{ type: Room["type"]; count: number }>;
}

export interface GeneratedLayout {
  id: string;
  name: string;
  description: string;
  rooms: Omit<Room,"id">[];
  vastuScore: number;
  efficiency: number;
}

type RoomType = Room["type"];
type Direction = Room["direction"];

const PREFERRED_ZONE:Record<RoomType,{xFrac:number;yFrac:number}>={
  living_room:{xFrac:0.1,yFrac:0.1},bedroom:{xFrac:0.55,yFrac:0.55},
  kitchen:{xFrac:0.55,yFrac:0.1},bathroom:{xFrac:0.1,yFrac:0.55},
  office:{xFrac:0.1,yFrac:0.1},dining_room:{xFrac:0.3,yFrac:0.3},
};

const ROOM_SIZES:Record<RoomType,{w:number;h:number}>={
  bedroom:{w:6,h:5},living_room:{w:8,h:6},kitchen:{w:5,h:4},
  bathroom:{w:3,h:3},office:{w:5,h:4},dining_room:{w:5,h:4},
};

function calcDir(cx:number,cy:number,pw:number,ph:number):Direction{
  const nx=cx/pw-0.5,ny=cy/ph-0.5;
  const a=((Math.atan2(ny,nx)*(180/Math.PI))+360)%360;
  if(a>=337.5||a<22.5)return"E";if(a>=22.5&&a<67.5)return"SE";
  if(a>=67.5&&a<112.5)return"S";if(a>=112.5&&a<157.5)return"SW";
  if(a>=157.5&&a<202.5)return"W";if(a>=202.5&&a<247.5)return"NW";
  if(a>=247.5&&a<292.5)return"N";return"NE";
}

function scoreLayout(rooms:Omit<Room,"id">[],pw:number,ph:number):number{
  const PREF:Record<RoomType,Direction[]>={
    bedroom:["SW","W","NW"],kitchen:["SE","S"],bathroom:["NW","N"],
    living_room:["N","E","NE"],office:["N","E","NE"],dining_room:["W","E"],
  };
  let score=100;
  for(const r of rooms){
    const dir=calcDir(r.x+r.width/2,r.y+r.height/2,pw,ph);
    if(!PREF[r.type].includes(dir))score-=12;
  }
  return Math.max(0,score);
}

function placeRooms(input:GeneratorInput,strategy:"vastu"|"compact"|"open"):Omit<Room,"id">[]{
  const{plotWidth:pw,plotHeight:ph,rooms:defs}=input;
  const placed:Omit<Room,"id">[]=[];
  const margin=1;
  const toPlace:RoomType[]=[];
  for(const d of defs)for(let i=0;i<d.count;i++)toPlace.push(d.type);
  const priority:RoomType[]=["living_room","bedroom","kitchen","bathroom","dining_room","office"];
  toPlace.sort((a,b)=>priority.indexOf(a)-priority.indexOf(b));
  for(const type of toPlace){
    const size=ROOM_SIZES[type];
    const zone=PREFERRED_ZONE[type];
    let bx=Math.round(zone.xFrac*(pw-size.w-margin*2))+margin;
    let by=Math.round(zone.yFrac*(ph-size.h-margin*2))+margin;
    if(strategy==="compact"){bx=placed.length%2===0?margin:Math.round(pw/2);by=Math.floor(placed.length/2)*(size.h+margin)+margin;}
    else if(strategy==="open"){bx=Math.round(zone.xFrac*pw*0.8)+margin;by=Math.round(zone.yFrac*ph*0.8)+margin;}
    let fx=Math.max(margin,Math.min(pw-size.w-margin,bx));
    let fy=Math.max(margin,Math.min(ph-size.h-margin,by));
    let attempts=0;
    while(attempts<20){
      const ov=placed.find(p=>fx<p.x+p.width+1&&fx+size.w+1>p.x&&fy<p.y+p.height+1&&fy+size.h+1>p.y);
      if(!ov)break;
      fx=ov.x+ov.width+margin;
      if(fx+size.w>pw-margin){fx=margin;fy+=size.h+margin;}
      attempts++;
    }
    const dir=calcDir(fx+size.w/2,fy+size.h/2,pw,ph);
    placed.push({type,x:fx,y:fy,width:size.w,height:size.h,direction:dir,area:size.w*size.h*4});
  }
  return placed;
}

export function generateLayouts(input:GeneratorInput):GeneratedLayout[]{
  const{plotWidth:pw,plotHeight:ph}=input;
  const strategies:[string,string,string,"vastu"|"compact"|"open"][]=[
    ["vastu","Vastu Optimized","Rooms placed in ideal Vastu zones for maximum energy alignment","vastu"],
    ["compact","Compact Layout","Space-efficient arrangement, maximizes usable area","compact"],
    ["open","Open Plan","Spacious layout with breathing room between zones","open"],
  ];
  return strategies.map(([id,name,desc,strat])=>{
    const rooms=placeRooms(input,strat);
    const totalUsed=rooms.reduce((s,r)=>s+r.width*r.height,0);
    const efficiency=Math.round((totalUsed/(pw*ph))*100);
    return{id,name,description:desc,rooms,vastuScore:scoreLayout(rooms,pw,ph),efficiency};
  });
}
