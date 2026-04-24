/**
 * Room Scan Engine — photo-based Vastu analysis for existing rooms
 */
import { Room } from "@/lib/store";

export type RoomType = Room["type"];
export type Direction = Room["direction"];

export interface RoomScanInput {
  roomType: RoomType;
  facingDirection: Direction;
  windowDirection: Direction;
  hasAttachedBath: boolean;
  cookingDirection: Direction|null;
  workDeskDirection: Direction|null;
  bedHeadDirection: Direction|null;
  clutter: "none"|"moderate"|"high";
  naturalLight: "good"|"moderate"|"poor";
  ventilation: "good"|"moderate"|"poor";
}

export interface ScanIssue { id:string; severity:"high"|"medium"|"low"; title:string; detail:string; }
export interface ScanCorrection { id:string; priority:"high"|"medium"|"low"; action:string; reason:string; icon:string; }
export interface ScanPositive { id:string; title:string; detail:string; }

export interface RoomScanResult {
  score: number;
  status: string;
  statusColor: string;
  issues: ScanIssue[];
  corrections: ScanCorrection[];
  positives: ScanPositive[];
  summary: string;
}

const PREF_ENTR:Record<RoomType,Direction[]>={bedroom:["S","W","SW"],kitchen:["E","SE"],bathroom:["N","NW"],living_room:["N","E","NE"],office:["N","E","NE"],dining_room:["W","E"]};
const AVOID_ENTR:Record<RoomType,Direction[]>={bedroom:["N","NE","SE"],kitchen:["N","NW","SW"],bathroom:["SE","S","SW"],living_room:["S","SW"],office:["S","SW","W"],dining_room:["S","SW"]};
const PREF_WIN:Record<RoomType,Direction[]>={bedroom:["E","N"],kitchen:["E","SE"],bathroom:["N","E"],living_room:["N","E","NE"],office:["N","E"],dining_room:["E","N"]};
const ROOM_DISPLAY:Record<RoomType,string>={bedroom:"Bedroom",kitchen:"Kitchen",bathroom:"Bathroom",living_room:"Living Room",office:"Office",dining_room:"Dining Room"};

