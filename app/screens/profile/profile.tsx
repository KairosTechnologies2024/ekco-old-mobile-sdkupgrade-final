import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FCMPostgresService } from '../../../services/fcmPostgresService';
import { FCMService } from '../../../services/fcmService';
import { PushyPostgresService } from '../../../services/pushyPostgresService';
import { PushyService } from '../../../services/pushyService';
import { auth, db } from '../../config/firebase';

interface User {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  idNumber: string;
  profilePicture?: string;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vehiclesCount, setVehiclesCount] = useState(0);

  // Fetch user profile and vehicles count
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
          logout();
          return;
        }

        // Fetch user profile
        const userResults = await getDocs(
          query(collection(db, 'customers'), where('userId', '==', currentUserId))
        );

        if (!userResults.empty) {
          const userData = userResults.docs[0].data() as User;
          setUser(userData);
        }

        // Fetch vehicles count
        const vehiclesResults = await getDocs(
          query(collection(db, 'vehicles'), where('userId', '==', currentUserId))
        );
        
        setVehiclesCount(vehiclesResults.size);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const logout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // Determine which notification service is being used
              const usePushy = await PushyService.shouldUsePushy();

              if (usePushy) {
                // Get current Pushy token before logout
                const currentToken = await PushyService.getCurrentToken();

                // Sign out from Firebase auth
                await auth.signOut();

                // Delete Pushy token from device and database to prevent notifications after logout
                if (currentToken) {
                  await PushyService.deleteToken();
                  await PushyPostgresService.removePushyToken(currentToken);
                }
              } else {
                // Get current FCM token before logout
                const currentToken = await FCMService.getCurrentToken();

                // Sign out from Firebase auth
                await auth.signOut();

                // Delete FCM token from device and database to prevent notifications after logout
                if (currentToken) {
                  await FCMService.deleteToken();
                  await FCMPostgresService.removeFCMToken(currentToken);
                }
              }

            } catch (e) {
              console.log('Logout error:', e);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleChangePicture = () => {
    Alert.alert('Change Picture', 'Image picker functionality to be implemented');
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 px-4 bg-white justify-center items-center">
       <ActivityIndicator/>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 px-4 bg-white">
     

      {/* Profile Picture Section */}
      <View className="items-center mb-8">
        <Image
          source={
            user?.profilePicture 
              ? { uri: user.profilePicture }
              : require('../../../assets/images/user.png')
          }
          className="w-40 h-40 rounded-full border-2 border-gray-300 mb-4"
        />
      {/*   <Pressable 
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={handleChangePicture}
        >
          <Text className="text-white font-semibold">Change Picture</Text>
        </Pressable> */}
      </View>

      {/* Profile Details */}
      <View className="space-y-4">
        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Name</Text>
          <Text className="text-lg font-semibold">
            {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
          </Text>
        </View>

        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Phone Number</Text>
          <Text className="text-lg font-semibold">
            {user?.phoneNumber || 'Not provided'}
          </Text>
        </View>
        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Email</Text>
          <Text className="text-lg font-semibold">
            {user?.email || 'Not provided'}
          </Text>
        </View>

        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Identity Number</Text>
          <Text className="text-lg font-semibold">
            {user?.idNumber || 'Not provided'}
          </Text>
        </View>

        {/* <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Subscription Package</Text>
          <Text className="text-lg font-semibold">Ekco Basic (Fuel Cut)</Text>
        </View> */}

        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-gray-600 text-sm">Vehicles with Trackers</Text>
          <Text className="text-lg font-semibold">{vehiclesCount}</Text>
        </View>
      </View>

      {/* Logout Button */}
      <View className="flex-1 justify-end pb-4">
        <Pressable 
          className="bg-red-500 px-4 py-3 rounded-lg items-center"
          onPress={logout}
        >
          <Text className="text-white font-semibold text-lg">Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}