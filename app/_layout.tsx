import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';
import '../global.css';
import { FCMService } from '../services/fcmService';
import { PushyService } from '../services/pushyService';
import { websocketService } from '../services/webSocketService';
import { auth } from './config/firebase';

export default function AppLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUsingPushy, setIsUsingPushy] = useState(false);

  // Use ref for animated value to avoid reset on re-renders
  const rotationValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Handle notification when app is in foreground
  const handleNotification = (remoteMessage: any) => {
    console.log('📱 Notification received in layout:', remoteMessage);

    const { data, notification } = remoteMessage;

    if (Platform.OS === 'ios' && data?.severity === 'high') {
      Alert.alert(
        notification?.title || 'Important Alert',
        notification?.body,
        [
          { text: 'View', onPress: () => handleNotificationNavigation(data) },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );
    }
  };

  // Handle notification opened (user tapped notification)
  const handleNotificationOpened = (remoteMessage: any) => {
    console.log('📱 Notification opened in layout:', remoteMessage);
    handleNotificationNavigation(remoteMessage.data);
  };

  // Navigate based on notification data
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    const currentRoute = segments[segments.length - 1] || '';

    if (data.type === 'vehicle_alert' && data.vehicleId) {
      if (currentRoute !== 'vehicle-details') {
        router.push({
          pathname: '/screens/vehicle/vehicle-details',
          params: {
            vehicleId: data.vehicleId,
            vehicleName: data.vehicleName || 'Vehicle Details',
            alertId: data.alertId
          }
        });
      }
    } else if (data.type === 'alert' || data.type === 'vehicle_alert') {
      if (currentRoute !== 'alerts') {
        router.push('/alerts');
      }
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('📡 WebSocket message in layout:', data);

    if (data.type === 'new_alert') {
    /*   Alert.alert(
        `New Alert for ${data.alert.vehicleModel}`,
        data.alert.alertType || 'A new alert has been received.',
        [
          { text: 'View', onPress: () => handleNotificationNavigation(data.alert) },
          { text: 'Dismiss', style: 'cancel' }
        ]
      ); */
    }
  };

  // AppState listener for WebSocket reconnection
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user && !websocketService.isConnected()) {
        console.log('🔄 App became active, reconnecting WebSocket...');
        websocketService.connect(user.uid);
      }
    });

    return () => subscription.remove();
  }, [user]);

  // Load user from AsyncStorage and set up auth listener
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error loading user from AsyncStorage:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    loadUser();

    let cleanupFCMCalled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('👤 User logged in:', firebaseUser.uid);
        setUser(firebaseUser);
        await AsyncStorage.setItem('user', JSON.stringify(firebaseUser));

          try {
            // Enable Pushy testing mode for debugging (uncomment to test Pushy on GMS devices)
            PushyService.setForcePushyForTesting(false);

            // Check if we should use Pushy or FCM
            const usePushy = await PushyService.shouldUsePushy();
          setIsUsingPushy(usePushy);

          let token: string | null = null;

          if (usePushy) {
            console.log('🔄 Initializing Pushy service...');
            token = await PushyService.initializePushy(
              firebaseUser.uid,
              handleNotification,
              handleNotificationOpened
            );
          } else {
            console.log('🔄 Initializing FCM service...');
            token = await FCMService.initializeFCM(
              firebaseUser.uid,
              handleNotification,
              handleNotificationOpened
            );
          }

          setFcmToken(token);

          websocketService.connect(firebaseUser.uid);
          websocketService.onMessage(handleWebSocketMessage);

          console.log('✅ All services initialized for user:', firebaseUser.uid);
        } catch (error) {
          console.error('❌ Error initializing services:', error);
        }
      } else {
        console.log('👤 User logged out');
        setUser(null);
        await AsyncStorage.removeItem('user');

        if (!cleanupFCMCalled) {
          FCMService.cleanupFCM(fcmToken || undefined);
          cleanupFCMCalled = true;
        }
        websocketService.disconnect();
        setFcmToken(null);

        console.log('✅ All services cleaned up');
      }
    });

    return () => {
      unsubscribeAuth();
      websocketService.disconnect();
      if (!cleanupFCMCalled && fcmToken) {
        FCMService.cleanupFCM(fcmToken);
      }
    };
  }, []);

  const isVehicleDetailsScreen = segments.some(seg => seg === 'vehicle-details');
  const isLoginOrAuth = pathname === '/' || pathname.includes('/auth');

  // Navigate to auth screen when user is null and not already on auth
  useEffect(() => {
    if (!user && !isAuthLoading && !isLoginOrAuth) {
      router.replace('/screens/auth/auth');
    }
  }, [user, isAuthLoading, pathname, router]);

  // Gear rotation animation
  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      animationRef.current.start();
    }
  }, []);

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // If still loading auth, show loading screen
  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={'dark-content'} />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="screens/auth/auth" options={{ headerShown: false }} />
          <Stack.Screen name="screens/auth/reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="screens/about/about" options={{ title: 'About' }} />
          <Stack.Screen name="screens/control-room/control-room" options={{ title: 'Control Room' }} />
          <Stack.Screen name="screens/profile/profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="screens/terms/terms" options={{ title: 'Terms & Conditions' }} />
          <Stack.Screen name="screens/privacy/privacy" options={{ title: 'Privacy Policy' }} />
          <Stack.Screen name="screens/fcm-token/fcm-token" options={{ title: isUsingPushy ? 'Pushy Token' : 'FCM Token' }} />
          <Stack.Screen name="screens/nex-lock/nex-lock" options={{ title: 'Nex Lock' }} />
          <Stack.Screen name="screens/force-pushy/force-pushy" options={{ title: 'Force Pushy' }} />

          <Stack.Screen name="screens/vehicle/vehicle-details" options={{ headerShown: true, title: 'Loading Vehicle...' }} />
          <Stack.Screen name="alerts" options={{ title: 'Alerts', headerShown: true }} />
        </Stack>

        <Animated.View
          style={[
            styles.gearButton,
            { transform: [{ rotate: rotation }] },
            isVehicleDetailsScreen && styles.gearButtonLocation,
            isLoginOrAuth && { opacity: 0 }
          ]}
        >
          {!sidebarVisible && !isLoginOrAuth && (
            <TouchableOpacity
              onPress={() => setSidebarVisible(true)}
              style={styles.touchableArea}
            >
              <Ionicons name="settings" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} isUsingPushy={isUsingPushy} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gearButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#182f51',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gearButtonLocation: {
    bottom: 200,
  },
  touchableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
