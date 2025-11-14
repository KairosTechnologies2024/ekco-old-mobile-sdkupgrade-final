import { FCMPostgresService } from '@/services/fcmPostgresService';
import { FCMService } from '@/services/fcmService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { auth } from '../app/config/firebase';
import { PushyPostgresService } from '../services/pushyPostgresService';
import { PushyService } from '../services/pushyService';
const { width } = Dimensions.get('window');
interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  devicesNeedingAttention?: number;
  isUsingPushy?: boolean;
}

const menuItems = [
    { label: 'Profile', icon: 'person', route: '/screens/profile/profile', showBadge: false },
    { label: 'Control Room', icon: 'call', route: '/screens/control-room/control-room', showBadge: false },
    { label: 'About', icon: 'information-circle-outline', route: '/screens/about/about', showBadge: false },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline', route: '/screens/privacy/privacy', showBadge: false },
  { label: 'Terms and Conditions', icon: 'document-text-outline', route: '/screens/terms/terms', showBadge: false },
   { label: 'Nex-Lock', icon: 'lock-closed-outline', route: '/screens/nex-lock/nex-lock', showBadge: false },
  { label: 'Token', icon: 'key-outline', route: '/screens/fcm-token/fcm-token', showBadge: false },
  { label: 'Force Pushy', icon: 'shield-checkmark', route: '/screens/force-pushy/force-pushy', showBadge: false },
  { label: 'Logout', icon: 'log-out', route: '/screens/auth/auth', showBadge: false },
];

const getMenuItems = (isUsingPushy?: boolean) => {
  return menuItems.map(item => {
    if (item.route === '/screens/fcm-token/fcm-token') {
      return {
        ...item,
        label: isUsingPushy ? 'Pushy Token' : 'FCM Token'
      };
    }
    return item;
  });
};

export default function Sidebar({ isVisible, onClose, devicesNeedingAttention = 2, isUsingPushy }: SidebarProps) {
  const translateX = useSharedValue(width);
const router = useRouter(); 
  React.useEffect(() => {
    translateX.value = withTiming(isVisible ? 0 : width, { duration: 300 });
  }, [isVisible]);

  const handleLogout = async () => {
    try {
      // Check which service is being used
      const usePushy = await PushyService.shouldUsePushy();

      // Firebase logout function
      await signOut(auth);

      if (usePushy) {
        // Get current Pushy token before logout
        const currentToken = await PushyService.getCurrentToken();

        // Delete Pushy token from device and database to prevent notifications after logout
        if (currentToken) {
          await PushyService.deleteToken();
          await PushyPostgresService.removePushyToken(currentToken);
        }
      } else {
        // Get current FCM token before logout
        const currentToken = await FCMService.getCurrentToken();

        // Delete FCM token from device and database to prevent notifications after logout
        if (currentToken) {
          await FCMService.deleteToken();
          await FCMPostgresService.removeFCMToken(currentToken);
        }
      }

      // Clear AsyncStorage to remove persisted auth data
      await AsyncStorage.multiRemove([
        'firebase:authUser:*', // Firebase auth persistence keys
        '@user_data', // Any custom user data you might have stored
        '@auth_token', // Any custom tokens
        '@pushy_token', // Pushy token
        '@fcm_token', // FCM token
      ]);

      // Alternative: Clear all AsyncStorage (more aggressive)
      // await AsyncStorage.clear();

      console.log('Logout successful - Firebase, tokens, and AsyncStorage cleared');

      // Close sidebar; navigation to auth will be handled by AppLayout's auth listener
      onClose();

    } catch (error) {
      console.log('Logout error:', error);
      Alert.alert('Logout Failed', 'There was an issue logging out. Please try again.');
    }
  };

  const handlePress = (route: string) => {
    if (route === '/screens/auth/auth') {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            onPress: handleLogout,
          },
        ]
      );
    } else {
      onClose();
     router.push(route); 
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.min(Math.max(0, event.translationX), width);
    })
    .onEnd(() => {
      if (translateX.value > width / 2) {
        translateX.value = withTiming(width, { duration: 300 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateX.value = withTiming(0, { duration: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <>
      {isVisible && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={onClose}
          activeOpacity={1}
        />
      )}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.sidebar, animatedStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>Ekco</Text>
          </View>
          <View style={styles.menu}>
            {getMenuItems(isUsingPushy).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handlePress(item.route)}
              >
                <Ionicons name={item.icon as any} size={20} color="#fff" />
                <Text style={styles.menuText}>{item.label}</Text>
                {item.showBadge && devicesNeedingAttention > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{devicesNeedingAttention}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#182f51',
    zIndex: 2,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  menu: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    position: 'relative',
  },
  menuText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
    flex: 1,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});