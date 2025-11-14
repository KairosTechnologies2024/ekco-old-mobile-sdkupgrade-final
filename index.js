import * as Notifications from 'expo-notifications';
import { AppRegistry } from 'react-native';

// Register Pushy headless task for background notifications
AppRegistry.registerHeadlessTask('PushyPushReceiver', () => async (data) => {
  console.log('📱 Pushy headless task triggered:', data);

  try {
    // Parse the notification data
    let notificationData = data;

    // Handle __json string if present
    if (data.__json && typeof data.__json === 'string') {
      notificationData = JSON.parse(data.__json);
    } else if (typeof data === 'string') {
      notificationData = JSON.parse(data);
    }

    // Extract notification details
    let title = 'Vehicle Alert';
    let body = 'You have a new notification';

    if (notificationData.title) {
      title = notificationData.title;
    } else if (notificationData.alertType) {
      title = `⚠️ ${notificationData.alertType}`;
    } else if (notificationData.type) {
      title = `⚠️ ${notificationData.type.replace('_', ' ')}`;
    }

    if (notificationData.vehicleModel && notificationData.vehiclePlate) {
      body = `${notificationData.vehicleModel} (${notificationData.vehiclePlate})`;
    } else if (notificationData.body) {
      body = notificationData.body;
    } else if (notificationData.message) {
      body = notificationData.message;
    }

    // Present the notification using expo-notifications
    const notificationId = await Notifications.presentNotificationAsync({
      title: title,
      body: body,
      data: notificationData,
    });

    console.log('✅ Pushy headless notification displayed:', notificationId);

  } catch (error) {
    console.error('❌ Error in Pushy headless task:', error);
  }
});

// Import and register the expo-router entry point
import 'expo-router/entry';

