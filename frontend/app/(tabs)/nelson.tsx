import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch } from '../../utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: string;
}

interface CrisisTool {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const CRISIS_TOOLS: CrisisTool[] = [
  { id: 'breathing', name: 'Respiración', icon: 'leaf', description: 'Ejercicio de respiración 4-7-8' },
  { id: 'grounding', name: 'Grounding', icon: 'earth', description: 'Técnica 5-4-3-2-1' },
  { id: 'timer', name: 'Espera', icon: 'timer', description: 'Timer de 10 minutos' },
  { id: 'contacts', name: 'Contactos', icon: 'call', description: 'Contactos de emergencia' },
];

const QUICK_PROMPTS = [
  { id: 'anxiety', text: 'Tengo ansiedad', icon: 'pulse' },
  { id: 'craving', text: 'Tengo ganas de consumir', icon: 'flame' },
  { id: 'sad', text: 'Me siento triste', icon: 'sad' },
  { id: 'talk', text: 'Solo quiero hablar', icon: 'chatbubbles' },
];

export default function NelsonChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [showGroundingModal, setShowGroundingModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const breathAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadConversation();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversation = async () => {
    try {
      const response = await authenticatedFetch('/api/nelson/conversation');
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } else {
          // Add welcome message
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy Nelson, tu compañero de apoyo en este camino de recuperación. 🤝\n\nEstoy aquí para escucharte las 24 horas, sin juzgarte. Puedes contarme cómo te sientes, pedirme técnicas para momentos difíciles, o simplemente conversar.\n\n⚠️ Recuerda: Soy un apoyo complementario, no reemplazo a un profesional de salud mental.\n\n¿Cómo te sientes hoy?',
            timestamp: new Date(),
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Add welcome message on error
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy Nelson, tu compañero de apoyo. 🤝\n\n¿Cómo te sientes hoy?',
        timestamp: new Date(),
      }]);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('/api/nelson/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          mode: data.mode,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Check if crisis mode was triggered
        if (data.crisis_detected) {
          Vibration.vibrate([0, 200, 100, 200]);
          setShowCrisisModal(true);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, tuve un problema para responder. ¿Puedes intentar de nuevo? Si es una emergencia, usa el botón rojo de Crisis.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startBreathingExercise = () => {
    setShowBreathingModal(true);
    setBreathCount(0);
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    // Inhale for 4 seconds
    setBreathPhase('inhale');
    Animated.timing(breathAnimation, {
      toValue: 1.5,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
      // Hold for 7 seconds
      setBreathPhase('hold');
      setTimeout(() => {
        // Exhale for 8 seconds
        setBreathPhase('exhale');
        Animated.timing(breathAnimation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }).start(() => {
          setBreathCount(prev => {
            const newCount = prev + 1;
            if (newCount < 4) {
              runBreathingCycle();
            }
            return newCount;
          });
        });
      }, 7000);
    });
  };

  const startGroundingExercise = () => {
    setShowGroundingModal(true);
  };

  const startTimer = () => {
    setTimerSeconds(600);
    setShowTimerModal(true);
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          Vibration.vibrate([0, 500, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCrisisTool = (toolId: string) => {
    setShowCrisisModal(false);
    switch (toolId) {
      case 'breathing':
        startBreathingExercise();
        break;
      case 'grounding':
        startGroundingExercise();
        break;
      case 'timer':
        startTimer();
        break;
      case 'contacts':
        // Navigate to emergency contacts or show them
        sendMessage('Necesito ver mis contactos de emergencia');
        break;
    }
  };

  const clearConversation = async () => {
    try {
      await authenticatedFetch('/api/nelson/conversation', {
        method: 'DELETE',
      });
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola de nuevo! Soy Nelson. 🤝\n\n¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>🧠</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Nelson</Text>
            <Text style={styles.headerSubtitle}>Tu apoyo 24/7</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={clearConversation}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#E0E7FF" />
          <Text style={styles.disclaimerText}>
            Apoyo complementario. No reemplaza atención profesional.
          </Text>
        </View>
      </LinearGradient>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.assistantAvatar}>
                <Text style={styles.assistantAvatarText}>🧠</Text>
              </View>
            )}
            <View style={[
              styles.messageContent,
              message.role === 'user' ? styles.userContent : styles.assistantContent,
            ]}>
              <Text style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.assistantText,
              ]}>
                {message.content}
              </Text>
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.assistantAvatar}>
              <Text style={styles.assistantAvatarText}>🧠</Text>
            </View>
            <View style={[styles.messageContent, styles.assistantContent]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.typingText}>Nelson está escribiendo...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickPromptsContainer}
        contentContainerStyle={styles.quickPromptsContent}
      >
        {QUICK_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt.id}
            style={styles.quickPrompt}
            onPress={() => sendMessage(prompt.text)}
          >
            <Ionicons name={prompt.icon as any} size={16} color="#7C3AED" />
            <Text style={styles.quickPromptText}>{prompt.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.crisisButton}
            onPress={() => setShowCrisisModal(true)}
          >
            <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu mensaje..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Crisis Modal */}
      <Modal
        visible={showCrisisModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCrisisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.crisisModalContent}>
            <View style={styles.crisisModalHeader}>
              <Ionicons name="heart" size={40} color="#EF4444" />
              <Text style={styles.crisisModalTitle}>Herramientas de Crisis</Text>
              <Text style={styles.crisisModalSubtitle}>
                Estoy aquí para ayudarte. Elige una herramienta:
              </Text>
            </View>
            
            <View style={styles.crisisToolsGrid}>
              {CRISIS_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.crisisTool}
                  onPress={() => handleCrisisTool(tool.id)}
                >
                  <View style={styles.crisisToolIcon}>
                    <Ionicons name={tool.icon as any} size={28} color="#7C3AED" />
                  </View>
                  <Text style={styles.crisisToolName}>{tool.name}</Text>
                  <Text style={styles.crisisToolDesc}>{tool.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCrisisModal(false)}
            >
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Breathing Modal */}
      <Modal
        visible={showBreathingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBreathingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.breathingModalContent}>
            <Text style={styles.breathingTitle}>Respiración 4-7-8</Text>
            <Text style={styles.breathingSubtitle}>Ciclo {breathCount + 1} de 4</Text>
            
            <Animated.View style={[
              styles.breathingCircle,
              { transform: [{ scale: breathAnimation }] }
            ]}>
              <Text style={styles.breathingPhase}>
                {breathPhase === 'inhale' ? 'INHALA' : 
                 breathPhase === 'hold' ? 'MANTÉN' : 'EXHALA'}
              </Text>
              <Text style={styles.breathingTime}>
                {breathPhase === 'inhale' ? '4s' : 
                 breathPhase === 'hold' ? '7s' : '8s'}
              </Text>
            </Animated.View>
            
            <TouchableOpacity
              style={styles.closeBreathingButton}
              onPress={() => setShowBreathingModal(false)}
            >
              <Text style={styles.closeModalText}>Terminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grounding Modal */}
      <Modal
        visible={showGroundingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGroundingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.groundingModalContent}>
            <Text style={styles.groundingTitle}>Técnica 5-4-3-2-1</Text>
            <Text style={styles.groundingSubtitle}>Conecta con el presente</Text>
            
            <ScrollView style={styles.groundingList}>
              <View style={styles.groundingItem}>
                <View style={[styles.groundingNumber, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.groundingNumberText}>5</Text>
                </View>
                <Text style={styles.groundingText}>cosas que puedes VER</Text>
              </View>
              <View style={styles.groundingItem}>
                <View style={[styles.groundingNumber, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.groundingNumberText}>4</Text>
                </View>
                <Text style={styles.groundingText}>cosas que puedes TOCAR</Text>
              </View>
              <View style={styles.groundingItem}>
                <View style={[styles.groundingNumber, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.groundingNumberText}>3</Text>
                </View>
                <Text style={styles.groundingText}>cosas que puedes OÍR</Text>
              </View>
              <View style={styles.groundingItem}>
                <View style={[styles.groundingNumber, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.groundingNumberText}>2</Text>
                </View>
                <Text style={styles.groundingText}>cosas que puedes OLER</Text>
              </View>
              <View style={styles.groundingItem}>
                <View style={[styles.groundingNumber, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.groundingNumberText}>1</Text>
                </View>
                <Text style={styles.groundingText}>cosa que puedes SABOREAR</Text>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeGroundingButton}
              onPress={() => setShowGroundingModal(false)}
            >
              <Text style={styles.closeModalText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Timer Modal */}
      <Modal
        visible={showTimerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timerModalContent}>
            <Text style={styles.timerTitle}>Espera antes de actuar</Text>
            <Text style={styles.timerSubtitle}>
              Los impulsos suelen pasar en 10-15 minutos
            </Text>
            
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
            </View>
            
            <Text style={styles.timerMessage}>
              Respira profundo. Este momento pasará.
            </Text>
            
            <TouchableOpacity
              style={styles.closeTimerButton}
              onPress={() => setShowTimerModal(false)}
            >
              <Text style={styles.closeModalText}>
                {timerSeconds > 0 ? 'Cerrar' : '¡Lo lograste!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  menuButton: {
    padding: 8,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#E0E7FF',
    marginLeft: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  assistantAvatarText: {
    fontSize: 18,
  },
  messageContent: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userContent: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#E5E7EB',
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  quickPromptsContainer: {
    maxHeight: 50,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  quickPromptsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  quickPromptText: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    gap: 8,
  },
  crisisButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  crisisModalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  crisisModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crisisModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  crisisModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  crisisToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  crisisTool: {
    width: '48%',
    backgroundColor: '#2D2D2D',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  crisisToolIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  crisisToolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  crisisToolDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  closeModalButton: {
    backgroundColor: '#2D2D2D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breathingModalContent: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  breathingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  breathingSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  breathingPhase: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  breathingTime: {
    fontSize: 18,
    color: '#E0E7FF',
    marginTop: 8,
  },
  closeBreathingButton: {
    backgroundColor: '#2D2D2D',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  groundingModalContent: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  groundingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  groundingSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  groundingList: {
    maxHeight: 300,
  },
  groundingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groundingNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groundingNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  groundingText: {
    fontSize: 16,
    color: '#E5E7EB',
    flex: 1,
  },
  closeGroundingButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  timerModalContent: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeTimerButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
});
