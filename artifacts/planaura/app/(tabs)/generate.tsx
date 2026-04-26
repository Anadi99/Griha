import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Animated, TextInput, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Room } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";
import { generateLayouts, GeneratorInput, GeneratedLayout } from "@/lib/layout-generator";
import { useToast } from "@/components/Toast";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; color: string }> = [
  { type:"bedroom",     label:"Bedroom",     color:"#C084FC" },
  { type:"living_room", label:"Living Room", color:"#38BDF8" },
  { type:"kitchen",     label:"Kitchen",     color:"#FB923C" },
  { type:"bathroom",    label:"Bathroom",    color:"#34D399" },
  { type:"office",      label:"Office",      color:"#6366F1" },
  { type:"dining_room", label:"Dining Room", color:"#FACC15" },
];
const ROOM_COLORS: Record<string,string> = {
  bedroom:"#C084FC", kitchen:"#FB923C", bathroom:"#34D399",
  living_room:"#38BDF8", office:"#6366F1", dining_room:"#FACC15",
};

function MiniPlan({ layout }: { layout: GeneratedLayout }) {
  const colors = useColors();
  const W=160,H=120;
  const maxX=Math.max(...layout.rooms.map(r=>r.x+r.width),1);
  const maxY=Math.max(...layout.rooms.map(r=>r.y+r.height),1);
  const s=Math.min((W-8)/maxX,(H-8)/maxY);
  return (
    <View style={[styles.miniPlan,{width:W,height:H,backgroundColor:colors.mutedBg,borderColor:colors.border}]}>
      {layout.rooms.map((room,i)=>{
        const c=ROOM_COLORS[room.type]??"#8B5E3C";
        return <View key={i} style={[styles.miniRoom,{left:4+room.x*s,top:4+room.y*s,width:Math.max(8,room.width*s),height:Math.max(8,room.height*s),backgroundColor:c+"30",borderColor:c}]}/>;
      })}
    </View>
  );
}

