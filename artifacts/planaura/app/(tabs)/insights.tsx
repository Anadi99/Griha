import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";
import { analyzeSunlight, SunHour } from "@/lib/sunlight-engine";
import { analyzeVentilation } from "@/lib/ventilation-engine";
import { calculateBOQ, formatQty } from "@/lib/boq-engine";
import { getCityData, CITY_NAMES, getClimateLabel, getClimateColor, getAdjustedCostRate } from "@/lib/location-data";
import { formatCost } from "@/lib/cost-calculator";

type InsightTab = "sunlight"|"airflow"|"boq"|"location";
const HOURS: SunHour[] = [6,7,8,9,10,11,12,13,14,15,16,17,18];
const HOUR_LABELS: Record<number,string> = {6:"6am",7:"7am",8:"8am",9:"9am",10:"10am",11:"11am",12:"12pm",13:"1pm",14:"2pm",15:"3pm",16:"4pm",17:"5pm",18:"6pm"};
const TAG_COLORS: Record<string,string> = {"Morning Sun":"#D97706","Afternoon Sun":"#FB923C","All-Day Sun":"#34D399","Low Light":"#737373","Hot Zone":"#DC2626"};
const VENT_COLORS: Record<string,string> = {"Good Cross Ventilation":"#34D399","Single Opening":"#D97706","Stagnant Air Zone":"#DC2626","Blocked Airflow":"#FB923C"};
const ROOM_NAMES: Record<string,string> = {bedroom:"Bedroom",kitchen:"Kitchen",bathroom:"Bathroom",living_room:"Living Room",office:"Office",dining_room:"Dining Room"};

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const store = useDesignerStore();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [tab, setTab] = useState<InsightTab>("sunlight");
  const [sunHour, setSunHour] = useState<SunHour>(10);
  const [boqTier, setBoqTier] = useState<"basic"|"standard"|"premium">("standard");
  const [showCityPicker, setShowCityPicker] = useState(false);

  const plan = store.currentPlan;
  const rooms = plan?.rooms ?? [];
  const openings = plan?.openings ?? [];
  const city = plan?.locationCity ?? "Mumbai";
  const cityData = getCityData(city);
  const sunAnalysis = analyzeSunlight(rooms, openings, sunHour);
  const ventAnalysis = analyzeVentilation(rooms, openings);
  const boqResult = calculateBOQ(rooms, boqTier);

  const TABS = [{ key:"sunlight" as InsightTab,label:"Sunlight",icon:"sun" },{ key:"airflow" as InsightTab,label:"Airflow",icon:"wind" },{ key:"boq" as InsightTab,label:"BOQ",icon:"package" },{ key:"location" as InsightTab,label:"Location",icon:"map-pin" }];

  const Empty = <View style={[styles.emptyState,{backgroundColor:colors.card,borderColor:colors.border}]}><Feather name="layout" size={32} color={colors.muted}/><Text style={[styles.emptyTitle,{color:colors.foreground}]}>No rooms yet</Text><Text style={[styles.emptySub,{color:colors.mutedForeground}]}>Add rooms in the Designer to see insights.</Text></View>;

  return (
    <View style={[styles.root,{backgroundColor:colors.background}]}>
      <View style={[styles.header,{paddingTop:topPad+8},isIOS?{}:{backgroundColor:colors.card,borderBottomColor:colors.border,borderBottomWidth:StyleSheet.hairlineWidth}]}>
        {isIOS&&<BlurView intensity={80} tint={isDark?"dark":"extraLight"} style={StyleSheet.absoluteFill}/>}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle,{color:colors.foreground}]}>Insights</Text>
          <Text style={[styles.headerSub,{color:colors.mutedForeground}]}>{plan?.name??"No plan loaded"}</Text>
        </View>
      </View>
      <View style={[styles.tabBar,{backgroundColor:colors.card,borderBottomColor:colors.border,borderBottomWidth:StyleSheet.hairlineWidth}]}>
        <View style={[styles.tabPills,{backgroundColor:colors.mutedBg}]}>
          {TABS.map(t=>{const isActive=tab===t.key;return(
            <ScalePress key={t.key} onPress={()=>{setTab(t.key);Haptics.selectionAsync();}} style={[styles.tabPill,isActive&&[styles.tabPillActive,{backgroundColor:colors.card}]]} scale={0.94}>
              <Feather name={t.icon as any} size={13} color={isActive?colors.primary:colors.mutedForeground}/>
              <Text style={[styles.tabLabel,{color:isActive?colors.primary:colors.mutedForeground}]}>{t.label}</Text>
            </ScalePress>
          );})}
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content,{paddingBottom:botPad+24}]} showsVerticalScrollIndicator={false}>

        {tab==="sunlight"&&<>
          <View style={[styles.scoreCard,{backgroundColor:"#D9770608",borderColor:"#D9770630"}]}>
            <View style={[styles.scoreCircle,{borderColor:"#D97706"}]}><Text style={[styles.scoreNum,{color:"#D97706"}]}>{sunAnalysis.overallScore}</Text><Text style={[styles.scoreSub,{color:"#D9770680"}]}>/100</Text></View>
            <View style={{flex:1}}><Text style={[styles.scoreTitle,{color:colors.foreground}]}>Sunlight Score</Text><Text style={[styles.scoreDesc,{color:colors.mutedForeground}]}>Based on room directions at {HOUR_LABELS[sunHour]}</Text></View>
          </View>
          <View style={[styles.sliderCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
            <View style={styles.sliderHeader}><Feather name="clock" size={14} color={colors.mutedForeground}/><Text style={[styles.sliderLabel,{color:colors.foreground}]}>Time of Day</Text><Text style={[styles.sliderValue,{color:colors.primary}]}>{HOUR_LABELS[sunHour]}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {HOURS.map(h=>{const isActive=h===sunHour;return(
                <ScalePress key={h} onPress={()=>{setSunHour(h);Haptics.selectionAsync();}} style={[styles.hourBtn,{backgroundColor:isActive?"#D97706":colors.mutedBg,borderColor:isActive?"#D97706":"transparent"}]} scale={0.9}>
                  <Text style={[styles.hourBtnText,{color:isActive?"#fff":colors.mutedForeground}]}>{HOUR_LABELS[h]}</Text>
                </ScalePress>
              );})}
            </ScrollView>
          </View>
          {rooms.length===0?Empty:sunAnalysis.rooms.map(rs=>{const room=rooms.find(r=>r.id===rs.roomId);if(!room)return null;const tc=TAG_COLORS[rs.tag]??colors.muted;return(
            <View key={rs.roomId} style={[styles.roomCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
              <View style={styles.roomCardHead}><View style={[styles.roomDot,{backgroundColor:tc}]}/><Text style={[styles.roomCardName,{color:colors.foreground}]}>{room.label??ROOM_NAMES[room.type]}</Text><View style={[styles.tagBadge,{backgroundColor:tc+"18"}]}><Text style={[styles.tagText,{color:tc}]}>{rs.tag}</Text></View></View>
              <View style={[styles.litBar,{backgroundColor:colors.mutedBg}]}><View style={[styles.litBarFill,{width:`${Math.round(rs.litFraction*100)}%` as any,backgroundColor:rs.litFraction>0.5?"#D97706":"#D9770640"}]}/></View>
              <Text style={[styles.litPct,{color:colors.mutedForeground}]}>{Math.round(rs.litFraction*100)}% lit · Daily score: {rs.score}</Text>
            </View>
          );})}
        </>}

        {tab==="airflow"&&<>
          <View style={[styles.scoreCard,{backgroundColor:"#38BDF808",borderColor:"#38BDF830"}]}>
            <View style={[styles.scoreCircle,{borderColor:"#38BDF8"}]}><Text style={[styles.scoreNum,{color:"#38BDF8"}]}>{ventAnalysis.overallScore}</Text><Text style={[styles.scoreSub,{color:"#38BDF880"}]}>/100</Text></View>
            <View style={{flex:1}}><Text style={[styles.scoreTitle,{color:colors.foreground}]}>Ventilation Score</Text><Text style={[styles.scoreDesc,{color:colors.mutedForeground}]}>{ventAnalysis.deadZones.length>0?`${ventAnalysis.deadZones.length} stagnant zone(s) detected`:"Airflow analyzed across all rooms"}</Text></View>
          </View>
          {rooms.length===0?Empty:ventAnalysis.rooms.map(vr=>{const room=rooms.find(r=>r.id===vr.roomId);if(!room)return null;const lc=VENT_COLORS[vr.label]??colors.muted;return(
            <View key={vr.roomId} style={[styles.roomCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
              <View style={styles.roomCardHead}><View style={[styles.roomDot,{backgroundColor:lc}]}/><Text style={[styles.roomCardName,{color:colors.foreground}]}>{room.label??ROOM_NAMES[room.type]}</Text><View style={[styles.tagBadge,{backgroundColor:lc+"18"}]}><Text style={[styles.tagText,{color:lc}]}>{vr.label}</Text></View></View>
              <Text style={[styles.litPct,{color:colors.mutedForeground}]}>{vr.openingCount} opening(s) · Score: {vr.score}/100{vr.hasCrossVent?" · Cross ventilation ✓":""}</Text>
            </View>
          );})}
          {openings.length===0&&<View style={[styles.tipCard,{backgroundColor:colors.primaryMuted,borderColor:colors.primary+"25"}]}><Feather name="info" size={13} color={colors.primary}/><Text style={[styles.tipText,{color:colors.primary}]}>Add door and window markers to rooms in the Designer for detailed airflow analysis.</Text></View>}
        </>}

        {tab==="boq"&&<>
          <View style={[styles.tierBar,{backgroundColor:colors.mutedBg}]}>
            {(["basic","standard","premium"] as const).map(t=>{const isActive=boqTier===t;const tc=t==="basic"?"#737373":t==="standard"?colors.primary:"#D97706";return(
              <ScalePress key={t} onPress={()=>{setBoqTier(t);Haptics.selectionAsync();}} style={[styles.tierBtn,isActive&&[styles.tierBtnActive,{backgroundColor:colors.card}]]} scale={0.94}>
                <Text style={[styles.tierBtnText,{color:isActive?tc:colors.muted}]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
              </ScalePress>
            );})}
          </View>
          {rooms.length===0?Empty:<>
            <View style={[styles.boqTotal,{backgroundColor:colors.primaryMuted,borderColor:colors.primary+"25"}]}>
              <Text style={[styles.boqTotalLabel,{color:colors.mutedForeground}]}>Total Material Cost</Text>
              <Text style={[styles.boqTotalValue,{color:colors.primary}]}>{formatCost(boqResult.totalMaterialCost)}</Text>
              <Text style={[styles.boqTotalSub,{color:colors.mutedForeground}]}>{boqResult.totalArea} sqft · {boqTier} tier</Text>
            </View>
            {["Structure","Finishes","Electrical","Plumbing"].map(cat=>{const items=boqResult.items.filter(i=>i.category===cat);if(!items.length)return null;return(
              <View key={cat} style={[styles.boqSection,{backgroundColor:colors.card,borderColor:colors.border}]}>
                <Text style={[styles.boqCatTitle,{color:colors.foreground}]}>{cat}</Text>
                {items.map(item=>(
                  <View key={item.id} style={[styles.boqItem,{borderTopColor:colors.border}]}>
                    <View style={[styles.boqItemIcon,{backgroundColor:colors.mutedBg}]}><Feather name={item.icon as any} size={13} color={colors.mutedForeground}/></View>
                    <View style={{flex:1}}><Text style={[styles.boqItemName,{color:colors.foreground}]}>{item.material}</Text><Text style={[styles.boqItemNote,{color:colors.mutedForeground}]}>{item.note}</Text></View>
                    <View style={{alignItems:"flex-end"}}><Text style={[styles.boqItemQty,{color:colors.foreground}]}>{formatQty(item.quantity,item.unit)}</Text><Text style={[styles.boqItemCost,{color:colors.primary}]}>{formatCost(item.totalCost)}</Text></View>
                  </View>
                ))}
              </View>
            );})}
          </>}
        </>}

        {tab==="location"&&<>
          <ScalePress onPress={()=>setShowCityPicker(!showCityPicker)} style={[styles.cityBtn,{backgroundColor:colors.card,borderColor:colors.border}]} scale={0.97}>
            <Feather name="map-pin" size={16} color={colors.primary}/>
            <Text style={[styles.cityBtnText,{color:colors.foreground}]}>{city}</Text>
            <View style={[styles.climateBadge,{backgroundColor:getClimateColor(cityData.climate)+"18"}]}><Text style={[styles.climateText,{color:getClimateColor(cityData.climate)}]}>{getClimateLabel(cityData.climate)}</Text></View>
            <Feather name={showCityPicker?"chevron-up":"chevron-down"} size={14} color={colors.muted}/>
          </ScalePress>
          {showCityPicker&&<View style={[styles.cityList,{backgroundColor:colors.card,borderColor:colors.border}]}>
            <ScrollView style={{maxHeight:220}} showsVerticalScrollIndicator={false}>
              {CITY_NAMES.map(c=>(
                <ScalePress key={c} onPress={()=>{store.setLocationCity(c);setShowCityPicker(false);Haptics.selectionAsync();}} style={[styles.cityItem,{borderBottomColor:colors.border}]} scale={0.98}>
                  <Text style={[styles.cityItemText,{color:c===city?colors.primary:colors.foreground}]}>{c}</Text>
                  {c===city&&<Feather name="check" size={14} color={colors.primary}/>}
                </ScalePress>
              ))}
            </ScrollView>
          </View>}
          <View style={[styles.cityStats,{backgroundColor:colors.card,borderColor:colors.border}]}>
            {[{l:"Climate",v:getClimateLabel(cityData.climate),c:getClimateColor(cityData.climate)},{l:"Avg Sun",v:`${cityData.avgSunHours}h/day`,c:"#D97706"},{l:"Avg Temp",v:`${cityData.avgTemp}°C`,c:"#FB923C"},{l:"Humidity",v:cityData.humidity,c:"#38BDF8"}].map((s,i)=>(
              <View key={i} style={[styles.cityStat,{borderColor:colors.border}]}><Text style={[styles.cityStatLabel,{color:colors.mutedForeground}]}>{s.l}</Text><Text style={[styles.cityStatValue,{color:s.c}]}>{s.v}</Text></View>
            ))}
          </View>
          <View style={[styles.costCard,{backgroundColor:colors.primaryMuted,borderColor:colors.primary+"25"}]}>
            <Feather name="trending-up" size={15} color={colors.primary}/>
            <View style={{flex:1}}><Text style={[styles.costCardTitle,{color:colors.foreground}]}>Adjusted Cost for {city}</Text><Text style={[styles.costCardValue,{color:colors.primary}]}>₹{getAdjustedCostRate("standard",city).toLocaleString("en-IN")}/sqft (standard)</Text></View>
          </View>
          <View style={[styles.tipsCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
            <Text style={[styles.tipsTitle,{color:colors.foreground}]}>Design Tips for {city}</Text>
            {cityData.tips.map((tip,i)=>(
              <View key={i} style={styles.tipRow}><View style={[styles.tipDot,{backgroundColor:getClimateColor(cityData.climate)}]}/><Text style={[styles.tipRowText,{color:colors.mutedForeground}]}>{tip}</Text></View>
            ))}
          </View>
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1},header:{overflow:"hidden"},headerInner:{paddingHorizontal:20,paddingBottom:14},headerTitle:{fontSize:28,fontWeight:"800",letterSpacing:-0.6},headerSub:{fontSize:13,marginTop:2},
  tabBar:{paddingHorizontal:16,paddingVertical:10},tabPills:{flexDirection:"row",borderRadius:12,padding:3,gap:2},tabPill:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4,paddingVertical:8,borderRadius:10},tabPillActive:{shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4,elevation:2},tabLabel:{fontSize:11,fontWeight:"700"},
  content:{padding:16,gap:12},
  scoreCard:{flexDirection:"row",alignItems:"center",gap:14,borderRadius:16,borderWidth:1,padding:16},scoreCircle:{width:72,height:72,borderRadius:36,borderWidth:4,alignItems:"center",justifyContent:"center"},scoreNum:{fontSize:26,fontWeight:"900",letterSpacing:-1},scoreSub:{fontSize:11,fontWeight:"600",marginTop:-2},scoreTitle:{fontSize:16,fontWeight:"800",letterSpacing:-0.3},scoreDesc:{fontSize:12,lineHeight:18,marginTop:3},
  sliderCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:14,gap:10},sliderHeader:{flexDirection:"row",alignItems:"center",gap:8},sliderLabel:{flex:1,fontSize:14,fontWeight:"600"},sliderValue:{fontSize:14,fontWeight:"800"},hourBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:10,borderWidth:1.5,marginHorizontal:3},hourBtnText:{fontSize:12,fontWeight:"700"},
  roomCard:{borderRadius:14,borderWidth:StyleSheet.hairlineWidth,padding:14,gap:8},roomCardHead:{flexDirection:"row",alignItems:"center",gap:8},roomDot:{width:8,height:8,borderRadius:4},roomCardName:{flex:1,fontSize:14,fontWeight:"700"},tagBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:8},tagText:{fontSize:11,fontWeight:"700"},litBar:{height:5,borderRadius:3,overflow:"hidden"},litBarFill:{height:"100%",borderRadius:3},litPct:{fontSize:11},
  tipCard:{flexDirection:"row",alignItems:"flex-start",gap:8,padding:12,borderRadius:14,borderWidth:1},tipText:{flex:1,fontSize:13,lineHeight:19},
  tierBar:{flexDirection:"row",borderRadius:12,padding:3,gap:2},tierBtn:{flex:1,alignItems:"center",paddingVertical:9,borderRadius:10},tierBtnActive:{shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3,elevation:2},tierBtnText:{fontSize:13,fontWeight:"700"},
  boqTotal:{borderRadius:16,borderWidth:1,padding:16,alignItems:"center",gap:4},boqTotalLabel:{fontSize:12},boqTotalValue:{fontSize:32,fontWeight:"900",letterSpacing:-1},boqTotalSub:{fontSize:12},
  boqSection:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,overflow:"hidden"},boqCatTitle:{fontSize:13,fontWeight:"800",padding:12,paddingBottom:8},boqItem:{flexDirection:"row",alignItems:"flex-start",gap:10,padding:12,borderTopWidth:StyleSheet.hairlineWidth},boqItemIcon:{width:28,height:28,borderRadius:8,alignItems:"center",justifyContent:"center",marginTop:1},boqItemName:{fontSize:13,fontWeight:"600"},boqItemNote:{fontSize:11,lineHeight:16,marginTop:2},boqItemQty:{fontSize:12,fontWeight:"700"},boqItemCost:{fontSize:12,fontWeight:"800",marginTop:2},
  cityBtn:{flexDirection:"row",alignItems:"center",gap:10,borderRadius:16,borderWidth:1.5,padding:14},cityBtnText:{flex:1,fontSize:15,fontWeight:"700"},climateBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:8},climateText:{fontSize:11,fontWeight:"700"},cityList:{borderRadius:14,borderWidth:StyleSheet.hairlineWidth,overflow:"hidden"},cityItem:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderBottomWidth:StyleSheet.hairlineWidth},cityItemText:{fontSize:14,fontWeight:"600"},
  cityStats:{flexDirection:"row",flexWrap:"wrap",borderRadius:16,borderWidth:StyleSheet.hairlineWidth,overflow:"hidden"},cityStat:{width:"50%",padding:14,borderWidth:StyleSheet.hairlineWidth,gap:3},cityStatLabel:{fontSize:11,fontWeight:"600"},cityStatValue:{fontSize:16,fontWeight:"800"},
  costCard:{flexDirection:"row",alignItems:"center",gap:10,borderRadius:14,borderWidth:1,padding:14},costCardTitle:{fontSize:13,fontWeight:"600"},costCardValue:{fontSize:15,fontWeight:"800",marginTop:2},
  tipsCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:10},tipsTitle:{fontSize:15,fontWeight:"800",letterSpacing:-0.3},tipRow:{flexDirection:"row",alignItems:"flex-start",gap:10},tipDot:{width:6,height:6,borderRadius:3,marginTop:6},tipRowText:{flex:1,fontSize:13,lineHeight:20},
  emptyState:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:32,alignItems:"center",gap:10},emptyTitle:{fontSize:17,fontWeight:"700"},emptySub:{fontSize:13,textAlign:"center",lineHeight:19},
});
