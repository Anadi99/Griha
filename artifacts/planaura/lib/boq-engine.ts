/**
 * BOQ Engine — material quantity estimation
 * Standard Indian construction approximations per sqft
 */
import { Room } from "@/lib/store";

export interface BOQItem {
  id: string;
  category: string;
  material: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  totalCost: number;
  icon: string;
  note: string;
}

export interface BOQResult {
  items: BOQItem[];
  totalMaterialCost: number;
  totalArea: number;
  tier: "basic"|"standard"|"premium";
}

const RATES={
  basic:   {cement:0.40,steel:2.5,bricks:8, sand:0.6,tiles:1.10,paint:0.08,wire:0.5,pvc:0.15},
  standard:{cement:0.45,steel:3.0,bricks:9, sand:0.7,tiles:1.15,paint:0.10,wire:0.6,pvc:0.18},
  premium: {cement:0.50,steel:3.5,bricks:10,sand:0.8,tiles:1.20,paint:0.12,wire:0.7,pvc:0.20},
};
const UNIT_RATES={cement:380,steel:65,bricks:8,sand:45,tiles:55,paint:220,wire:35,pvc:120};
const PM={basic:1,standard:1.4,premium:2.2};

export function calculateBOQ(rooms:Room[],tier:"basic"|"standard"|"premium"="standard"):BOQResult{
  const totalArea=rooms.reduce((s,r)=>s+r.area,0);
  if(totalArea===0)return{items:[],totalMaterialCost:0,totalArea:0,tier};
  const r=RATES[tier];const pm=PM[tier];
  const raw=[
    {id:"cement",cat:"Structure",mat:"Cement (OPC 53 Grade)",qty:Math.ceil(r.cement*totalArea),unit:"bags",rate:UNIT_RATES.cement*pm,icon:"box",note:"Foundation, columns, beams & slabs"},
    {id:"steel",cat:"Structure",mat:"TMT Steel Bars (Fe-500)",qty:Math.ceil(r.steel*totalArea),unit:"kg",rate:UNIT_RATES.steel*pm,icon:"layers",note:"RCC structural work"},
    {id:"bricks",cat:"Structure",mat:"Red Clay Bricks",qty:Math.ceil(r.bricks*totalArea),unit:"nos",rate:UNIT_RATES.bricks*pm,icon:"grid",note:"Standard 9\"×4.5\"×3\" size"},
    {id:"sand",cat:"Structure",mat:"River Sand",qty:Math.ceil(r.sand*totalArea),unit:"cft",rate:UNIT_RATES.sand*pm,icon:"wind",note:"Masonry and plastering"},
    {id:"tiles",cat:"Finishes",mat:"Floor Tiles",qty:Math.ceil(r.tiles*totalArea),unit:"sqft",rate:UNIT_RATES.tiles*pm,icon:"square",note:"Includes 10% wastage"},
    {id:"paint",cat:"Finishes",mat:"Interior Emulsion Paint",qty:Math.ceil(r.paint*totalArea*2.5),unit:"litres",rate:UNIT_RATES.paint*pm,icon:"droplet",note:"2 coats walls + ceiling"},
    {id:"wire",cat:"Electrical",mat:"Electrical Wiring (FR)",qty:Math.ceil(r.wire*totalArea),unit:"metres",rate:UNIT_RATES.wire*pm,icon:"zap",note:"1.5mm² and 2.5mm² copper"},
    {id:"pvc",cat:"Plumbing",mat:"PVC Pipes & Fittings",qty:Math.ceil(r.pvc*totalArea),unit:"metres",rate:UNIT_RATES.pvc*pm,icon:"git-branch",note:"Water supply and drainage"},
  ];
  const items:BOQItem[]=raw.map(i=>({id:i.id,category:i.cat,material:i.mat,quantity:i.qty,unit:i.unit,ratePerUnit:Math.round(i.rate),totalCost:Math.round(i.qty*i.rate),icon:i.icon,note:i.note}));
  return{items,totalMaterialCost:items.reduce((s,i)=>s+i.totalCost,0),totalArea,tier};
}

export function formatQty(qty:number,unit:string):string{
  if(qty>=1000)return`${(qty/1000).toFixed(1)}k ${unit}`;
  return`${qty.toLocaleString("en-IN")} ${unit}`;
}
