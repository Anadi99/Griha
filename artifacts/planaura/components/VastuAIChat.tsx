/**
 * VastuAIChat — Gemini-powered Vastu assistant
 * Embedded in the Designer panel as a chat tab
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Animated, Platform, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { analyzeVastu } from "@/lib/vastu-engine";
import { ScalePress } from "@/components/ScalePress";
import { chatWithVastuAI, ChatMessage } from "@/lib/ai-service";

const SUGGESTIONS = [
  "Why is my Vastu score low?",
  "Where should I place the kitchen?",
  "Best direction for master bedroom?",
  "How to improve energy flow?",
  "What's wrong with my layout?",
];

function MessageBubble({ msg, colors }: { msg: ChatMessage; colors: any }) {
  const isUser = msg.role === "user";
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.bubbleWrap,
      isUser ? styles.bubbleWrapUser : styles.bubbleWrapAI,
      { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
    ]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.primaryMuted }]}>
          <Feather name="cpu" size={12} color={colors.primary} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.foreground }]}>
          {msg.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function VastuAIChat() {
  const colors = useColors();
  const store = useDesignerStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Hi! I'm Griha AI, your Vastu consultant. Ask me anything about your floor plan, room placement, or energy optimization.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const vastuScore = store.currentPlan ? analyzeVastu(store.currentPlan).score : 0;

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", text: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const reply = await chatWithVastuAI(
        messages,
        { plan: store.currentPlan, vastuScore },
        text.trim()
      );
      setMessages([...newMessages, { role: "model", text: reply }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const errMsg = e?.message?.includes("GEMINI_KEY")
        ? "API key not set. Add EXPO_PUBLIC_GEMINI_KEY to your .env file."
        : "Couldn't reach Griha AI. Check your internet connection.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={120}
    >
      <View style={[styles.root, { backgroundColor: colors.card }]}>
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} colors={colors} />
          ))}

          {loading && (
            <View style={styles.loadingRow}>
              <View style={[styles.aiAvatar, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="cpu" size={12} color={colors.primary} />
              </View>
              <View style={[styles.loadingBubble, { backgroundColor: colors.mutedBg }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Thinking…</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={[styles.errorCard, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggestions — show only at start */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <ScalePress key={s} onPress={() => send(s)} scale={0.95}
                style={[styles.suggestion, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "25" }]}>
                <Text style={[styles.suggestionText, { color: colors.primary }]}>{s}</Text>
              </ScalePress>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your floor plan…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.mutedBg }]}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <ScalePress
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.mutedBg }]}
            scale={0.9}
          >
            <Feather name="send" size={16} color={input.trim() && !loading ? "#fff" : colors.muted} />
          </ScalePress>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 12, gap: 10, paddingBottom: 8 },

  bubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: 6, maxWidth: "90%" },
  bubbleWrapUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubbleWrapAI: { alignSelf: "flex-start" },

  aiAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bubble: { borderRadius: 16, padding: 12, maxWidth: "100%", flexShrink: 1 },
  bubbleText: { fontSize: 13, lineHeight: 19 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  loadingBubble: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, padding: 12 },
  loadingText: { fontSize: 13 },

  errorCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },

  suggestions: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  suggestionText: { fontSize: 12, fontWeight: "600" },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
});
