

const API_BASE_URL = 'http://ekco-tracking.co.za:3004'; 

export class PushyPostgresService {
  // Save Pushy token to PostgreSQL backend
  static async savePushyToken(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pushy/token`, {
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
      console.log('✅ Pushy token saved to PostgreSQL');
      // Alert.alert('Success', 'Pushy token saved to PostgreSQL');
      return result.success;
    } catch (error) {
      console.error('❌ Error saving Pushy token to PostgreSQL:', error);
      // Alert.alert('Error', 'Failed to save Pushy token to PostgreSQL');
      return false;
    }
  }

  // Remove Pushy token from PostgreSQL backend
  static async removePushyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pushy/token`, {
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
      console.log('✅ Pushy token removed from PostgreSQL');
      // Alert.alert('Success', 'Pushy token removed from PostgreSQL');
      return result.success;
    } catch (error) {
      console.error('❌ Error removing Pushy token from PostgreSQL:', error);
     // Alert.alert('Error', 'Failed to remove Pushy token from PostgreSQL');
      return false;
    }
  }

  // Remove all tokens for a user
  static async removeAllUserTokens(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pushy/tokens/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ All Pushy tokens removed for user');
      // Alert.alert('Success', 'All Pushy tokens removed for user');
      return result.success;
    } catch (error) {
      console.error('❌ Error removing user tokens from PostgreSQL:', error);
      // Alert.alert('Error', 'Failed to remove all Pushy tokens for user');
      return false;
    }
  }
}
