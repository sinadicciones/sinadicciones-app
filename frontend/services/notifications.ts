import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

// Registrar para notificaciones push
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Verificar si es un dispositivo físico
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('No se otorgaron permisos para notificaciones push');
      return null;
    }

    try {
      // Obtener el token de Expo Push
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      token = tokenData.data;
      console.log('Push token obtenido:', token);
    } catch (error) {
      console.log('Error obteniendo push token:', error);
    }
  } else {
    console.log('Debe usar un dispositivo físico para notificaciones push');
  }

  // Configuración específica para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });
  }

  return token;
}

// Registrar el token en el servidor
export async function registerPushTokenWithServer(userId: string, token: string): Promise<boolean> {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken) return false;

    const response = await fetch(`${API_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error registrando push token:', error);
    return false;
  }
}

// Eliminar el token del servidor (cuando cierra sesión)
export async function unregisterPushToken(userId: string): Promise<boolean> {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken) return false;

    const response = await fetch(`${API_URL}/api/notifications/unregister-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error eliminando push token:', error);
    return false;
  }
}

// Obtener notificaciones no leídas
export async function getUnreadNotifications(): Promise<any[]> {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken) return [];

    const response = await fetch(`${API_URL}/api/notifications/unread`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.notifications || [];
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken) return false;

    const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error marcando notificación:', error);
    return false;
  }
}

// Programar notificación local
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = inmediata
  });
}

// Cancelar todas las notificaciones programadas
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Obtener el badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Establecer el badge count
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
