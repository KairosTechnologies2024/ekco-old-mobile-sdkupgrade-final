import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Clipboard, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PushyPostgresService } from '../../../services/pushyPostgresService';
import { PushyService } from '../../../services/pushyService';
import { auth } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function ForcePushyScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      // Check if PIN is already entered in this session
      checkStoredPin();
    }
  }, [isAuthenticated]);

  const checkStoredPin = async () => {
    try {
      const storedPin = await AsyncStorage.getItem('@force_pushy_pin');
      if (storedPin === 'ekcovercel') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking stored PIN:', error);
    }
  };

  const verifyPin = async () => {
    if (pin === 'ekcovercel') {
      await AsyncStorage.setItem('@force_pushy_pin', pin);
      setIsAuthenticated(true);
      setPin('');
    } else {
      Alert.alert('Invalid PIN', 'Please enter the correct PIN to access this feature.');
    }
  };

  const generateForcePushyToken = async () => {
    setLoading(true);
    try {
      // Force Pushy usage regardless of GMS detection
      PushyService.setForcePushyForTesting(true);

      // Get Pushy token
      const pushyToken = await PushyService.getPushyToken();

      if (pushyToken) {
        setToken(pushyToken);

        // Save to PostgreSQL database
        const userId = auth.currentUser?.uid;
        if (userId) {
          await PushyPostgresService.savePushyToken(userId, pushyToken);
        }

        // Store in AsyncStorage
        await AsyncStorage.setItem('@pushy_token', pushyToken);

        Alert.alert('Success', 'Pushy token generated and saved successfully.');
      } else {
        Alert.alert('Error', 'Failed to generate Pushy token.');
      }
    } catch (error) {
      console.error('Error generating Pushy token:', error);
      Alert.alert('Error', 'Failed to generate Pushy token.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (token) {
      await Clipboard.setString(token);
      Alert.alert('Copied', 'Pushy token copied to clipboard.');
    }
  };

  const resetPin = async () => {
    await AsyncStorage.removeItem('@force_pushy_pin');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.pinContainer}>
          <Ionicons name="lock-closed" size={48} color="#007bff" />
          <Text style={styles.pinTitle}>Enter PIN</Text>
          <Text style={styles.pinSubtitle}>
            Enter the PIN to access the Force Pushy feature.
          </Text>
          <TextInput
            style={styles.pinInput}
            placeholder="Enter PIN"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="default"
          />
          <TouchableOpacity onPress={verifyPin} style={styles.pinButton}>
            <Text style={styles.pinButtonText}>Verify PIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#007bff" />
          <Text style={styles.infoText}>
            This screen allows you to forcefully generate a Pushy token regardless of GMS detection. This is a fallback mechanism for push notifications.
          </Text>
        </View>

        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Your Force Pushy Token:</Text>
          {loading ? (
            <Text style={styles.loadingText}>Generating token...</Text>
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
            <Text style={styles.errorText}>No token generated yet</Text>
          )}
        </View>

        <TouchableOpacity onPress={generateForcePushyToken} style={styles.generateButton} disabled={loading}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={styles.generateText}>Generate Force Pushy Token</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetPin} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset PIN Access</Text>
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
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  pinSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  pinInput: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  pinButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  pinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  generateText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '500',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 14,
    color: '#dc3545',
    textDecorationLine: 'underline',
  },
});
