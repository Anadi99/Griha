/**
 * Location Intelligence — offline city/climate dataset
 */
export type ClimateType = "hot_dry"|"hot_humid"|"composite"|"cold"|"temperate";

export interface CityData {
  name: string;
  state: string;
  climate: ClimateType;
  avgSunHours: number;
  avgTemp: number;
  humidity: "low"|"moderate"|"high";
  costMultiplier: number;
  tips: string[];
}

export const CITIES:Record<string,CityData>={
  Mumbai:{name:"Mumbai",state:"Maharashtra",climate:"hot_humid",avgSunHours:7,avgTemp:27,humidity:"high",costMultiplier:1.4,tips:["High humidity — prioritize cross ventilation in all rooms","Avoid west-facing bedrooms — intense afternoon heat","Use light-colored exterior paint to reflect heat","Ensure bathroom ventilation to prevent mold"]},
  Delhi:{name:"Delhi",state:"Delhi NCR",climate:"composite",avgSunHours:8,avgTemp:25,humidity:"moderate",costMultiplier:1.3,tips:["Extreme summer heat — shade west-facing windows","Cold winters — south-facing rooms get maximum winter sun","Double-glazed windows recommended for temperature control","Vastu alignment is especially important in composite climates"]},
  Bangalore:{name:"Bangalore",state:"Karnataka",climate:"temperate",avgSunHours:7,avgTemp:23,humidity:"moderate",costMultiplier:1.25,tips:["Pleasant climate — maximize natural ventilation","East-facing rooms get ideal morning light year-round","Minimal insulation needed — focus on airflow design","Terrace gardens work well in this climate"]},
  Chennai:{name:"Chennai",state:"Tamil Nadu",climate:"hot_humid",avgSunHours:8,avgTemp:29,humidity:"high",costMultiplier:1.1,tips:["Very high heat and humidity — cross ventilation is critical","Avoid south and west-facing bedrooms in summer","Use terracotta roof tiles for natural cooling","Deep overhangs on south and west walls reduce heat gain"]},
  Hyderabad:{name:"Hyderabad",state:"Telangana",climate:"hot_dry",avgSunHours:8.5,avgTemp:26,humidity:"low",costMultiplier:1.1,tips:["Hot and dry — thick walls retain coolness","North-facing courtyards provide natural cooling","Minimize west-facing windows to reduce heat load","Water bodies near the home improve microclimate"]},
  Pune:{name:"Pune",state:"Maharashtra",climate:"temperate",avgSunHours:7.5,avgTemp:24,humidity:"moderate",costMultiplier:1.2,tips:["Good climate for natural ventilation year-round","East-facing living rooms get ideal morning light","Monsoon-proof construction is essential","Green roofs and walls work well in this climate"]},
  Kolkata:{name:"Kolkata",state:"West Bengal",climate:"hot_humid",avgSunHours:6,avgTemp:27,humidity:"high",costMultiplier:1.0,tips:["High humidity — ventilation is the top priority","Raised floors help with moisture management","North-facing rooms stay cooler in summer","Avoid basement rooms — flooding risk in monsoon"]},
  Ahmedabad:{name:"Ahmedabad",state:"Gujarat",climate:"hot_dry",avgSunHours:9,avgTemp:27,humidity:"low",costMultiplier:1.05,tips:["Extreme heat — courtyard design is highly recommended","Thick masonry walls provide natural insulation","Avoid large west-facing windows","Underground water tanks help keep the home cool"]},
  Jaipur:{name:"Jaipur",state:"Rajasthan",climate:"hot_dry",avgSunHours:9.5,avgTemp:26,humidity:"low",costMultiplier:0.95,tips:["Desert climate — traditional jali screens reduce heat","Light-colored stone exteriors reflect intense sunlight","Deep verandahs on south and west sides are essential","Rooftop sleeping areas are traditional and practical"]},
  Chandigarh:{name:"Chandigarh",state:"Punjab/Haryana",climate:"composite",avgSunHours:7.5,avgTemp:22,humidity:"moderate",costMultiplier:1.1,tips:["Cold winters — south-facing rooms maximize winter warmth","Hot summers — shade west-facing walls","Good insulation in walls and roof is cost-effective","Planned city — follow local building regulations carefully"]},
};

export const CITY_NAMES=Object.keys(CITIES).sort();

export function getCityData(city:string):CityData{return CITIES[city]??CITIES["Mumbai"];}

export function getAdjustedCostRate(tier:"basic"|"standard"|"premium",city:string):number{
  const BASE={basic:1500,standard:2500,premium:4500};
  return Math.round(BASE[tier]*getCityData(city).costMultiplier);
}

export function getClimateLabel(c:ClimateType):string{
  return{hot_dry:"Hot & Dry",hot_humid:"Hot & Humid",composite:"Composite",cold:"Cold",temperate:"Temperate"}[c];
}

export function getClimateColor(c:ClimateType):string{
  return{hot_dry:"#EA580C",hot_humid:"#0284C7",composite:"#7C3AED",cold:"#2563EB",temperate:"#059669"}[c];
}
