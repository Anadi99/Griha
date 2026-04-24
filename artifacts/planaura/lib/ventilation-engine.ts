/**
 * Ventilation Engine — rule-based airflow analysis
 */
import { Room, Opening } from "@/lib/store";

export interface AirflowPath {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  strength: "strong"|"moderate"|"weak";
  fromWall: "N"|"S"|"E"|"W";
  toWall: "N"|"S"|"E"|"W";
}

export interface RoomVentilation {
  roomId: string;
  score: number;
  label: "Good Cross Ventilation"|"Single Opening"|"Stagnant Air Zone"|"Blocked Airflow";
  openingCount: number;
  hasCrossVent: boolean;
}

export interface VentilationAnalysis {
  rooms: RoomVentilation[];
  paths: AirflowPath[];
  overallScore: number;
  deadZones: string[];
}

const OPPOSITE:Record<"N"|"S"|"E"|"W","N"|"S"|"E"|"W">={N:"S",S:"N",E:"W",W:"E"};

function areAdjacent(a:Room,b:Room):{adjacent:boolean;sharedWall:"N"|"S"|"E"|"W"|null}{
  const t=1;
  if(Math.abs((a.x+a.width)-b.x)<=t&&a.y<b.y+b.height&&a.y+a.height>b.y)return{adjacent:true,sharedWall:"E"};
  if(Math.abs(a.x-(b.x+b.width))<=t&&a.y<b.y+b.height&&a.y+a.height>b.y)return{adjacent:true,sharedWall:"W"};
  if(Math.abs((a.y+a.height)-b.y)<=t&&a.x<b.x+b.width&&a.x+a.width>b.x)return{adjacent:true,sharedWall:"S"};
  if(Math.abs(a.y-(b.y+b.height))<=t&&a.x<b.x+b.width&&a.x+a.width>b.x)return{adjacent:true,sharedWall:"N"};
  return{adjacent:false,sharedWall:null};
}

export function analyzeVentilation(rooms:Room[],openings:Opening[]):VentilationAnalysis{
  const paths:AirflowPath[]=[];
  const deadZones:string[]=[];
  const roomResults:RoomVentilation[]=rooms.map(room=>{
    const ro=openings.filter(o=>o.roomId===room.id);
    const count=ro.length;
    const walls=new Set(ro.map(o=>o.wall));
    const hasCrossVent=(walls.has("N")&&walls.has("S"))||(walls.has("E")&&walls.has("W"));
    let score:number;
    let label:RoomVentilation["label"];
    if(count===0){score=0;label="Stagnant Air Zone";deadZones.push(room.id);}
    else if(hasCrossVent){score=Math.min(100,90+count*2);label="Good Cross Ventilation";}
    else if(count===1){score=35;label="Single Opening";}
    else{score=55;label="Blocked Airflow";}
    return{roomId:room.id,score:Math.min(100,score),label,openingCount:count,hasCrossVent};
  });
  for(let i=0;i<rooms.length;i++){
    for(let j=i+1;j<rooms.length;j++){
      const{adjacent,sharedWall}=areAdjacent(rooms[i],rooms[j]);
      if(!adjacent||!sharedWall)continue;
      const opp=OPPOSITE[sharedWall];
      const aDoor=openings.some(o=>o.roomId===rooms[i].id&&o.wall===sharedWall&&o.type==="door");
      const bDoor=openings.some(o=>o.roomId===rooms[j].id&&o.wall===opp&&o.type==="door");
      if(!aDoor&&!bDoor)continue;
      const aFar=openings.some(o=>o.roomId===rooms[i].id&&o.wall===OPPOSITE[sharedWall]);
      const bFar=openings.some(o=>o.roomId===rooms[j].id&&o.wall===opp);
      const strength:AirflowPath["strength"]=aFar&&bFar?"strong":aFar||bFar?"moderate":"weak";
      paths.push({id:`path_${rooms[i].id}_${rooms[j].id}`,fromRoomId:rooms[i].id,toRoomId:rooms[j].id,strength,fromWall:sharedWall,toWall:opp});
    }
  }
  const overallScore=roomResults.length>0?Math.round(roomResults.reduce((s,r)=>s+r.score,0)/roomResults.length):0;
  return{rooms:roomResults,paths,overallScore,deadZones};
}
