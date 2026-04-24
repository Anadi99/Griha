import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Animated, Image, Alert, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";
import { analyzeRoomScan, getQuestions, RoomType, Direction, RoomScanInput, RoomScanResult } from "@/lib/room-scan-engine";

const ROOM_TYPES: Array<{ type: RoomType; label: string; icon: string; color: string }> = [
  { type: "bedroom", label: "Bedroom", icon: "moon", color: "#E02020" },
  { type: "living_room", label: "Living Room", icon: "tv", color: "#7C3AED" },
  { type: "kitchen", label: "Kitchen", icon: "coffee", color: "#EA580C" },
  { type: "bathroom", label: "Bathroom", icon: "droplet", color: "#0284C7" },
  { type: "office", label: "Office", icon: "briefcase", color: "#059669" },
  { type: "dining_room", label: "Dining Room", icon: "users", color: "#DB2777" },
];
const DIRECTIONS: Direction[] = ["N","NE","E","SE","S","SW","W","NW"];
const DIR_LABELS: Record<Direction, string> = { N:"North",NE:"North-East",E:"East",SE:"South-East",S:"South",SW:"South-West",W:"West",NW:"North-West" };
type Step = "photo"|"roomtype"|"questions"|"result";

function StepDots({ current, color }: { current: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.stepDots}>
      {[0,1,2,3].map((i) => (
        <View key={i} style={[styles.stepDot, { backgroundColor: i <= current ? color : colors.border }, i === current && { width: 24 }]} />
      ))}
    </View>
  );
}

