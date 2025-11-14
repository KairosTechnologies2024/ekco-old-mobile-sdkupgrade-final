import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { PermissionsAndroid, Platform } from 'react-native';
import { FCMPostgresService } from './fcmPostgresService';

export class FCMService {
  private static tokenRefreshListener: (() => void) | null = null;

  // Request user permission for notifications
  static async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, we need to request permissions through Firebase
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('📱 iOS Notification permission status:', authStatus);
        return enabled;
      } else {
        // For Android, check and request POST_NOTIFICATIONS permission for API 33+
        if (parseInt(Platform.Version as string, 10) >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to send you updates.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('❌ POST_NOTIFICATIONS permission denied');
            return false;
          }
        }

        // Check Firebase messaging permission
        const authStatus = await messaging().hasPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

        if (!enabled) {
          const newStatus = await messaging().requestPermission();
          return newStatus === messaging.AuthorizationStatus.AUTHORIZED;
        }

        return enabled;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }









  
  // Get FCM token
  static async getFCMToken(): Promise<string | null> {
    try {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      const token = await messaging().getToken();
      console.log('✅ FCM Token obtained:', token);
 /*   Alert.alert(
  'FCM Token', 
  token,
  [
    {
      text: 'Copy Token',
      onPress: () => Clipboard.setString(token)
    },
    { 
      text: 'Close', 
      style: 'cancel' 
    }
  ]
); */
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  // Check if app launched from quit state via notification
  static async getInitialNotification() {
    try {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        console.log('📱 App launched from quit state by notification:', remoteMessage);
        return remoteMessage;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting initial notification:', error);
      return null;
    }
  }

  // Subscribe to token refresh
  static onTokenRefresh(callback: (token: string) => void) {
    this.tokenRefreshListener = messaging().onTokenRefresh(callback);
    return this.tokenRefreshListener;
  }

  // Remove token refresh listener
  static removeTokenRefreshListener(listener: () => void) {
    if (listener) {
      listener();
    }
  }







  
  // Setup notification handlers using pure Firebase Messaging
  static setupNotificationHandlers(
    onNotification: (remoteMessage: any) => void,
    onNotificationOpened: (remoteMessage: any) => void
  ) {
    // Handle notifications when app is in foreground
   const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
  try {
    console.log('📱 Foreground notification received:', remoteMessage);

    const notificationId = await Notifications.presentNotificationAsync({
      title: remoteMessage.notification?.title || 'Vehicle Alert',
      body: remoteMessage.notification?.body || 'You have a new notification',
      data: remoteMessage.data,
    });

    if (notificationId) {
      console.log('✅ Notification displayed successfully:', notificationId);
    }
    onNotification(remoteMessage);
  } catch (error) {
    console.error('❌ Error handling foreground notification:', error);
  }
});
    // Handle notification taps when app is in background or quit state
    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 App opened from background by notification:', remoteMessage);
      onNotificationOpened(remoteMessage);
    });

    // Return cleanup function
    return () => {
      unsubscribeForeground();
      unsubscribeOpenedApp();
    };
  }
  // Initialize FCM - complete setup
  static async initializeFCM(
    userId: string,
    onNotification: (remoteMessage: any) => void,
    onNotificationOpened: (remoteMessage: any) => void
  ): Promise<string | null> {
    try {
      // Setup notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('high_priority_channel', {
          name: 'High Priority Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 1000, 200, 1000, 200, 1000], // Strong vibration pattern: 1s on, 0.2s off, repeat
          lightColor: '#FF231F7C',
          sound: 'default',
          showBadge: true,
        });
        console.log('✅ High priority notification channel created with strong vibration');
      }

      // Setup notification handlers first
      const cleanupHandlers = this.setupNotificationHandlers(onNotification, onNotificationOpened);

      // Request permission
      const hasPermission = await this.requestUserPermission();

      if (!hasPermission) {
        console.log('❌ Notification permission denied');
        cleanupHandlers();
        return null;
      }

      // Get FCM token
      const token = await this.getFCMToken();

      if (token && userId) {
  // Save to PostgreSQL with retry
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    const saved = await FCMPostgresService.saveFCMToken(userId, token);
    if (saved) {
      console.log('✅ FCM token saved to database');
      break;
    } else if (i === maxRetries - 1) {
      console.log('❌ Failed to save FCM token after retries');
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
      // Check for initial notification
      const initialNotification = await this.getInitialNotification();
      if (initialNotification) {
        setTimeout(() => onNotificationOpened(initialNotification), 1000);
      }

      // Setup token refresh listener
      this.onTokenRefresh(async (newToken) => {
        console.log('🔄 FCM token refreshed:', newToken.substring(0, 20) + '...');

        if (userId) {
          await FCMPostgresService.saveFCMToken(userId, newToken);
        }
      });

      return token;
    } catch (error) {
      console.error('❌ Error initializing FCM:', error);
      return null;
    }
  }

  // Cleanup FCM
  static async cleanupFCM(token?: string) {
    try {
      if (this.tokenRefreshListener) {
        this.tokenRefreshListener();
        this.tokenRefreshListener = null;
      }

      if (token) {
        await FCMPostgresService.removeFCMToken(token);
      }
    } catch (error) {
      console.error('❌ Error cleaning up FCM:', error);
    }
  }

  // Check if notifications are supported
  static isSupported(): boolean {
    return messaging().isSupported();
  }

  // Get current token
  static async getCurrentToken(): Promise<string | null> {
    try {
      return await messaging().getToken();
    } catch (error) {
      console.error('❌ Error getting current token:', error);
      return null;
    }
  }







  
//
  // Delete token (for logout)
  static async deleteToken(): Promise<boolean> {
    try {
      await messaging().deleteToken();
      console.log('✅ FCM token deleted from device');
      return true;
    } catch (error) {
      console.error('❌ Error deleting FCM token:', error);
      return false;
    }
  }
}