export default function GenerateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const store = useDesignerStore();
  const router = useRouter();
  const toast = useToast();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [plotW, setPlotW] = useState("20");
  const [plotH, setPlotH] = useState("15");
  const [roomCounts, setRoomCounts] = useState<Record<string,number>>({ bedroom:2,living_room:1,kitchen:1,bathroom:2 });
  const [layouts, setLayouts] = useState<GeneratedLayout[]>([]);
  const [generated, setGenerated] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleGenerate = () => {
    const pw=parseInt(plotW)||20, ph=parseInt(plotH)||15;
    const rooms=Object.entries(roomCounts).filter(([,c])=>c>0).map(([type,count])=>({type:type as Room["type"],count}));
    const result=generateLayouts({plotWidth:pw,plotHeight:ph,rooms});
    setLayouts(result); setGenerated(true);
    fadeAnim.setValue(0);
    Animated.spring(fadeAnim,{toValue:1,tension:80,friction:10,useNativeDriver:true}).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLoad = (layout: GeneratedLayout) => {
    store.createNewPlan(`Generated — ${layout.name}`);
    layout.rooms.forEach(room=>store.addRoom(room));
    store.calculateDirections();
    toast.show("Layout loaded into Designer","success");
    router.push("/(tabs)/designer");
  };

  const setCount = (type: string, delta: number) => {
    setRoomCounts(p=>({...p,[type]:Math.max(0,Math.min(4,(p[type]??0)+delta))}));
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.root,{backgroundColor:colors.background}]}>
      <View style={[styles.header,{paddingTop:topPad+8},isIOS?{}:{backgroundColor:colors.card,borderBottomColor:colors.border,borderBottomWidth:StyleSheet.hairlineWidth}]}>
        {isIOS&&<BlurView intensity={80} tint={isDark?"dark":"extraLight"} style={StyleSheet.absoluteFill}/>}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle,{color:colors.foreground}]}>Generate</Text>
          <Text style={[styles.headerSub,{color:colors.mutedForeground}]}>AI layout suggestions</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content,{paddingBottom:botPad+24}]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}>
          <Text style={[styles.cardTitle,{color:colors.foreground}]}>Plot Size</Text>
          <Text style={[styles.cardSub,{color:colors.mutedForeground}]}>In grid units (1 unit ≈ 2 ft)</Text>
          <View style={styles.plotRow}>
            <View style={styles.plotInput}><Text style={[styles.plotLabel,{color:colors.mutedForeground}]}>Width</Text><TextInput value={plotW} onChangeText={setPlotW} keyboardType="number-pad" style={[styles.plotField,{color:colors.foreground,backgroundColor:colors.mutedBg,borderColor:colors.border}]}/></View>
            <Text style={[styles.plotX,{color:colors.muted}]}>×</Text>
            <View style={styles.plotInput}><Text style={[styles.plotLabel,{color:colors.mutedForeground}]}>Height</Text><TextInput value={plotH} onChangeText={setPlotH} keyboardType="number-pad" style={[styles.plotField,{color:colors.foreground,backgroundColor:colors.mutedBg,borderColor:colors.border}]}/></View>
          </View>
        </View>
        <View style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}>
          <Text style={[styles.cardTitle,{color:colors.foreground}]}>Rooms Needed</Text>
          {ROOM_TYPES.map(rt=>{const count=roomCounts[rt.type]??0;return(
            <View key={rt.type} style={[styles.roomRow,{borderBottomColor:colors.border}]}>
              <View style={[styles.roomDot,{backgroundColor:rt.color}]}/>
              <Text style={[styles.roomRowLabel,{color:colors.foreground}]}>{rt.label}</Text>
              <View style={styles.counter}>
                <ScalePress onPress={()=>setCount(rt.type,-1)} style={[styles.counterBtn,{backgroundColor:colors.mutedBg}]} scale={0.85}><Feather name="minus" size={13} color={colors.foreground}/></ScalePress>
                <Text style={[styles.counterVal,{color:colors.foreground}]}>{count}</Text>
                <ScalePress onPress={()=>setCount(rt.type,1)} style={[styles.counterBtn,{backgroundColor:colors.mutedBg}]} scale={0.85}><Feather name="plus" size={13} color={colors.foreground}/></ScalePress>
              </View>
            </View>
          );})}
        </View>
        <ScalePress onPress={handleGenerate} scale={0.97}>
          <LinearGradient colors={[colors.primary,colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.generateBtn}>
            <Feather name="cpu" size={18} color="#fff"/>
            <Text style={styles.generateBtnText}>Generate Layouts</Text>
          </LinearGradient>
        </ScalePress>
        {generated&&(
          <Animated.View style={{opacity:fadeAnim,gap:12}}>
            <Text style={[styles.resultsTitle,{color:colors.foreground}]}>{layouts.length} layouts generated</Text>
            {layouts.map(layout=>(
              <View key={layout.id} style={[styles.layoutCard,{backgroundColor:colors.card,borderColor:colors.border}]}>
                <Text style={[styles.layoutName,{color:colors.foreground}]}>{layout.name}</Text>
                <Text style={[styles.layoutDesc,{color:colors.mutedForeground}]}>{layout.description}</Text>
                <View style={styles.layoutBadges}>
                  <View style={[styles.badge,{backgroundColor:colors.primaryMuted}]}><Text style={[styles.badgeText,{color:colors.primary}]}>Vastu {layout.vastuScore}</Text></View>
                  <View style={[styles.badge,{backgroundColor:colors.mutedBg}]}><Text style={[styles.badgeText,{color:colors.mutedForeground}]}>{layout.efficiency}% used</Text></View>
                </View>
                <MiniPlan layout={layout}/>
                <ScalePress onPress={()=>handleLoad(layout)} scale={0.97}>
                  <LinearGradient colors={[colors.primary,colors.primaryDark]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.loadBtn}>
                    <Feather name="arrow-right" size={15} color="#fff"/>
                    <Text style={styles.loadBtnText}>Load into Designer</Text>
                  </LinearGradient>
                </ScalePress>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1},header:{overflow:"hidden"},headerInner:{paddingHorizontal:20,paddingBottom:14},headerTitle:{fontSize:28,fontWeight:"800",letterSpacing:-0.6},headerSub:{fontSize:13,marginTop:2},content:{padding:16,gap:14},
  card:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:12},cardTitle:{fontSize:16,fontWeight:"800",letterSpacing:-0.3},cardSub:{fontSize:12,marginTop:-8},
  plotRow:{flexDirection:"row",alignItems:"flex-end",gap:12},plotInput:{flex:1,gap:6},plotLabel:{fontSize:12,fontWeight:"600"},plotField:{borderWidth:1.5,borderRadius:12,paddingHorizontal:14,paddingVertical:11,fontSize:18,fontWeight:"800",textAlign:"center"},plotX:{fontSize:20,fontWeight:"800",paddingBottom:10},
  roomRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth},roomDot:{width:8,height:8,borderRadius:4},roomRowLabel:{flex:1,fontSize:14,fontWeight:"600"},counter:{flexDirection:"row",alignItems:"center",gap:8},counterBtn:{width:32,height:32,borderRadius:10,alignItems:"center",justifyContent:"center"},counterVal:{width:24,textAlign:"center",fontSize:16,fontWeight:"800"},
  generateBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:16,borderRadius:16,shadowColor:"#8B5E3C",shadowOffset:{width:0,height:6},shadowOpacity:0.28,shadowRadius:16,elevation:6},generateBtnText:{color:"#fff",fontSize:16,fontWeight:"800"},
  resultsTitle:{fontSize:17,fontWeight:"800",letterSpacing:-0.3},
  layoutCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:10},layoutName:{fontSize:16,fontWeight:"800",letterSpacing:-0.3},layoutDesc:{fontSize:12,lineHeight:18},layoutBadges:{flexDirection:"row",gap:8},badge:{paddingHorizontal:10,paddingVertical:4,borderRadius:8},badgeText:{fontSize:12,fontWeight:"700"},
  miniPlan:{borderRadius:10,borderWidth:StyleSheet.hairlineWidth,overflow:"hidden",position:"relative"},miniRoom:{position:"absolute",borderWidth:1,borderRadius:2},
  loadBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:13,borderRadius:14},loadBtnText:{color:"#fff",fontSize:14,fontWeight:"700"},
});
