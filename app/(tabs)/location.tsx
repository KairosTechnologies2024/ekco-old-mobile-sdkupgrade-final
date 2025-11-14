import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, LayoutAnimation, Modal, Pressable, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FCMPostgresService } from '../../services/fcmPostgresService';
import { FCMService } from '../../services/fcmService';
import { PushyPostgresService } from '../../services/pushyPostgresService';
import { PushyService } from '../../services/pushyService';
import { auth, db } from '../config/firebase';

// Helper function for pin colors
const getPinColor = (speed: number) => {
  if (speed === 0) return '#ef4444'; // Red for parked
  if (speed < 30) return '#f59e0b'; // Amber for slow
  if (speed < 60) return '#3b82f6'; // Blue for normal
  return '#10b981'; // Green for fast
};

// Helper function for vehicle status
const getVehicleStatus = (speed: number) => {
  if (speed === 0) return 'Parked';
  if (speed < 30) return 'Slow Moving';
  if (speed < 60) return 'Moving';
  return 'Fast Moving';
};

// Custom marker component
const CustomMarker = ({ speed, title }: { speed: number; title: string }) => {
  const pinColor = getPinColor(speed);
  
  return (
    <View style={{ alignItems: 'center' }}>
      <View 
        style={{ 
          backgroundColor: pinColor,
          padding: 8,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: 'white',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Ionicons name="car" size={16} color="white" />
      </View>
      <View 
        style={{
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: pinColor,
        }}
      />
    </View>
  );
};

interface Vehicle {
  id: string;
  name: string;
  shortName: string;
  vehicleModel: string;
  plateOnly: string;
  vehiclePlate: string;
  deviceSerial: string;
  location?: string;
}

export default function Home() {
  const router = useRouter();
  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700; // Threshold for small screens

  // Helper function for dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // State from old app
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleCoordinates, setVehicleCoordinates] = useState<{[key: string]: {latitude: number, longitude: number}}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [vehicleSpeeds, setVehicleSpeeds] = useState<{[key: string]: number}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpeedLoading, setIsSpeedLoading] = useState(true);

  // UI state from new app
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isVehicleListModalVisible, setIsVehicleListModalVisible] = useState(false);

  // Dropdown and logout state
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const dropdownAnimation = useRef(new Animated.Value(0)).current;

  // Slider data from new app
  const sliderData = [
    {
      id: 1,
      title: "Effortlessly keep track of\nall your vehicles",
      backgroundColor: '#000',
      icon: 'location-outline'
    },
    {
      id: 2,
      title: "Monitor your fleet in\nreal-time",
      backgroundColor: '#182f51',
      icon: 'time-outline'
    },
    {
      id: 3,
      title: "Stay connected with your\nvehicles 24/7",
      backgroundColor: '#DC2626',
      icon: 'wifi-outline'
    },
    {
      id: 4,
      title: "Track location, status, and\nperformance",
      backgroundColor: '#7C3AED',
      icon: 'speedometer-outline'
    }
  ];

  // Get map region that includes all vehicles
  const getMapRegion = () => {
    const coords = Object.values(vehicleCoordinates);
    if (coords.length === 0) {
      return {
        latitude: -26.2041,
        longitude: 28.0473,
        latitudeDelta: 1.0,
        longitudeDelta: 1.0,
      };
    }

    const latitudes = coords.map(c => c.latitude);
    const longitudes = coords.map(c => c.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    let latitudeDelta = (maxLat - minLat) * 1.5;
    let longitudeDelta = (maxLng - minLng) * 1.5;

    // Ensure minimum deltas to prevent map from disappearing with single vehicle
    if (latitudeDelta === 0) latitudeDelta = 0.1;
    if (longitudeDelta === 0) longitudeDelta = 0.1;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta,
      longitudeDelta,
    };
  };

  // Get user profile and vehicles
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        getProfile();
        getVehicles();
      } else {
        setIsLoading(false);
        setIsSpeedLoading(false);
      }
    });

    return unsubscribeAuth;
  }, []);

  const getProfile = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const results = await getDocs(
        query(collection(db, "customers"), where("userId", "==", currentUserId))
      );
      
      if (!results.empty) {
        const userData = results.docs[0].data();
        setUser(userData);
        setName(`${userData.firstName} ${userData.lastName}`);
      }
    } catch (error) {
      console.error("Error getting profile:", error);
    }
  };

  const getVehicles = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const results = await getDocs(
        query(collection(db, "vehicles"), where("userId", "==", currentUserId))
      );

      const vehiclesData: Vehicle[] = [];
      results.docs.forEach((doc) => {
        const data = doc.data();
        const fullName = `${data.vehicleModel} - ${data.vehiclePlate}`;
        vehiclesData.push({
          id: doc.id,
          name: fullName,
          shortName: fullName.split(' - ')[0],
          plateOnly: fullName.split(' - ')[1],
          vehicleModel: data.vehicleModel,
          vehiclePlate: data.vehiclePlate,
          deviceSerial: data.deviceSerial,
          location: 'Unknown'
        });
      });

      setVehicles(vehiclesData);
      setIsLoading(false);
      
      // Initialize speeds with default value of 0
      const initialSpeeds: {[key: string]: number} = {};
      vehiclesData.forEach(vehicle => {
        initialSpeeds[vehicle.id] = 0;
      });
      setVehicleSpeeds(initialSpeeds);
      
    } catch (error) {
      console.error("Error getting vehicles:", error);
      setIsLoading(false);
      setIsSpeedLoading(false);
    }
  };

  // Get GPS data for all vehicles
  useEffect(() => {
    if (vehicles.length === 0) return;

    const unsubscribes = vehicles.map(vehicle => {
      if (!vehicle.deviceSerial) return null;

      try {
        const gpsQ = query(
          collection(db, "gps"),
          where("serialNumber", "==", vehicle.deviceSerial),
          orderBy("rawDate", "desc"),
          limit(1)
        );

        return onSnapshot(gpsQ, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const gpsData = querySnapshot.docs[0].data();
            setVehicleCoordinates(prev => ({
              ...prev,
              [vehicle.id]: {
                latitude: parseFloat(gpsData.lat),
                longitude: parseFloat(gpsData.long)
              }
            }));
          }
        });
      } catch (error) {
        console.error("Error setting up GPS subscription:", error);
        return null;
      }
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [vehicles]);

  // Get speed data for all vehicles - improved version
  useEffect(() => {
    if (vehicles.length === 0) return;

    setIsSpeedLoading(true);
    const unsubscribes = vehicles.map(vehicle => {
      if (!vehicle.deviceSerial) {
        // Set default speed for vehicles without device serial
        setVehicleSpeeds(prev => ({
          ...prev,
          [vehicle.id]: 0
        }));
        return null;
      }

      try {
        const speedQ = query(
          collection(db, "speed"),
          where("serialNumber", "==", vehicle.deviceSerial),
          orderBy("rawDate", "desc"),
          limit(1)
        );

        return onSnapshot(speedQ, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const speedData = querySnapshot.docs[0].data();
            const speed = parseInt(speedData.speed?.split(".")[0] || "0");
            setVehicleSpeeds(prev => ({
              ...prev,
              [vehicle.id]: speed
            }));
          } else {
            // Set default speed if no data found
            setVehicleSpeeds(prev => ({
              ...prev,
              [vehicle.id]: 0
            }));
          }
        }, (error) => {
          console.error("Error in speed subscription:", error);
          // Set default speed on error
          setVehicleSpeeds(prev => ({
            ...prev,
            [vehicle.id]: 0
          }));
        });
      } catch (error) {
        console.error("Error setting up speed subscription:", error);
        // Set default speed on setup error
        setVehicleSpeeds(prev => ({
          ...prev,
          [vehicle.id]: 0
        }));
        return null;
      }
    });

    // Set a timeout to mark speed loading as complete
    const timeout = setTimeout(() => {
      setIsSpeedLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [vehicles]);

  const toggleFullScreen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFullScreen(!isFullScreen);
  };

  // Auto-slide for banner
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const isSingleVehicle = vehicles.length === 1;

  // Filter vehicles based on search query
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plateOnly.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle vehicle navigation
  const handleVehiclePress = (vehicle: Vehicle) => {
    router.push({
      pathname: '/screens/vehicle/vehicle-details',
      params: {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        deviceSerial: vehicle.deviceSerial
      }
    });
  };

  // Dropdown functions
  const toggleDropdown = () => {
    if (!isDropdownVisible) {
      setIsDropdownVisible(true);
      Animated.timing(dropdownAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dropdownAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsDropdownVisible(false));
    }
  };

  const handleProfilePress = () => {
    Animated.timing(dropdownAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsDropdownVisible(false);
      router.push('/screens/profile/profile');
    });
  };

  const handleLogoutPress = () => {
    dropdownAnimation.setValue(0); // Immediately hide dropdown
    setIsDropdownVisible(false);
    setIsLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      // Determine which notification service is being used
      const usePushy = await PushyService.shouldUsePushy();

      if (usePushy) {
        // Get current Pushy token before logout
        const currentToken = await PushyService.getCurrentToken();

        await signOut(auth);

        // Delete Pushy token from device and database to prevent notifications after logout
        if (currentToken) {
          await PushyService.deleteToken();
          await PushyPostgresService.removePushyToken(currentToken);
        }
      } else {
        // Get current FCM token before logout
        const currentToken = await FCMService.getCurrentToken();

        await signOut(auth);

        // Delete FCM token from device and database to prevent notifications after logout
        if (currentToken) {
          await FCMService.deleteToken();
          await FCMPostgresService.removeFCMToken(currentToken);
        }
      }

      setIsLogoutModalVisible(false);
      setIsDropdownVisible(false);

    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
  <SafeAreaView className="flex-1 px-4" style={{ position: 'relative' }}>
    {isFullScreen && (
  <TouchableWithoutFeedback onPress={toggleFullScreen}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45 }} />
  </TouchableWithoutFeedback>
)}
      {/* Backdrop to close dropdown on outside tap */}
     {isDropdownVisible && (
  <TouchableWithoutFeedback onPress={() => {
    setIsDropdownVisible(false);
    Animated.timing(dropdownAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} />
  </TouchableWithoutFeedback>
)}

      <View className="flex-row justify-between items-center px-4 py-4">
        <Text className="text-3xl font-bold">
          {getGreeting()}, {'\n'}{name?.split(' ')[0] || 'User'} 😁
        </Text>

        <View className="flex-row items-center">
          <Pressable
            className="relative mr-4"
            onPress={() => router.push('/alerts')}
          >
            <Ionicons name="notifications-outline" size={32} color="black" />
          </Pressable>
          <View className="relative">
            <Pressable
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              onPress={toggleDropdown}
            >
              <Image
                source={require('../../assets/images/user.png')}
                className="w-12 h-12 rounded-full border-2 border-gray-300"
              />
            </Pressable>

            {/* Dropdown Menu */}
            <Animated.View
              style={{
                opacity: dropdownAnimation,
                transform: [{
                  translateY: dropdownAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                }],
              }}
              className="absolute top-14 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-48"
            >
              <Pressable
                className="flex-row items-center px-4 py-3 border-b border-gray-100"
                onPress={handleProfilePress}
              >
                <Ionicons name="person-outline" size={20} color="gray" />
                <Text className="ml-3 text-gray-700">Profile</Text>
              </Pressable>
              <Pressable
                className="flex-row items-center px-4 py-3"
                onPress={handleLogoutPress}
              >
                <Ionicons name="log-out-outline" size={20} color="gray" />
                <Text className="ml-3 text-gray-700">Logout</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>

        <View className="flex-1">
          {/* Banner/Slider */}
          <View
            className={isSmallScreen ? 'h-24 w-full rounded-2xl px-6 py-4 flex-row items-center mt-4' : 'h-32 w-full rounded-2xl px-6 py-6 flex-row items-center mt-4'}
            style={{ backgroundColor: sliderData[currentSlide].backgroundColor }}
          >
            <View className="flex-1">
              <Text className={isSmallScreen ? 'text-white text-lg font-bold' : 'text-white text-xl font-bold'}>
                {sliderData[currentSlide].title}
              </Text>
            </View>
            <View className="items-center justify-center ml-4">
              <Ionicons
                name={sliderData[currentSlide].icon as any}
                size={isSmallScreen ? 32 : 40}
                color="rgba(255,255,255,0.8)"
              />
            </View>
          </View>

          {/* Search Bar - Only show if multiple vehicles */}
          {!isSingleVehicle && vehicles.length > 0 && (
            <View className="mt-4">
              <View className="flex-row items-center bg-white rounded-full px-4 border border-gray-400">
                <TextInput
                  placeholder="search vehicle"
                  placeholderTextColor="gray"
                  style={{color:'black'}}
                  className="flex-1 ml-2"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Ionicons name="search" size={20} color="gray" />
              </View>
            </View>
          )}

          <Text className="text-xl font-bold mt-4 px-4">Your Vehicle(s) Current Position</Text>

          {/* Map Section */}
       {isFullScreen ? (
  <View className="absolute inset-0 z-50 bg-white">
    <MapView
      style={{ flex: 1 }}
      region={getMapRegion()}
      onPress={toggleFullScreen}
    >
                {vehicles.map((vehicle) => {
                  const coords = vehicleCoordinates[vehicle.id];
                  const speed = vehicleSpeeds[vehicle.id] || 0;
                  
                  if (!coords) return null;

                  return (
                    <Marker
                      key={vehicle.id}
                      coordinate={coords}
                      title={vehicle.shortName}
                      description={`${getVehicleStatus(speed)} - ${speed} km/h`}
                    >
                      <CustomMarker speed={speed} title={vehicle.shortName} />
                    </Marker>
                  );
                })}
              </MapView>
              <Pressable
                className="absolute top-10 right-4 bg-black bg-opacity-50 rounded-full p-2"
                onPress={toggleFullScreen}
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
          ) : (
           <Pressable onPress={toggleFullScreen} style={{ position: 'relative' }}>
  <MapView
    style={isSingleVehicle ?
      { height: isSmallScreen ? 200 : 300, marginHorizontal: 16, marginTop: 8, borderRadius: 8 } :
      { height: isSmallScreen ? 120 : 192, marginHorizontal: 16, marginTop: 8, borderRadius: 8 }
    }
    region={getMapRegion()}
    scrollEnabled={false}
    zoomEnabled={false}
  >
                {vehicles.map((vehicle) => {
                  const coords = vehicleCoordinates[vehicle.id];
                  const speed = vehicleSpeeds[vehicle.id] || 0;
                  
                  if (!coords) return null;

                  return (
                    <Marker
                      key={vehicle.id}
                      coordinate={coords}
                      title={vehicle.shortName}
                      description={`${getVehicleStatus(speed)} - ${speed} km/h`}
                    >
                      <CustomMarker speed={speed} title={vehicle.shortName} />
                    </Marker>
                  );
                })}
              </MapView>
            </Pressable>
          )}

          {/* Vehicles List */}
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#182f51" />
              <Text className="text-gray-500 mt-4">Loading your vehicles...</Text>
            </View>
          ) : filteredVehicles.length > 0 ? (
            <View style={{ flex: 1 }}>
             {filteredVehicles.length > 1 && (
  <Pressable
    className="bg-white rounded-lg p-2 mx-2 mt-4 shadow-md z-40"
    onPress={() => setIsVehicleListModalVisible(true)}
    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    pointerEvents="box-only"
  >
                  <View className="flex-row items-center justify-center">
                    <Text className="text-gray-600 text-sm mr-2">View all {filteredVehicles.length} vehicles</Text>
                    <Ionicons name="chevron-down" size={20} color="gray" />
                  </View>
                </Pressable>
              )}

              <ScrollView
                className="mt-2"
                style={{ flex: 1 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
              >
                {filteredVehicles.map((vehicle) => {
                  const speed = vehicleSpeeds[vehicle.id] || 0;
                  const status = getVehicleStatus(speed);
                  const pinColor = getPinColor(speed);

                  return (
                    <Pressable
                      key={vehicle.id}
                      className="bg-white rounded-lg p-4 m-2 shadow-md flex-row items-center"
                      onPress={() => handleVehiclePress(vehicle)}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name="car"
                          size={40}
                          color={pinColor}
                        />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="text-lg font-bold">{vehicle.shortName}</Text>
                        <Text className="text-gray-600">{vehicle.plateOnly}</Text>
                        <Text className="text-gray-600">{status} - {speed} km/h</Text>
                      </View>
                      <View
                        style={{ backgroundColor: pinColor }}
                        className="w-3 h-3 rounded-full ml-2"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-10">
              <Ionicons name="car-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No vehicles found</Text>
              <Text className="text-gray-400 text-center mt-2">
                {vehicles.length === 0 ? 'Your vehicles will appear here once added to your account' : 'No vehicles match your search'}
              </Text>
            </View>
          )}
        </View>

      {/* Vehicle List Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isVehicleListModalVisible}
        onRequestClose={() => setIsVehicleListModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-2xl font-bold">Your Vehicles</Text>
            <Pressable onPress={() => setIsVehicleListModalVisible(false)}>
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4">
            {filteredVehicles.map((vehicle) => {
              const speed = vehicleSpeeds[vehicle.id] || 0;
              const status = getVehicleStatus(speed);
              const pinColor = getPinColor(speed);

              return (
                <Pressable
                  key={vehicle.id}
                  className="bg-white rounded-lg p-4 my-2 shadow-md flex-row items-center border border-gray-100"
                  onPress={() => {
                    handleVehiclePress(vehicle);
                    setIsVehicleListModalVisible(false);
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="car"
                      size={40}
                      color={pinColor}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-bold">{vehicle.shortName}</Text>
                    <Text className="text-gray-600">{vehicle.plateOnly}</Text>
                    <Text className="text-gray-600">{status} - {speed} km/h</Text>
                  </View>
                  <View
                    style={{ backgroundColor: pinColor }}
                    className="w-3 h-3 rounded-full ml-2"
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <Text className="text-lg font-bold text-center mb-4">Confirm Logout</Text>
            <Text className="text-gray-600 text-center mb-6">Are you sure you want to logout?</Text>
            <View className="flex-row justify-between">
              <Pressable
                className="flex-1 bg-gray-200 rounded-lg py-3 mr-2"
                onPress={() => setIsLogoutModalVisible(false)}
              >
                <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-red-500 rounded-lg py-3 ml-2"
                onPress={confirmLogout}
              >
                <Text className="text-white text-center font-semibold">Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}