export function analyzeRoomScan(input:RoomScanInput):RoomScanResult{
  const issues:ScanIssue[]=[],corrections:ScanCorrection[]=[],positives:ScanPositive[]=[];
  let score=0;
  const name=ROOM_DISPLAY[input.roomType];
  const pEntr=PREF_ENTR[input.roomType],aEntr=AVOID_ENTR[input.roomType];

  if(pEntr.includes(input.facingDirection)){score+=20;positives.push({id:"entr_good",title:`${name} entrance faces ${input.facingDirection}`,detail:`Ideal direction for a ${name.toLowerCase()} entrance per Vastu.`});}
  else if(aEntr.includes(input.facingDirection)){score+=0;issues.push({id:"entr_bad",severity:"high",title:`Entrance faces ${input.facingDirection} — avoid for ${name}`,detail:`The ${input.facingDirection} direction disrupts energy flow in a ${name.toLowerCase()}.`});corrections.push({id:"fix_entr",priority:"high",action:`Reposition door to face ${pEntr[0]} if structurally possible`,reason:`${pEntr[0]} is the most auspicious entrance for a ${name.toLowerCase()}`,icon:"home"});}
  else{score+=10;corrections.push({id:"imp_entr",priority:"medium",action:`Consider shifting entrance to face ${pEntr[0]}`,reason:`Current direction (${input.facingDirection}) is neutral — ${pEntr[0]} would be better`,icon:"arrow-right"});}

  const pWin=PREF_WIN[input.roomType];
  if(pWin.includes(input.windowDirection)){score+=15;positives.push({id:"win_good",title:`Window faces ${input.windowDirection} — excellent`,detail:`${input.windowDirection}-facing windows bring ideal light for a ${name.toLowerCase()}.`});}
  else{score+=8;corrections.push({id:"fix_win",priority:"low",action:`Use heavier curtains on the ${input.windowDirection} window`,reason:`${pWin[0]}-facing windows are preferred`,icon:"wind"});}

  if(input.roomType==="bedroom"&&input.bedHeadDirection){
    if(["S","E","SW"].includes(input.bedHeadDirection)){score+=15;positives.push({id:"bed_good",title:`Bed headboard faces ${input.bedHeadDirection} — ideal`,detail:"South/East head position promotes deep restful sleep."});}
    else if(input.bedHeadDirection==="N"){score+=0;issues.push({id:"bed_bad",severity:"high",title:"Bed headboard faces North — avoid",detail:"North-facing head causes magnetic interference, disturbed sleep and health issues."});corrections.push({id:"fix_bed",priority:"high",action:"Rotate bed so headboard points South or East",reason:"South aligns with Earth's magnetic field — best for sleep",icon:"moon"});}
    else{score+=7;corrections.push({id:"imp_bed",priority:"medium",action:`Rotate headboard to face South or East (currently ${input.bedHeadDirection})`,reason:"South and East are the two best directions for sleeping",icon:"moon"});}
    if(input.hasAttachedBath){issues.push({id:"att_bath",severity:"low",title:"Attached bathroom detected",detail:"Attached bathrooms in SW or NE corner can affect bedroom energy."});corrections.push({id:"fix_bath",priority:"low",action:"Keep bathroom door closed at all times while sleeping",reason:"Prevents negative energy from entering the sleeping space",icon:"lock"});}
  }

  if(input.roomType==="kitchen"&&input.cookingDirection){
    if(["E","SE"].includes(input.cookingDirection)){score+=15;positives.push({id:"cook_good",title:`Cook faces ${input.cookingDirection} — auspicious`,detail:"East-facing cooking aligns with fire element (Agni) and promotes health."});}
    else{score+=0;issues.push({id:"cook_bad",severity:"medium",title:`Cook faces ${input.cookingDirection} — not ideal`,detail:"Facing South or West while cooking is considered inauspicious."});corrections.push({id:"fix_cook",priority:"medium",action:"Rearrange kitchen platform so cook faces East or SE",reason:"East-facing cooking promotes health and prosperity",icon:"coffee"});}
  }

  if(input.roomType==="office"&&input.workDeskDirection){
    if(["N","E","NE"].includes(input.workDeskDirection)){score+=15;positives.push({id:"desk_good",title:`Work desk faces ${input.workDeskDirection} — productive`,detail:"North and East-facing work positions enhance concentration and career growth."});}
    else{score+=0;issues.push({id:"desk_bad",severity:"medium",title:`Desk faces ${input.workDeskDirection} — not ideal`,detail:"South-facing work positions cause stress and reduce productivity."});corrections.push({id:"fix_desk",priority:"medium",action:`Rotate desk to face North or East (currently ${input.workDeskDirection})`,reason:"North is associated with Kubera (wealth) — ideal for work",icon:"briefcase"});}
  }

  if(input.clutter==="none"){score+=10;positives.push({id:"clutter_good",title:"Room is clutter-free",detail:"Clear spaces allow positive energy (prana) to flow freely."});}
  else if(input.clutter==="moderate"){score+=5;corrections.push({id:"fix_clutter_mod",priority:"medium",action:"Declutter and organize — especially NE and N corners",reason:"NE corner is the most sacred zone — clutter here blocks positive energy",icon:"trash-2"});}
  else{score+=0;issues.push({id:"clutter_bad",severity:"medium",title:"High clutter detected",detail:"Excessive clutter traps stagnant energy and causes stress."});corrections.push({id:"fix_clutter_high",priority:"high",action:"Deep declutter — remove anything unused for 6+ months",reason:"Clutter is the #1 Vastu defect",icon:"trash-2"});}

  if(input.naturalLight==="good"){score+=10;positives.push({id:"light_good",title:"Good natural light",detail:"Abundant natural light energizes the space and uplifts mood."});}
  else if(input.naturalLight==="moderate"){score+=5;corrections.push({id:"fix_light",priority:"low",action:"Add mirrors on North or East walls to amplify natural light",reason:"Mirrors on N/E walls reflect light and enhance positive energy",icon:"sun"});}
  else{score+=0;issues.push({id:"light_bad",severity:"low",title:"Poor natural light",detail:"Dark rooms accumulate negative energy."});corrections.push({id:"fix_light_poor",priority:"medium",action:"Install warm yellow lights and keep curtains open during the day",reason:"Warm light mimics sunlight energy and activates positive Vastu zones",icon:"sun"});}

  if(input.ventilation==="good"){score+=10;positives.push({id:"vent_good",title:"Good ventilation",detail:"Fresh air keeps prana active and prevents energy stagnation."});}
  else if(input.ventilation==="moderate"){score+=5;corrections.push({id:"fix_vent",priority:"low",action:"Open windows for at least 30 minutes every morning",reason:"Morning air from the East carries the most positive energy",icon:"wind"});}
  else{score+=0;issues.push({id:"vent_bad",severity:"medium",title:"Poor ventilation",detail:"Stagnant air traps negative energy."});corrections.push({id:"fix_vent_poor",priority:"high",action:"Install exhaust fan or air purifier — add Tulsi or Money Plant",reason:"Plants purify air and are highly auspicious in Vastu",icon:"wind"});}

  score=Math.min(100,Math.max(0,score));
  let status:string,statusColor:string;
  if(score>=80){status="Excellent";statusColor="#16A34A";}
  else if(score>=60){status="Good";statusColor="#16A34A";}
  else if(score>=40){status="Fair";statusColor="#D97706";}
  else{status="Needs Work";statusColor="#DC2626";}

  const highCount=issues.filter(i=>i.severity==="high").length;
  const summary=highCount>0
    ?`Your ${name.toLowerCase()} has ${highCount} critical Vastu issue${highCount>1?"s":""} that need attention.`
    :issues.length>0?`Your ${name.toLowerCase()} is reasonably aligned. A few adjustments will enhance the energy.`
    :`Your ${name.toLowerCase()} has strong Vastu alignment. Keep maintaining the positive elements.`;

  return{score,status,statusColor,issues,corrections,positives,summary};
}

