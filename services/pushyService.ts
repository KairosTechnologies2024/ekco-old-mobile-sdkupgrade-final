import * as Notifications from 'expo-notifications';
import Pushy from 'pushy-react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { PushyPostgresService } from './pushyPostgresService';
// react-native-device-info is already installed for Huawei detection
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getManufacturer } from 'react-native-device-info';
export class PushyService {




  private static tokenRefreshListener: (() => void) | null = null;

  // Testing flag - set to true to force Pushy usage even on GMS devices
  private static forcePushyForTesting: boolean = false;

  // Method to enable/disable Pushy testing mode
  static setForcePushyForTesting(enabled: boolean) {
    this.forcePushyForTesting = enabled;
    console.log(`🔧 Pushy testing mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Check if we should use Pushy (Android non-GMS) or FCM (iOS or GMS)
  static async shouldUsePushy(): Promise<boolean> {
    try {
      // iOS: Always use FCM, never Pushy
      if (Platform.OS === 'ios') {
        console.log('📱 iOS detected: Using FCM instead of Pushy');
     //   Alert.alert('Notification Service', 'iOS detected: Skipping Pushy, using FCM instead');
        return false;
      }

      // Android: Check for GMS availability with fallbacks
      if (Platform.OS === 'android') {
        let hasGMS = false;
        let detectionMethod = 'unknown';

        try {
          // Primary: Direct GMS check (requires react-native-google-mobile-services-check or similar)
          // For now, we'll use manufacturer as primary, but add GMS check as fallback
          const manufacturer = await getManufacturer();
          console.log('📱 Android device manufacturer:', manufacturer);

          // Known non-GMS manufacturers
          const knownNonGMSManufacturers = ['huawei', 'honor', 'xiaomi'];
          const isKnownNonGMS = knownNonGMSManufacturers.some(mfg =>
            manufacturer.toLowerCase().includes(mfg)
          );

          if (isKnownNonGMS) {
            hasGMS = false;
            detectionMethod = 'manufacturer_known_non_gms';
          } else {
            // For other manufacturers, assume GMS unless proven otherwise
            hasGMS = true;
            detectionMethod = 'manufacturer_assumed_gms';
          }

          // Fallback: Try to detect GMS availability directly
          try {
            const gmsAvailable = await (GoogleSignin as any).hasPlayServices();
            console.log('📱 Direct GMS check result:', gmsAvailable);

            if (gmsAvailable) {
              hasGMS = true;
              detectionMethod = 'direct_gms_check';
              console.log('📱 GMS confirmed available via direct check');
            } else {
              hasGMS = false;
              detectionMethod = 'direct_gms_check_unavailable';
              console.log('📱 GMS confirmed unavailable via direct check');
            }
          } catch (gmsError) {
            console.warn('⚠️ Direct GMS check failed, falling back to manufacturer logic:', gmsError);
            // Keep the manufacturer-based logic as fallback
          }

          console.log(`📱 Final GMS detection via ${detectionMethod}: hasGMS=${hasGMS}`);

        } catch (manufacturerError) {
          console.warn('⚠️ Manufacturer detection failed, defaulting to FCM:', manufacturerError);
          hasGMS = true; // Default to FCM on error
          detectionMethod = 'error_fallback';
        }

        // Apply testing flag override
        if (hasGMS && this.forcePushyForTesting) {
     //     Alert.alert('Notification Service', `GMS device detected (${detectionMethod}): FORCED Pushy testing mode enabled`);
          console.log('📱 FORCED: Using Pushy for testing on GMS device');
          return true;
        } else if (hasGMS && !this.forcePushyForTesting) {
        //  Alert.alert('Notification Service', `GMS device detected (${detectionMethod}): Using FCM instead of Pushy`);
          console.log('📱 Skipping Pushy service - using FCM for GMS device');
          return false;
        } else {
        //  Alert.alert('Notification Service', `No-GMS device detected (${detectionMethod}): Using Pushy`);
          console.log('📱 No-GMS Android device: Using Pushy');
          return true;
        }
      }

      // Other platforms: default to FCM
      return false;
    } catch (error) {
      console.error('❌ Error determining notification service:', error instanceof Error ? error.message : String(error));
      return false; // Default to FCM on error
    }
  }

  // Check if device is Huawei (for FCM fallback on Android)
  static async isHuaweiDevice(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }
      // For now, return false - uncomment below when react-native-device-info is installed
      // const manufacturer = await getManufacturer();
      // const isHuawei = manufacturer.toLowerCase().includes('huawei') ||
      //                  manufacturer.toLowerCase().includes('honor');
      // console.log('📱 Device manufacturer:', manufacturer, 'Is Huawei:', isHuawei);
      // return isHuawei;
      return false; 
    } catch (error) {
      console.error('❌ Error detecting device manufacturer:', error);
      return false;
    }
  }

  // Request user permission for notifications
  static async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // Pushy handles permissions on iOS
        console.log('📱 iOS Notification permission handled by Pushy');
        return true;
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
        return true;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }




private static parsePushyNotification(data: any): { title: string; body: string; originalData: any } {
  try {
    console.log('🔍 [PUSHY PARSER] Raw input:', data);
    console.log('🔍 [PUSHY PARSER] All keys:', Object.keys(data));

    let notificationData = data;
    
    
    if (data.__json && typeof data.__json === 'string') {
      console.log('📦 Found __json string, parsing...');
      notificationData = JSON.parse(data.__json);
      console.log('📦 Parsed __json data:', notificationData);
    } else if (typeof data === 'string') {
      notificationData = JSON.parse(data);
    }

    console.log('🔍 [PUSHY PARSER] Available data after processing:', {
      title: notificationData.title,
      vehicleModel: notificationData.vehicleModel,
      vehiclePlate: notificationData.vehiclePlate,
      type: notificationData.type,
      alertType: notificationData.alertType
    });

    let title = 'Vehicle Alert';
    let body = 'You have a new notification';

    // Extract title from the parsed __json data
    if (notificationData.title) {
      title = notificationData.title;
      console.log('✅ Using title from data:', title);
    } else if (notificationData.alertType) {
      title = `⚠️ ${notificationData.alertType}`;
      console.log('✅ Using alertType for title:', title);
    } else if (notificationData.type) {
      title = `⚠️ ${notificationData.type.replace('_', ' ')}`;
      console.log('✅ Using type for title:', title);
    }

    // Extract body from vehicle data
    if (notificationData.vehicleModel && notificationData.vehiclePlate) {
      body = `${notificationData.vehicleModel} (${notificationData.vehiclePlate})`;
      console.log('✅ Using vehicle data for body:', body);
    } else if (notificationData.body) {
      body = notificationData.body;
      console.log('✅ Using body from data:', body);
    } else if (notificationData.message) {
      body = notificationData.message;
      console.log('✅ Using message for body:', body);
    }

    console.log('✅ Final parsed notification:', { title, body });
    
    return {
      title,
      body,
      originalData: notificationData
    };
  } catch (error) {
    console.error('❌ Error parsing Pushy notification:', error instanceof Error ? error.message : String(error));
    return {
      title: 'Vehicle Alert',
      body: 'You have a new notification',
      originalData: data
    };
  }
}










  // Get Pushy token
  static async getPushyToken(): Promise<string | null> {
    try {
      const token = await Pushy.register();
      console.log('✅ Pushy Token obtained:', token);
      return token;
    } catch (error) {
      console.error('❌ Error getting Pushy token:', error);
      return null;
    }
  }

  // Check if app launched from quit state via notification
  static async getInitialNotification() {
    try {
      // Pushy handles initial notifications through the notification click listener
      // when the app is launched from a quit state. For now, return null as
      // the click listener will handle it appropriately.
      return null;
    } catch (error: any) {
      console.error('❌ Error getting initial notification:', error);
      return null;
    }
  }

  // Subscribe to token refresh
  static onTokenRefresh(callback: (token: string) => void) {
    // Pushy doesn't have a token refresh listener, so we skip this
    this.tokenRefreshListener = null;
    return this.tokenRefreshListener;
  }

  // Remove token refresh listener
  static removeTokenRefreshListener(listener: () => void) {
    if (listener) {
      listener();
    }
  }

  // Setup notification handlers using Pushy
// Setup notification handlers using Pushy
static setupNotificationHandlers(
  onNotification: (remoteMessage: any) => void,
  onNotificationOpened: (remoteMessage: any) => void
) {
  // Handle notifications when app is in foreground
  Pushy.setNotificationListener(async (data) => {
    try {
      console.log('📱 Raw Pushy notification received:', data);

      // Use the parser to extract proper title and body
      const { title, body, originalData } = this.parsePushyNotification(data);

      const notificationId = await Notifications.presentNotificationAsync({
        title: title,
        body: body,
        data: originalData,
      });

      if (notificationId) {
        console.log('✅ Pushy notification displayed:', { id: notificationId, title, body });
      }
      
      onNotification(originalData);
    } catch (error) {
      console.error('❌ Error handling Pushy foreground notification:', error);
    }
  });

  // Handle notification taps when app is in background or quit state
  Pushy.setNotificationClickListener((data) => {
    try {
      console.log('📱 App opened from background by Pushy notification:', data);
      
      const { originalData } = this.parsePushyNotification(data);
      onNotificationOpened(originalData);
    } catch (error) {
      console.error('❌ Error handling Pushy background notification:', error);
    }
  });

  return () => {
    // Cleanup if needed
  };
}

  // Initialize Pushy - complete setup
  static async initializePushy(
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

      // Get Pushy token
      const token = await this.getPushyToken();

      if (token && userId) {
        // Save to PostgreSQL with retry
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
          const saved = await PushyPostgresService.savePushyToken(userId, token);
          if (saved) {
            console.log('✅ Pushy token saved to database');
            break;
          } else if (i === maxRetries - 1) {
            console.log('❌ Failed to save Pushy token after retries');
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
        console.log('🔄 Pushy token refreshed:', newToken.substring(0, 20) + '...');

        if (userId) {
          await PushyPostgresService.savePushyToken(userId, newToken);
        }
      });

      return token;
    } catch (error) {
      console.error('❌ Error initializing Pushy:', error);
      return null;
    }
  }

  // Cleanup Pushy
  static async cleanupPushy(token?: string) {
    try {
      if (this.tokenRefreshListener) {
        this.tokenRefreshListener();
        this.tokenRefreshListener = null;
      }

      if (token) {
        await PushyPostgresService.removePushyToken(token);
      }
    } catch (error) {
      console.error('❌ Error cleaning up Pushy:', error);
    }
  }

  // Check if notifications are supported
  static isSupported(): boolean {
    return true; // Pushy supports all platforms
  }

  // Get current token
  static async getCurrentToken(): Promise<string | null> {
    try {
      if (await Pushy.isRegistered()) {
        // Pushy doesn't provide a direct get token, but we can re-register or assume it's stored
        // For simplicity, return null or implement storage
        return null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting current token:', error);
      return null;
    }
  }

  // Delete token (for logout)
  static async deleteToken(): Promise<boolean> {
    try {
      await Pushy.unregister();
      console.log('✅ Pushy token deleted from device');
      return true;
    } catch (error) {
      console.error('❌ Error deleting Pushy token:', error);
      return false;
    }
  }
}
