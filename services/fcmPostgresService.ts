

const API_BASE_URL = 'http://ekco-tracking.co.za:3004'; 

export class FCMPostgresService {
  // Save FCM token to PostgreSQL backend
  static async saveFCMToken(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcm/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ FCM token saved to PostgreSQL');
     // Alert.alert('Success', 'FCM token saved to PostgreSQL');
      return result.success;
    } catch (error) {
      console.error('❌ Error saving FCM token to PostgreSQL:', error);
    //  Alert.alert('Error', 'Failed to save FCM token to PostgreSQL');
      return false;
    }
  }

  // Remove FCM token from PostgreSQL backend
  static async removeFCMToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcm/token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ FCM token removed from PostgreSQL');
     // Alert.alert('Success', 'FCM token removed from PostgreSQL');
      return result.success;
    } catch (error) {
      console.error('❌ Error removing FCM token from PostgreSQL:', error);
//      Alert.alert('Error', 'Failed to remove FCM token from PostgreSQL');
      return false;
    }
  }

  // Remove all tokens for a user
  static async removeAllUserTokens(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcm/tokens/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ All FCM tokens removed for user');
    //  Alert.alert('Success', 'All FCM tokens removed for user');
      return result.success;
    } catch (error) {
      console.error('❌ Error removing user tokens from PostgreSQL:', error);
  //    Alert.alert('Error', 'Failed to remove all FCM tokens for user');
      return false;
    }
  }
}