export function getQuestions(roomType:RoomType){
  const base=[
    {id:"facingDirection",label:"Which direction does the main door / entrance face?",type:"direction" as const,required:true},
    {id:"windowDirection",label:"Which direction is the primary window facing?",type:"direction" as const,required:true},
    {id:"clutter",label:"How would you describe the clutter level?",type:"options" as const,options:[{value:"none",label:"Clean & organized"},{value:"moderate",label:"Some clutter"},{value:"high",label:"Very cluttered"}],required:true},
    {id:"naturalLight",label:"How is the natural light in this room?",type:"options" as const,options:[{value:"good",label:"Bright & sunny"},{value:"moderate",label:"Moderate light"},{value:"poor",label:"Dark / dim"}],required:true},
    {id:"ventilation",label:"How is the air circulation / ventilation?",type:"options" as const,options:[{value:"good",label:"Well ventilated"},{value:"moderate",label:"Moderate"},{value:"poor",label:"Stuffy / poor"}],required:true},
  ];
  const extra:typeof base=[];
  if(roomType==="bedroom"){
    extra.push({id:"bedHeadDirection",label:"Which direction does the bed headboard point?",type:"direction" as const,required:true});
    extra.push({id:"hasAttachedBath",label:"Does the bedroom have an attached bathroom?",type:"options" as const,options:[{value:"true",label:"Yes"},{value:"false",label:"No"}],required:true});
  }
  if(roomType==="kitchen")extra.push({id:"cookingDirection",label:"Which direction does the cook face while cooking?",type:"direction" as const,required:true});
  if(roomType==="office")extra.push({id:"workDeskDirection",label:"Which direction do you face while working at your desk?",type:"direction" as const,required:true});
  return[...base,...extra];
}
