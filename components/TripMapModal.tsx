import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reverseGeocode } from '../app/services/geocodingService';

// Interfaces
interface GPSLog {
  latitude: number;
  longitude: number;
  date: string;
}

interface Trip {
  id: string;
  displayDate: string;
  date: Date;
  rawDate: any;
  gpsLogs?: GPSLog[];
}

interface MapModalProps {
  trip: Trip;
  vehicleName: string;
  onClose: () => void;
}

interface GeocodingResult {
  address: string;
  provider: 'google' | 'locationiq' | 'nominatim' | 'opencage' | 'coordinates';
  success: boolean;
}

// Custom Marker Components
const StartMarker = () => (
  <View className="items-center justify-center">
    <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center border-2 border-white shadow-lg">
      <Text className="text-white font-bold text-xs">S</Text>
    </View>
    <View className="w-2 h-2 bg-green-500 rotate-45 -mt-1" />
  </View>
);

const EndMarker = () => (
  <View className="items-center justify-center">
    <View className="w-8 h-8 bg-red-500 rounded-full items-center justify-center border-2 border-white shadow-lg">
      <Text className="text-white font-bold text-xs">E</Text>
    </View>
    <View className="w-2 h-2 bg-red-500 rotate-45 -mt-1" />
  </View>
);



// Utility functions
const calculateRegion = (coordinates: GPSLog[]): Region => {
  if (coordinates.length === 0) {
    return {
      latitude: -33.9249,
      longitude: 18.4241,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  const latitudeDelta = Math.max((maxLat - minLat) * 1.2, 0.01);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.2, 0.01);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Main MapModal Component
const TripMapModal = ({ trip, vehicleName, onClose }: MapModalProps) => {
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [startAddress, setStartAddress] = useState<string>('');
  const [endAddress, setEndAddress] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [geocodingProvider, setGeocodingProvider] = useState<string>('');

  useEffect(() => {
    if (trip.gpsLogs && trip.gpsLogs.length > 0) {
      const region = calculateRegion(trip.gpsLogs);
      setMapRegion(region);
      loadAddresses();
    }
  }, [trip.gpsLogs]);

  const loadAddresses = async () => {
    if (!trip.gpsLogs || trip.gpsLogs.length === 0) {
      setIsLoadingAddresses(false);
      return;
    }

    try {
      const startCoord = trip.gpsLogs[0];
      const endCoord = trip.gpsLogs[trip.gpsLogs.length - 1];

      // Get addresses in parallel
      const [startResult, endResult] = await Promise.all([
        reverseGeocode(startCoord.latitude, startCoord.longitude),
        reverseGeocode(endCoord.latitude, endCoord.longitude)
      ]);

      setStartAddress(startResult.address);
      setEndAddress(endResult.address);
      setGeocodingProvider(startResult.provider);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      // Fallback to coordinates
      const startCoord = trip.gpsLogs[0];
      const endCoord = trip.gpsLogs[trip.gpsLogs.length - 1];
      setStartAddress(`Coordinates: ${startCoord.latitude.toFixed(6)}, ${startCoord.longitude.toFixed(6)}`);
      setEndAddress(`Coordinates: ${endCoord.latitude.toFixed(6)}, ${endCoord.longitude.toFixed(6)}`);
      setGeocodingProvider('coordinates');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleMapError = () => {
    console.log('Map error occurred, re-rendering...');
    setMapKey(prev => prev + 1);
  };

  const handleMapPress = () => {
    // Empty handler to prevent crashes
  };

  const handlePanDrag = () => {
    // Empty handler to prevent crashes
  };

  if (!trip.gpsLogs || trip.gpsLogs.length === 0) {
    return (
      <Modal visible animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">Trip Route</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 justify-center items-center">
            <Ionicons name="location-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-lg mt-4">No GPS Data</Text>
            <Text className="text-gray-400 text-center mt-2">
              This trip doesn't have GPS data available
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const startCoord = trip.gpsLogs[0];
  const endCoord = trip.gpsLogs[trip.gpsLogs.length - 1];
  const distance = calculateDistance(
    startCoord.latitude,
    startCoord.longitude,
    endCoord.latitude,
    endCoord.longitude
  );

  return (
    <Modal visible animationType="slide">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Trip Route</Text>
            <Text className="text-gray-600 text-sm mt-1">
              {formatDate(trip.date)}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View className="flex-1 relative">
          <MapView
            key={mapKey}
            style={{ flex: 1 }}
            region={mapRegion || undefined}
            initialRegion={mapRegion || undefined}
            showsUserLocation={false}
            showsMyLocationButton={true}
            showsCompass={true}
            showsScale={true}
            onPress={handleMapPress}
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={true}
            pitchEnabled={false}
          >
            {/* Start Marker */}
            <Marker
              coordinate={startCoord}
              title="Start Point"
              description={`Started: ${formatDate(trip.date)}`}
              identifier="start"
            >
              <StartMarker />
            </Marker>

            {/* End Marker */}
            <Marker
              coordinate={endCoord}
              title="End Point"
              description={`Distance: ${distance} km`}
              identifier="end"
            >
              <EndMarker />
            </Marker>

            {/* Route Polyline - only render if we have multiple points */}
            {trip.gpsLogs.length > 1 && (
              <Polyline
                coordinates={trip.gpsLogs}
                strokeColor="#3b82f6"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </MapView>

          {/* Map Controls Overlay */}
          <View className="absolute top-4 right-4">
            <View className="bg-white rounded-lg shadow-lg p-3">
              <Text className="text-xs font-medium text-gray-700 mb-2">Legend</Text>
              <View className="flex-row items-center mb-2">
                <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <Text className="text-xs text-gray-700">Start Point</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                <Text className="text-xs text-gray-700">End Point</Text>
              </View>
            </View>
          </View>

          {/* Loading Overlay */}
          {isLoadingAddresses && (
            <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
              <View className="bg-white rounded-xl p-6 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-700 mt-3 font-medium">Loading addresses...</Text>
                <Text className="text-gray-500 text-sm mt-1">Getting location details</Text>
              </View>
            </View>
          )}
        </View>

        {/* Trip Information Footer */}
        <View className="p-4 border-t border-gray-200 bg-gray-50">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {vehicleName}
              </Text>
              <Text className="text-gray-500 text-sm">
                {trip.displayDate}
              </Text>
            </View>
            <View className="bg-blue-100 px-3 py-2 rounded-full">
              <Text className="text-blue-700 text-sm font-medium">
                {distance} km
              </Text>
            </View>
          </View>
          
          {/* Start Location */}
          <View className="mb-3">
            <View className="flex-row items-center mb-2">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-gray-600 text-sm font-medium">Start Location</Text>
            </View>
            {isLoadingAddresses ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-gray-400 text-xs ml-2">Loading address...</Text>
              </View>
            ) : (
              <Text className="text-gray-800 text-sm leading-5" numberOfLines={2}>
                {startAddress}
              </Text>
            )}
          </View>

          {/* End Location */}
          <View className="mb-3">
            <View className="flex-row items-center mb-2">
              <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
              <Text className="text-gray-600 text-sm font-medium">End Location</Text>
            </View>
            {isLoadingAddresses ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-gray-400 text-xs ml-2">Loading address...</Text>
              </View>
            ) : (
              <Text className="text-gray-800 text-sm leading-5" numberOfLines={2}>
                {endAddress}
              </Text>
            )}
          </View>

          {/* Footer Stats */}
          <View className="flex-row justify-between items-center pt-3 border-t border-gray-200">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">
                {trip.gpsLogs.length} GPS points
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="navigate-outline" size={14} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">
                {trip.gpsLogs.length > 1 ? 'Route mapped' : 'Single location'}
              </Text>
            </View>

            {geocodingProvider && geocodingProvider !== 'coordinates' && (
              <View className="flex-row items-center">
                <Ionicons name="map-outline" size={14} color="#6b7280" />
                <Text className="text-gray-500 text-xs ml-1 capitalize">
                  {geocodingProvider}
                </Text>
              </View>
            )}
          </View>

          
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TripMapModal;