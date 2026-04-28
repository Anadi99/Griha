/**
 * FloatingAI — Global AI assistant FAB
 * Appears on every screen, opens a full-screen chat overlay
 * Powered by Gemini via ai-service.ts
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, Animated, Platform,
  TextInput, ScrollView, KeyboardAvoidingView,
  TouchableOpacity, ActivityIndicator, useColorScheme,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useDesignerStore } from "@/lib/store";
import { analyzeVastu } from "@/lib/vastu-engine";
import { chatWithVastuAI, ChatMessage } from "@/lib/ai-service";
import { ScalePress } from "@/components/ScalePress";

const SKY = "#38BDF8";
const INDIGO = "#818CF8";

const QUICK_PROMPTS = [
  "Analyze my floor plan",
  "Best room placement tips",
  "How to improve Vastu score?",
  "Suggest a layout for 3BHK",
  "What is Vastu Shastra?",
];

function Bubble({ msg, isDark }: { msg: ChatMessage; isDark: boolean }) {
  const isUser = msg.role === "user";
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 140, friction: 10, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[
      styles.bubbleRow,
      isUser ? styles.bubbleRowUser : styles.bubbleRowAI,
      { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
    ]}>
      {!isUser && (
        <LinearGradient colors={[INDIGO, SKY]} style={styles.aiAvatar}>
          <Feather name="cpu" size={11} color="#fff" />
        </LinearGradient>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? { backgroundColor: SKY }
          : isDark
          ? { backgroundColor: "rgba(15,23,42,0.8)", borderColor: "rgba(255,255,255,0.08)", borderWidth: 1 }
          : { backgroundColor: "#F1F5F9" },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? "#00354A" : isDark ? "#FFFFFF" : "#0F172A" }]}>
          {msg.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function FloatingAI() {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const store = useDesignerStore();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: "Hi! I'm Griha AI. Ask me anything about Vastu, floor plans, or home design." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // FAB animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabGlow = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse glow on FAB
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(fabGlow, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(fabGlow, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const openChat = () => {
    setOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(modalAnim, { toValue: 1, tension: 100, friction: 12, useNativeDriver: true }).start();
  };

  const closeChat = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setOpen(false));
    Haptics.selectionAsync();
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const vastuScore = store.currentPlan ? analyzeVastu(store.currentPlan).score : 0;
      const reply = await chatWithVastuAI(messages, { plan: store.currentPlan, vastuScore }, text.trim());
      setMessages([...newMessages, { role: "model", text: reply }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages([...newMessages, {
        role: "model",
        text: "I couldn't connect right now. Make sure your Gemini API key is set in .env",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const fabBottom = insets.bottom + (Platform.OS === "ios" ? 100 : 80);

  return (
    <>
      {/* ── Floating Action Button ── */}
      {!open && (
        <Animated.View style={[
          styles.fabWrap,
          { bottom: fabBottom },
          {
            shadowOpacity: fabGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
            shadowRadius: fabGlow.interpolate({ inputRange: [0, 1], outputRange: [12, 24] }),
          },
        ]}>
          <ScalePress onPress={openChat} scale={0.9}>
            <LinearGradient colors={[SKY, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
              <Feather name="cpu" size={22} color="#fff" />
            </LinearGradient>
          </ScalePress>
        </Animated.View>
      )}

      {/* ── Chat Modal ── */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeChat}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            opacity: modalAnim,
            transform: [{ translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}>
          {/* Backdrop */}
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeChat} />

          {/* Chat sheet */}
          <KeyboardAvoidingView
            behavior={isIOS ? "padding" : undefined}
            style={[styles.sheet, { paddingBottom: insets.bottom }]}
          >
            {isIOS ? (
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,14,29,0.97)" }]} />
            )}
            <View style={[StyleSheet.absoluteFill, styles.sheetBorder]} pointerEvents="none" />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTitleRow}>
                <LinearGradient colors={[INDIGO, SKY]} style={styles.sheetAvatar}>
                  <Feather name="cpu" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={styles.sheetTitle}>Griha AI</Text>
                  <Text style={styles.sheetSub}>Vastu & Design Assistant</Text>
                </View>
                <ScalePress onPress={closeChat} style={styles.closeBtn} scale={0.9}>
                  <Feather name="x" size={18} color="rgba(255,255,255,0.5)" />
                </ScalePress>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg, i) => <Bubble key={i} msg={msg} isDark={true} />)}
              {loading && (
                <View style={styles.loadingRow}>
                  <LinearGradient colors={[INDIGO, SKY]} style={styles.aiAvatar}>
                    <Feather name="cpu" size={11} color="#fff" />
                  </LinearGradient>
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color={SKY} />
                    <Text style={styles.loadingText}>Thinking…</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prompts}>
                {QUICK_PROMPTS.map((p) => (
                  <ScalePress key={p} onPress={() => send(p)} scale={0.95}
                    style={styles.promptChip}>
                    <Text style={styles.promptText}>{p}</Text>
                  </ScalePress>
                ))}
              </ScrollView>
            )}

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything about your home…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
                multiline
                maxLength={500}
                onSubmitEditing={() => send(input)}
              />
              <ScalePress
                onPress={() => send(input)}
                disabled={!input.trim() || loading}
                scale={0.9}
              >
                <LinearGradient
                  colors={input.trim() && !loading ? [SKY, INDIGO] : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.08)"]}
                  style={styles.sendBtn}
                >
                  <Feather name="send" size={16} color={input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.25)"} />
                </LinearGradient>
              </ScalePress>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute", right: 20, zIndex: 999,
    shadowColor: SKY, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },

  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: "75%", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: "hidden",
  },
  sheetBorder: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },

  sheetHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 14,
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  sheetSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  closeBtn: { marginLeft: "auto", padding: 4 },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10, paddingBottom: 8 },

  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "88%" },
  bubbleRowUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubbleRowAI: { alignSelf: "flex-start" },
  aiAvatar: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bubble: { borderRadius: 18, padding: 12, flexShrink: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  loadingBubble: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(15,23,42,0.8)", borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  loadingText: { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  prompts: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 0 },
  promptChip: {
    backgroundColor: "rgba(56,189,248,0.10)", borderWidth: 1,
    borderColor: "rgba(56,189,248,0.25)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  promptText: { fontSize: 12, fontWeight: "600", color: SKY },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: "#FFFFFF", maxHeight: 100,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
