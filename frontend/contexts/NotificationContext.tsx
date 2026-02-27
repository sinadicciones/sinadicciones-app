import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import {
  registerForPushNotificationsAsync,
  registerPushTokenWithServer,
  getUnreadNotifications,
  markNotificationAsRead,
  setBadgeCount,
} from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notification {
  notification_id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  expoPushToken: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  expoPushToken: null,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Registrar para push notifications
  useEffect(() => {
    if (isAuthenticated && user) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          // Registrar token en el servidor
          await registerPushTokenWithServer(user.user_id, token);
        }
      });

      // Listener para notificaciones recibidas mientras la app está abierta
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificación recibida:', notification);
        // Refrescar lista de notificaciones
        refreshNotifications();
      });

      // Listener para cuando el usuario toca la notificación
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Respuesta a notificación:', response);
        const data = response.notification.request.content.data;
        handleNotificationResponse(data);
      });

      // Cargar notificaciones iniciales
      refreshNotifications();

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [isAuthenticated, user]);

  // Polling para actualizaciones (cada 30 segundos)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    try {
      const unreadNotifs = await getUnreadNotifications();
      setNotifications(unreadNotifs);
      setUnreadCount(unreadNotifs.length);
      
      // Actualizar badge del icono de la app
      await setBadgeCount(unreadNotifs.length);
    } catch (error) {
      console.error('Error refrescando notificaciones:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.notification_id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      await setBadgeCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  }, [unreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('session_token');
      const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      await setBadgeCount(0);
    } catch (error) {
      console.error('Error marcando todas:', error);
    }
  }, []);

  const handleNotificationResponse = (data: any) => {
    // Manejar navegación basada en el tipo de notificación
    // Esto se puede expandir para navegar a pantallas específicas
    console.log('Handling notification response:', data);
    
    if (data?.action) {
      switch (data.action) {
        case 'view_task':
          // Navegar a tareas
          break;
        case 'view_messages':
          // Navegar a mensajes
          break;
        case 'view_patient':
          // Navegar a detalle de paciente
          break;
        default:
          break;
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        expoPushToken,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
