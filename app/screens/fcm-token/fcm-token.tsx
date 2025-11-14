import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Clipboard, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FCMPostgresService } from '../../../services/fcmPostgresService';
import { FCMService } from '../../../services/fcmService';
import { PushyPostgresService } from '../../../services/pushyPostgresService';
import { PushyService } from '../../../services/pushyService';
import { auth } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function TokenScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUsingPushy, setIsUsingPushy] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      // Determine which service to use
      const usePushy = await PushyService.shouldUsePushy();
      setIsUsingPushy(usePushy);

      const storageKey = usePushy ? '@pushy_token' : '@fcm_token';

      // First try to get from AsyncStorage
      const storedToken = await AsyncStorage.getItem(storageKey);
      if (storedToken) {
        setToken(storedToken);
        setLoading(false);
        return;
      }

      // If not in storage, get from the appropriate service
      const token = usePushy ? await PushyService.getPushyToken() : await FCMService.getFCMToken();
      if (token) {
        setToken(token);
        // Store in AsyncStorage for later use
        await AsyncStorage.setItem(storageKey, token);
      } else {
        // Alert.alert('Error', `Failed to retrieve ${usePushy ? 'Pushy' : 'FCM'} token. Please try again.`);
      }
    } catch (error) {
      console.error('Error loading token:', error);
      // Alert.alert('Error', `Failed to load ${isUsingPushy ? 'Pushy' : 'FCM'} token.`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (token) {
      await Clipboard.setString(token);
      Alert.alert('Copied', `${isUsingPushy ? 'Pushy' : 'FCM'} token copied to clipboard.`);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const newToken = isUsingPushy ? await PushyService.getPushyToken() : await FCMService.getFCMToken();
      if (newToken) {
        setToken(newToken);
        const storageKey = isUsingPushy ? '@pushy_token' : '@fcm_token';
        await AsyncStorage.setItem(storageKey, newToken);

        // Save to PostgreSQL database
        const userId = auth.currentUser?.uid;
        if (userId) {
          if (isUsingPushy) {
            await PushyPostgresService.savePushyToken(userId, newToken);
          } else {
            await FCMPostgresService.saveFCMToken(userId, newToken);
          }
        }
      } else {
        Alert.alert('Error', `Failed to refresh ${isUsingPushy ? 'Pushy' : 'FCM'} token.`);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      Alert.alert('Error', `Failed to refresh ${isUsingPushy ? 'Pushy' : 'FCM'} token.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
    

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={48} color="#007bff" />
          <Text style={styles.infoText}>
            If your push notifications ever stop working, reach out to the customer support team with this token. Do not share this token with anyone except our official support team.
          </Text>
        </View>

        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Your {isUsingPushy ? 'Pushy' : 'FCM'} Token:</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading token...</Text>
          ) : token ? (
            <View style={styles.tokenDisplay}>
              <Text style={styles.tokenText} selectable>
                {token}
              </Text>
              <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={20} color="#007bff" />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.errorText}>Failed to load {isUsingPushy ? 'Pushy' : 'FCM'} token</Text>
          )}
        </View>

        <TouchableOpacity onPress={refreshToken} style={styles.refreshButton} disabled={loading}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshText}>Refresh Token</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#182f51',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  tokenContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  tokenDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  copyText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 8,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  refreshText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '500',
  },
});
