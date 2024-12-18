'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './notificationList.module.scss';
import { Bell, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'success';
  read: boolean;
  createdAt: string;
}

interface NotificationListProps {
  domainName: string;
}

export default function NotificationList({ domainName }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/seo/domains/${domainName}/notifications/unread-count`);
        if (!response.ok) throw new Error('Failed to fetch unread count');
        const data = await response.json();
        setUnreadCount(data.count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    // Fetch immediately
    fetchUnreadCount();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => clearInterval(interval);
  }, [domainName]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/seo/domains/${domainName}/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        setNotifications(data.notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchNotifications();
    }
  }, [domainName, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/seo/domains/${domainName}/notifications/${id}/read`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');

      setNotifications(notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getTypeStyles = (type: string): string => {
    switch (type) {
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      case 'success': return styles.success;
      default: return '';
    }
  };

  return (
    <div className={styles.container} ref={listRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button 
                  className={styles.markAllRead}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const response = await fetch(
                        `/api/seo/domains/${domainName}/notifications/read-all`,
                        { method: 'POST' }
                      );
                      if (!response.ok) throw new Error('Failed to mark all as read');
                      
                      setNotifications(notifications.map(notification => ({
                        ...notification,
                        read: true
                      })));
                      setUnreadCount(0);
                    } catch (error) {
                      console.error('Error marking all as read:', error);
                    }
                  }}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <span className={styles.count}>{notifications.length} total</span>
              )}
            </div>
          </div>

          <div className={styles.content}>
            {loading ? (
              <div className={styles.loading}>Loading notifications...</div>
            ) : notifications.length > 0 ? (
              <div className={styles.list}>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={[
                      styles.notification,
                      !notification.read ? styles.unread : '',
                      getTypeStyles(notification.type)
                    ].join(' ')}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className={styles.title}>{notification.title}</div>
                    <p className={styles.message}>{notification.message}</p>
                    <div className={styles.meta}>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}