function DirectionPicker({ value, onChange }: { value: Direction|null; onChange: (d: Direction) => void }) {
  const colors = useColors();
  return (
    <View style={styles.dirGrid}>
      {DIRECTIONS.map((d) => {
        const isActive = value === d;
        return (
          <ScalePress key={d} onPress={() => { onChange(d); Haptics.selectionAsync(); }}
            style={[styles.dirBtn, { backgroundColor: isActive ? colors.primary : colors.mutedBg, borderColor: isActive ? colors.primary : colors.border }]} scale={0.92}>
            <Text style={[styles.dirCode, { color: isActive ? "#fff" : colors.foreground }]}>{d}</Text>
            <Text style={[styles.dirLabel, { color: isActive ? "#ffffffBB" : colors.mutedForeground }]}>{DIR_LABELS[d]}</Text>
          </ScalePress>
        );
      })}
    </View>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1000);
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * score));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return (
    <View style={[styles.scoreRing, { borderColor: color + "50", backgroundColor: color + "10" }]}>
      <Text style={[styles.scoreNum, { color }]}>{display}</Text>
      <Text style={[styles.scoreDenom, { color: color + "80" }]}>/100</Text>
    </View>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [step, setStep] = useState<Step>("photo");
  const [photoUri, setPhotoUri] = useState<string|null>(null);
  const [roomType, setRoomType] = useState<RoomType|null>(null);
  const [answers, setAnswers] = useState<Record<string,any>>({});
  const [result, setResult] = useState<RoomScanResult|null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const stepIndex = ["photo","roomtype","questions","result"].indexOf(step);

  const transition = (next: Step) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setStep(next); slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Camera access is required."); return; }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [4,3] });
    if (!res.canceled && res.assets[0]) { setPhotoUri(res.assets[0].uri); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); transition("roomtype"); }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Photo library access is required."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [4,3] });
    if (!res.canceled && res.assets[0]) { setPhotoUri(res.assets[0].uri); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); transition("roomtype"); }
  };

  const handleAnalyze = () => {
    if (!roomType) return;
    const qs = getQuestions(roomType);
    const missing = qs.filter(q => q.required && !answers[q.id]);
    if (missing.length > 0) { Alert.alert("Almost there", `Please answer: "${missing[0].label}"`); return; }
    const input: RoomScanInput = { roomType, facingDirection: answers.facingDirection, windowDirection: answers.windowDirection, hasAttachedBath: answers.hasAttachedBath === "true", cookingDirection: answers.cookingDirection ?? null, workDeskDirection: answers.workDeskDirection ?? null, bedHeadDirection: answers.bedHeadDirection ?? null, clutter: answers.clutter, naturalLight: answers.naturalLight, ventilation: answers.ventilation };
    setResult(analyzeRoomScan(input));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    transition("result");
  };

  const handleReset = () => { setPhotoUri(null); setRoomType(null); setAnswers({}); setResult(null); transition("photo"); };
  const setAnswer = (id: string, val: any) => { setAnswers(p => ({ ...p, [id]: val })); Haptics.selectionAsync(); };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }, isIOS ? {} : { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {isIOS && <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />}
        <View style={styles.headerInner}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Room Scan</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Photo-based Vastu analysis</Text>
          </View>
          {step !== "photo" && (
            <ScalePress onPress={handleReset} style={[styles.resetBtn, { backgroundColor: colors.mutedBg }]} scale={0.94}>
              <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              <Text style={[styles.resetBtnText, { color: colors.mutedForeground }]}>Reset</Text>
            </ScalePress>
          )}
        </View>
        <StepDots current={stepIndex} color={colors.primary} />
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>

          {step === "photo" && (
            <>
              <View style={[styles.heroCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "25" }]}>
                <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}><Feather name="camera" size={28} color="#fff" /></View>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>Scan Your Room</Text>
                <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>Take a photo or upload one, then answer a few questions to get your personalized Vastu analysis.</Text>
              </View>
              <ScalePress onPress={handleCamera} scale={0.97}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoBtn}>
                  <Feather name="camera" size={20} color="#fff" />
                  <Text style={styles.photoBtnText}>Take Photo</Text>
                </LinearGradient>
              </ScalePress>
              <ScalePress onPress={handleGallery} style={[styles.galleryBtn, { backgroundColor: colors.card, borderColor: colors.border }]} scale={0.97}>
                <Feather name="image" size={20} color={colors.primary} />
                <Text style={[styles.galleryBtnText, { color: colors.primary }]}>Upload from Gallery</Text>
              </ScalePress>
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[{ icon: "lock", text: "Photo stays on your device — never uploaded" }, { icon: "compass", text: "Answer questions about direction and conditions" }, { icon: "zap", text: "Get instant Vastu score + specific corrections" }].map((item, i) => (
                  <View key={i} style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: colors.primaryMuted }]}><Feather name={item.icon as any} size={13} color={colors.primary} /></View>
                    <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {step === "roomtype" && (
            <>
              {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />}
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Which room is this?</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Select the room type for accurate Vastu analysis</Text>
              <View style={styles.roomGrid}>
                {ROOM_TYPES.map((rt) => {
                  const isActive = roomType === rt.type;
                  return (
                    <ScalePress key={rt.type} onPress={() => { setRoomType(rt.type); Haptics.selectionAsync(); }}
                      style={[styles.roomTypeBtn, { backgroundColor: isActive ? rt.color + "18" : colors.card, borderColor: isActive ? rt.color : colors.border }]} scale={0.95}>
                      <View style={[styles.roomTypeIcon, { backgroundColor: rt.color + "18" }]}><Feather name={rt.icon as any} size={20} color={rt.color} /></View>
                      <Text style={[styles.roomTypeLabel, { color: isActive ? rt.color : colors.foreground }]}>{rt.label}</Text>
                    </ScalePress>
                  );
                })}
              </View>
              <ScalePress onPress={() => { if (roomType) transition("questions"); else Alert.alert("Select a room type first"); }} scale={0.97} style={{ opacity: roomType ? 1 : 0.5 }}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>Continue</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </LinearGradient>
              </ScalePress>
            </>
          )}

          {step === "questions" && roomType && (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>Room Details</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Answer these for a precise Vastu reading</Text>
              {getQuestions(roomType).map((q, qi) => (
                <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionNum, { backgroundColor: colors.primaryMuted }]}><Text style={[styles.questionNumText, { color: colors.primary }]}>{qi + 1}</Text></View>
                    <Text style={[styles.questionLabel, { color: colors.foreground }]}>{q.label}</Text>
                  </View>
                  {q.type === "direction" && <DirectionPicker value={answers[q.id] ?? null} onChange={(d) => setAnswer(q.id, d)} />}
                  {q.type === "options" && (
                    <View style={styles.optionsRow}>
                      {q.options!.map((opt) => {
                        const isActive = answers[q.id] === opt.value;
                        return (
                          <ScalePress key={opt.value} onPress={() => setAnswer(q.id, opt.value)}
                            style={[styles.optionBtn, { backgroundColor: isActive ? colors.primary : colors.mutedBg, borderColor: isActive ? colors.primary : colors.border }]} scale={0.94}>
                            <Text style={[styles.optionBtnText, { color: isActive ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                          </ScalePress>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
              <ScalePress onPress={handleAnalyze} scale={0.97}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextBtn}>
                  <Feather name="zap" size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Analyze Room</Text>
                </LinearGradient>
              </ScalePress>
            </>
          )}

          {step === "result" && result && roomType && (
            <>
              <View style={[styles.resultCard, { backgroundColor: result.statusColor + "0C", borderColor: result.statusColor + "30" }]}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.resultPhoto} resizeMode="cover" />}
                <ScoreRing score={result.score} color={result.statusColor} />
                <Text style={[styles.resultStatus, { color: result.statusColor }]}>{result.status}</Text>
                <Text style={[styles.resultRoomLabel, { color: colors.mutedForeground }]}>{ROOM_TYPES.find(r => r.type === roomType)?.label} Vastu Score</Text>
                <Text style={[styles.resultSummary, { color: colors.foreground }]}>{result.summary}</Text>
                <View style={styles.resultStats}>
                  {[{ n: result.positives.length, l: "Good", c: "#16A34A" }, { n: result.issues.length, l: "Issues", c: "#DC2626" }, { n: result.corrections.length, l: "Fixes", c: "#D97706" }].map((s) => (
                    <View key={s.l} style={[styles.resultStat, { backgroundColor: s.c + "18" }]}>
                      <Text style={[styles.resultStatNum, { color: s.c }]}>{s.n}</Text>
                      <Text style={[styles.resultStatLabel, { color: s.c }]}>{s.l}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {result.corrections.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHead}><View style={[styles.sectionDot, { backgroundColor: "#D97706" }]} /><Text style={[styles.sectionTitle, { color: colors.foreground }]}>What to Fix</Text></View>
                  {result.corrections.sort((a, b) => a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0).map((c) => (
                    <View key={c.id} style={[styles.corrCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: c.priority === "high" ? "#DC2626" : c.priority === "medium" ? "#D97706" : colors.border }]}>
                      <View style={[styles.corrIcon, { backgroundColor: c.priority === "high" ? "#DC262618" : "#D9770618" }]}><Feather name={c.icon as any} size={14} color={c.priority === "high" ? "#DC2626" : "#D97706"} /></View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.corrAction, { color: colors.foreground }]}>{c.action}</Text>
                        <Text style={[styles.corrReason, { color: colors.mutedForeground }]}>{c.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {result.issues.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHead}><View style={[styles.sectionDot, { backgroundColor: "#DC2626" }]} /><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Issues Found</Text></View>
                  {result.issues.map((issue) => (
                    <View key={issue.id} style={[styles.issueCard, { backgroundColor: "#DC262608", borderColor: "#DC262620" }]}>
                      <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}><Text style={[styles.issueTitle, { color: colors.foreground }]}>{issue.title}</Text><Text style={[styles.issueDetail, { color: colors.mutedForeground }]}>{issue.detail}</Text></View>
                    </View>
                  ))}
                </View>
              )}

              {result.positives.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHead}><View style={[styles.sectionDot, { backgroundColor: "#16A34A" }]} /><Text style={[styles.sectionTitle, { color: colors.foreground }]}>What's Working</Text></View>
                  {result.positives.map((pos) => (
                    <View key={pos.id} style={[styles.posCard, { backgroundColor: "#16A34A08", borderColor: "#16A34A20" }]}>
                      <Feather name="check-circle" size={14} color="#16A34A" style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}><Text style={[styles.posTitle, { color: colors.foreground }]}>{pos.title}</Text><Text style={[styles.posDetail, { color: colors.mutedForeground }]}>{pos.detail}</Text></View>
                    </View>
                  ))}
                </View>
              )}

              <ScalePress onPress={handleReset} style={[styles.resetFullBtn, { backgroundColor: colors.card, borderColor: colors.border }]} scale={0.97}>
                <Feather name="refresh-cw" size={15} color={colors.primary} />
                <Text style={[styles.resetFullBtnText, { color: colors.primary }]}>Scan Another Room</Text>
              </ScalePress>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1},header:{overflow:"hidden"},headerInner:{paddingHorizontal:20,paddingBottom:8,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between"},headerTitle:{fontSize:28,fontWeight:"800",letterSpacing:-0.6},headerSub:{fontSize:13,marginTop:2},resetBtn:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:12},resetBtnText:{fontSize:13,fontWeight:"600"},stepDots:{flexDirection:"row",gap:6,paddingHorizontal:20,paddingBottom:12,paddingTop:4},stepDot:{height:4,width:16,borderRadius:2},content:{padding:16,gap:14},
  heroCard:{borderRadius:20,borderWidth:1,padding:24,alignItems:"center",gap:12},heroIcon:{width:64,height:64,borderRadius:20,alignItems:"center",justifyContent:"center",shadowColor:"#E02020",shadowOffset:{width:0,height:6},shadowOpacity:0.3,shadowRadius:12,elevation:6},heroTitle:{fontSize:22,fontWeight:"800",letterSpacing:-0.4},heroDesc:{fontSize:14,textAlign:"center",lineHeight:21},
  photoBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:16,borderRadius:16,shadowColor:"#E02020",shadowOffset:{width:0,height:6},shadowOpacity:0.28,shadowRadius:16,elevation:6},photoBtnText:{color:"#fff",fontSize:16,fontWeight:"800"},galleryBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:14,borderRadius:16,borderWidth:1.5},galleryBtnText:{fontSize:15,fontWeight:"700"},
  infoCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:12},infoRow:{flexDirection:"row",alignItems:"flex-start",gap:10},infoIconWrap:{width:28,height:28,borderRadius:8,alignItems:"center",justifyContent:"center",marginTop:1},infoText:{flex:1,fontSize:13,lineHeight:19},
  photoPreview:{width:"100%",height:180,borderRadius:16},stepTitle:{fontSize:22,fontWeight:"800",letterSpacing:-0.4},stepSub:{fontSize:14,lineHeight:20,marginTop:-8},
  roomGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},roomTypeBtn:{width:"47%",flexGrow:1,borderRadius:16,borderWidth:1.5,padding:16,alignItems:"center",gap:8},roomTypeIcon:{width:44,height:44,borderRadius:13,alignItems:"center",justifyContent:"center"},roomTypeLabel:{fontSize:13,fontWeight:"700",textAlign:"center"},
  nextBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:16,borderRadius:16,shadowColor:"#E02020",shadowOffset:{width:0,height:6},shadowOpacity:0.28,shadowRadius:16,elevation:6},nextBtnText:{color:"#fff",fontSize:16,fontWeight:"800"},
  questionCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:14},questionHeader:{flexDirection:"row",alignItems:"flex-start",gap:10},questionNum:{width:26,height:26,borderRadius:8,alignItems:"center",justifyContent:"center",marginTop:1},questionNumText:{fontSize:12,fontWeight:"800"},questionLabel:{flex:1,fontSize:14,fontWeight:"600",lineHeight:20},
  dirGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},dirBtn:{paddingHorizontal:10,paddingVertical:8,borderRadius:10,borderWidth:1.5,alignItems:"center",minWidth:72},dirCode:{fontSize:13,fontWeight:"800"},dirLabel:{fontSize:9,fontWeight:"500",marginTop:1},
  optionsRow:{flexDirection:"row",flexWrap:"wrap",gap:8},optionBtn:{paddingHorizontal:14,paddingVertical:10,borderRadius:12,borderWidth:1.5},optionBtnText:{fontSize:13,fontWeight:"600"},
  resultCard:{borderRadius:20,borderWidth:1,padding:20,alignItems:"center",gap:8},resultPhoto:{width:"100%",height:140,borderRadius:12,marginBottom:4},scoreRing:{width:120,height:120,borderRadius:60,borderWidth:6,alignItems:"center",justifyContent:"center",marginVertical:4},scoreNum:{fontSize:40,fontWeight:"900",letterSpacing:-2},scoreDenom:{fontSize:13,fontWeight:"600",marginTop:-4},resultStatus:{fontSize:22,fontWeight:"800",letterSpacing:-0.4},resultRoomLabel:{fontSize:13},resultSummary:{fontSize:14,textAlign:"center",lineHeight:21,paddingHorizontal:8},resultStats:{flexDirection:"row",gap:10,marginTop:4},resultStat:{flex:1,alignItems:"center",paddingVertical:10,borderRadius:12,gap:2},resultStatNum:{fontSize:22,fontWeight:"800"},resultStatLabel:{fontSize:10,fontWeight:"700"},
  section:{gap:8},sectionHead:{flexDirection:"row",alignItems:"center",gap:8},sectionDot:{width:8,height:8,borderRadius:4},sectionTitle:{fontSize:16,fontWeight:"800",letterSpacing:-0.3},
  corrCard:{flexDirection:"row",alignItems:"flex-start",gap:12,padding:14,borderRadius:16,borderWidth:StyleSheet.hairlineWidth,borderLeftWidth:3},corrIcon:{width:32,height:32,borderRadius:10,alignItems:"center",justifyContent:"center",marginTop:1},corrAction:{fontSize:14,fontWeight:"700",lineHeight:20},corrReason:{fontSize:12,lineHeight:18},
  issueCard:{flexDirection:"row",alignItems:"flex-start",gap:10,padding:14,borderRadius:16,borderWidth:1},issueTitle:{fontSize:14,fontWeight:"700",marginBottom:3},issueDetail:{fontSize:12,lineHeight:18},
  posCard:{flexDirection:"row",alignItems:"flex-start",gap:10,padding:14,borderRadius:16,borderWidth:1},posTitle:{fontSize:14,fontWeight:"700",marginBottom:3},posDetail:{fontSize:12,lineHeight:18},
  resetFullBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:14,borderRadius:16,borderWidth:1.5},resetFullBtnText:{fontSize:15,fontWeight:"700"},
});
