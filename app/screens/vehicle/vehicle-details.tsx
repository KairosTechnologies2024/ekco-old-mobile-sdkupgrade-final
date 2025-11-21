import LeafletMap from '@/components/LeafletMap';
import { MapService } from '@/services/mapService';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebase';

interface Vehicle {
  id: string;
  label: string;
  shortLabel: string;
  value: string;
  deviceSerial: string;
  vehicleModel: string;
  vehiclePlate: string;
}

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { vehicleId } = useLocalSearchParams();
  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700; // Threshold for small screens

  // State
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [address, setAddress] = useState("What's my address?");
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [vehicleLongitude, setVehicleLongitude] = useState(28.0473); // Default to Johannesburg
  const [vehicleLatitude, setVehicleLatitude] = useState(-26.2041); // Default to Johannesburg
  const [speed, setSpeed] = useState("0");
  const [engine, setEngine] = useState("Off");
  const [isLoading, setIsLoading] = useState(true);
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);

  // Set header title to vehicle name
  useEffect(() => {
    if (selectedVehicle) {
      navigation.setOptions({
        title: selectedVehicle.shortLabel,
      });
    }
  }, [selectedVehicle, navigation]);

  // Get vehicle details
  useEffect(() => {
    const getVehicle = async () => {
      try {
        setIsLoading(true);
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId || !vehicleId) {
          setIsLoading(false);
          return;
        }

        const results = await getDocs(
          query(collection(db, "vehicles"),
          where("userId", "==", currentUserId),
          where("__name__", "==", vehicleId))
        );

        if (!results.empty) {
          const doc = results.docs[0];
          const vehicle = {
            id: doc.id,
            label: `${doc.data().vehicleModel} - ${doc.data().vehiclePlate}`,
            shortLabel: doc.data().vehicleModel,
            value: doc.data().vehiclePlate,
            deviceSerial: doc.data().deviceSerial,
            vehicleModel: doc.data().vehicleModel,
            vehiclePlate: doc.data().vehiclePlate,
          };
          setSelectedVehicle(vehicle);
        } else {
          Alert.alert("Error", "Vehicle not found");
          router.back();
        }
      } catch (error) {
        console.error("Error getting vehicle:", error);
        Alert.alert("Error", "Failed to load vehicle details");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    const checkMapService = async () => {
      const useGoogle = await MapService.shouldUseGoogleMaps();
      setUseGoogleMaps(useGoogle);
    };

    getLocationPermission();
    getVehicle();
    checkMapService();
  }, [vehicleId]);

  // Force Leaflet for testing
  useEffect(() => {
    setUseGoogleMaps(false);
  }, []);

  // Real-time GPS data subscription
  useEffect(() => {
    if (!selectedVehicle?.deviceSerial) return;

    const gpsQ = query(
      collection(db, "gps"),
      where("serialNumber", "==", selectedVehicle.deviceSerial),
      orderBy("rawDate", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(gpsQ, (querySnapshot) => {
      const res: any[] = [];
      querySnapshot.forEach((doc) => {
        res.push(doc.data());
      });

      if (querySnapshot.docs.length === 0) {
        Alert.alert(
          "No GPS data",
          `${selectedVehicle.shortLabel} does not have a device that supports GPS.`
        );
        return;
      }

      setGpsData(res);

      if (res.length > 0) {
        const newLat = parseFloat(res[0].lat);
        const newLng = parseFloat(res[0].long);

        setVehicleLongitude(newLng);
        setVehicleLatitude(newLat);

        // Update route coordinates
        setRouteCoordinates(prev => {
          const newCoords = [...prev, { latitude: newLat, longitude: newLng }];
          return newCoords.slice(-10);
        });
      }
    });

    return () => unsubscribe();
  }, [selectedVehicle]);

  // Real-time speed data
  useEffect(() => {
    if (!selectedVehicle?.deviceSerial) return;

    const speedQ = query(
      collection(db, "speed"),
      where("serialNumber", "==", selectedVehicle.deviceSerial),
      orderBy("rawDate", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(speedQ, (querySnapshot) => {
      const res: any[] = [];
      querySnapshot.forEach((doc) => {
        res.push(doc.data());
      });

      if (querySnapshot.docs.length > 0 && selectedVehicle.deviceSerial === res[0].serialNumber) {
        setSpeed(res[0].speed?.split(".")[0] || "0");
      }
    });

    return () => unsubscribe();
  }, [selectedVehicle]);

  // Real-time engine data
  useEffect(() => {
    if (!selectedVehicle?.deviceSerial) return;

    const ignitionQ = query(
      collection(db, "ignition"),
      where("serialNumber", "==", selectedVehicle.deviceSerial),
      orderBy("rawDate", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(ignitionQ, (querySnapshot) => {
      const res: any[] = [];
      querySnapshot.forEach((doc) => {
        res.push(doc.data());
      });

      if (querySnapshot.docs.length > 0 && selectedVehicle.deviceSerial === res[0].serialNumber) {
        setEngine(res[0].status || "Off");
      }
    });

    return () => unsubscribe();
  }, [selectedVehicle]);

  // Location permission
  async function getLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync({
      ios: {
        message: 'This app uses location services to display vehicle data on a map.'
      },
    });

    if (status !== 'granted') {
      alert('Please ensure this application has access to your location services.');
      return;
    }
  }

  // Get address from coordinates
  const getAddress = async (lat: number, long: number) => {
    try {
      const vehicleLocation = await Location.reverseGeocodeAsync({
        longitude: long,
        latitude: lat,
      });
      
      let displayAddress = `${lat.toFixed(5)}, ${long.toFixed(5)}`;
      if (vehicleLocation.length > 0) {
        const location = vehicleLocation[0];
        const streetNumber = location.streetNumber ? location.streetNumber + ' ' : '';
        const street = location.street ?? '';
        const city = location.city ? ', ' + location.city : '';
        displayAddress = `${streetNumber}${street}${city}`.trim();
      }
      setAddress(displayAddress);
      setActionsModalVisible(true);
    } catch (e) {
      console.log('Error getting address:', e);
      Alert.alert('Error', 'Failed to get address');
    }
  };

  const derivedStatus = parseInt(speed) > 0 ? 'Moving' : 'Parked';

  // Show loading screen while data is being fetched
  if (isLoading || !selectedVehicle || gpsData.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#182f51" />
        <Text className="text-gray-500 mt-4">
          {!selectedVehicle ? "Loading vehicle details..." : "Waiting for GPS data..."}
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Map Container */}
      <View className="flex-1 relative">
        {useGoogleMaps ? (
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: vehicleLatitude,
              longitude: vehicleLongitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            followsUserLocation
            showsUserLocation
          >
            <Marker
              coordinate={{ latitude: vehicleLatitude, longitude: vehicleLongitude }}
              title={selectedVehicle.shortLabel}
              description={derivedStatus}
              pinColor={derivedStatus === 'Moving' ? '#3b82f6' : '#ef4444'}
            />
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#000"
                strokeWidth={3}
              />
            )}
          </MapView>
        ) : (
          <LeafletMap
            center={{ lat: vehicleLatitude, lng: vehicleLongitude }}
            markers={[{
              lat: vehicleLatitude,
              lng: vehicleLongitude,
              title: selectedVehicle.shortLabel,
              description: derivedStatus,
              color: derivedStatus === 'Moving' ? '#3b82f6' : '#ef4444'
            }]}
            polylines={routeCoordinates.length > 1 ? [{
              coordinates: routeCoordinates.map(c => ({ lat: c.latitude, lng: c.longitude })),
              color: '#000',
              weight: 3
            }] : []}
            zoom={16}
            style={{ flex: 1 }}
          />
        )}

        {/* Status Badge */}
        <View className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-md">
          <Text className="text-sm font-bold">
            {derivedStatus === 'Moving' ? '🚗 Moving' : '🅿️ Parked'}
          </Text>
          <Text className="text-xs text-gray-600">
            {speed} km/h
          </Text>
        </View>
      </View>

      {/* Bottom Details */}
      <View style={{ paddingBottom: insets.bottom }} className="bg-primary-background-color text-white p-4 rounded-t-lg shadow-lg">
        <View className="flex-row items-center mb-4">
          <Ionicons name="car" size={40} color="#fff" />
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-white">{selectedVehicle.shortLabel}</Text>
            <Text className="text-white text-sm">
              {address !== "What's my address?" ? address : `${vehicleLatitude.toFixed(5)}, ${vehicleLongitude.toFixed(5)}`}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Ionicons 
              name={engine === 'On' ? 'flash' : 'flash-off'} 
              size={16} 
              color={engine === 'On' ? '#10b981' : '#ef4444'} 
            />
            <Text className="text-sm text-white ml-2">Ignition: {engine}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="speedometer" size={16} color="#fff" />
            <Text className="text-sm text-white ml-2">Speed: {speed} km/h</Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm text-white">Vehicle Registration: {selectedVehicle.vehiclePlate}</Text>
        {/*   <Text className="text-sm text-white">Battery: Connected</Text> */}
        </View>

        <View className="flex-row space-x-3">
          {isSmallScreen ? (
            <Pressable
              onPress={() => setAddressModalVisible(true)}
              className="bg-accent-color p-3 rounded-lg flex-1"
            >
              <Text className="text-white text-center font-bold">View Address</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => getAddress(vehicleLatitude, vehicleLongitude)}
              className="bg-accent-color p-3 rounded-lg flex-1"
            >
              <Text className="text-white text-center font-bold">Get Address</Text>
            </Pressable>
          )}
        </View>

        {!isSmallScreen && address !== "What's my address?" && (
          <View className="mt-2 p-2 bg-white/10 rounded-lg">
            <Text className="text-sm text-white">{address}</Text>
          </View>
        )}

        {/* Address Modal for Small Screens */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addressModalVisible}
          onRequestClose={() => setAddressModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black bg-opacity-50">
            <View className="bg-white rounded-t-lg p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold">Vehicle Address</Text>
                <Pressable onPress={() => setAddressModalVisible(false)}>
                  <Ionicons name="close" size={24} color="black" />
                </Pressable>
              </View>

              <ScrollView className="max-h-40">
                <Text className="text-gray-700 text-base">
                  {address !== "What's my address?" ? address : `${vehicleLatitude.toFixed(5)}, ${vehicleLongitude.toFixed(5)}`}
                </Text>
              </ScrollView>

              <Pressable
                onPress={async () => {
                  await getAddress(vehicleLatitude, vehicleLongitude);
                  setAddressModalVisible(false);
                }}
                className="bg-accent-color p-3 rounded-lg mt-4"
              >
                <Text className="text-white text-center font-bold">Refresh Address</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Centered Actions Popup */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={actionsModalVisible}
          onRequestClose={() => setActionsModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View className="bg-white rounded-xl p-6 w-11/12 max-w-md">
              <Text className="text-lg font-bold mb-3">Vehicle Address</Text>
              <ScrollView className="max-h-40 mb-4">
                <Text selectable className="text-gray-700 text-base">
                  {address !== "What's my address?" ? address : `${vehicleLatitude.toFixed(5)}, ${vehicleLongitude.toFixed(5)}`}
                </Text>
              </ScrollView>
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={async () => {
                    const text = address !== "What's my address?" ? address : `${vehicleLatitude.toFixed(5)}, ${vehicleLongitude.toFixed(5)}`;
                    await Clipboard.setStringAsync(text);
                    Alert.alert('Copied', 'Address copied to clipboard');
                  }}
                  className="flex-1 bg-primary-background-color p-3 rounded-lg"
                >
                  <Text className="text-white text-center font-bold">Copy</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const text = address !== "What's my address?" ? address : `${vehicleLatitude.toFixed(5)}, ${vehicleLongitude.toFixed(5)}`;
                    try {
                      await Share.share({ message: text });
                    } catch (err) {
                      console.log('Share error', err);
                      Alert.alert('Error', 'Unable to share right now');
                    }
                  }}
                  className="flex-1 bg-accent-color p-3 rounded-lg"
                >
                  <Text className="text-white text-center font-bold">Share</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setActionsModalVisible(false)}
                className="mt-4 p-3 rounded-lg border border-gray-300"
              >
                <Text className="text-center font-semibold">Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
