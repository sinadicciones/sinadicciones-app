import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, refreshNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_task':
        return { name: 'clipboard', color: '#3B82F6' };
      case 'task_completed':
        return { name: 'checkmark-circle', color: '#10B981' };
      case 'task_progress':
        return { name: 'pencil', color: '#F59E0B' };
      case 'new_note':
        return { name: 'document-text', color: '#8B5CF6' };
      case 'new_message':
        return { name: 'chatbubble', color: '#06B6D4' };
      case 'relapse_alert':
        return { name: 'warning', color: '#EF4444' };
      case 'mood_drop':
        return { name: 'trending-down', color: '#F97316' };
      case 'milestone':
        return { name: 'trophy', color: '#FBBF24' };
      default:
        return { name: 'notifications', color: '#6B7280' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.notification_id);
    }
    // Aquí se puede agregar navegación basada en notification.data.action
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Notificaciones</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Marcar leídas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Badge de no leídas */}
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Ionicons name="mail-unread" size={18} color="#3B82F6" />
            <Text style={styles.unreadText}>{unreadCount} sin leer</Text>
          </View>
        )}

        {/* Lista de notificaciones */}
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptyText}>
                Las notificaciones de tu terapeuta y actualizaciones aparecerán aquí
              </Text>
            </View>
          ) : (
            notifications.map((notification) => {
              const icon = getNotificationIcon(notification.type);
              return (
                <TouchableOpacity
                  key={notification.notification_id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadItem
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
                    <Ionicons name={icon.name as any} size={22} color={icon.color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                      {notification.body}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  unreadText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
    marginTop: 4,
  },
});
