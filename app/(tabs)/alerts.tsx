import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebase';

import { SafeAreaView } from 'react-native-safe-area-context';
export default function Alerts() {
  // State from Firebase logic
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get vehicles list from Firebase
  useEffect(() => {
    const getVehicles = async () => {
      try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const results = await getDocs(
          query(collection(db, "vehicles"), where("userId", "==", currentUserId))
        );

        const vehiclesData = [{
          id: 'all',
          name: 'All Vehicles',
          vehiclePlate: 'all'
        }];

        results.docs.forEach((v) => {
          const data = v.data();
          vehiclesData.push({
            id: v.id,
            name: `${data.vehicleModel} - ${data.vehiclePlate}`,
            vehicleModel: data.vehicleModel,
            vehiclePlate: data.vehiclePlate,
          });
        });
        setVehicles(vehiclesData);
        
        // Auto-select first vehicle if available
        if (vehiclesData.length > 1 && !selectedVehicle) {
          setSelectedVehicle(vehiclesData[1].vehiclePlate);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    getVehicles();
  }, []);

  // Real-time alerts subscription from Firebase
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "alerts"),
      where("userId", "==", currentUserId),
      orderBy("rawDate", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const alertsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          alertsData.push({ 
            id: doc.id, 
            ...data 
          });
        });

        // Sort by rawDate
        alertsData.sort((a, b) => b.rawDate - a.rawDate);
        setAlerts(alertsData);
        filterAlerts(alertsData, selectedVehicle);
        setIsLoading(false);
      },
      (error) => {
        console.error('Alerts listener error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter alerts when vehicle selection changes
  useEffect(() => {
    filterAlerts(alerts, selectedVehicle);
  }, [selectedVehicle, alerts]);

  const filterAlerts = (alertsData, vehicleFilter) => {
    if (vehicleFilter === 'all') {
      setFilteredAlerts(alertsData);
    } else {
      const filtered = alertsData.filter(alert => alert.vehiclePlate === vehicleFilter);
      setFilteredAlerts(filtered);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getIconName = (alertType: string) => {
    const lc = (alertType ?? '').toString().toLowerCase();
    if (lc.includes('ignition')) return 'key';
    if (lc.includes('door')) return 'lock-open';
    if (lc.includes('jamming') || lc.includes('remote jamming')) return 'radio';
    if (lc.includes('smash') || lc.includes('grab')) return 'shield';
    if (lc.includes('battery') || lc.includes('disconnected')) return 'battery-half';
    return 'alert-circle';
  };

  const isCriticalAlert = (alert: any) => {
    const alertText = alert.alert || alert.message || '';
    const lcTitle = alertText.toLowerCase();
    return lcTitle.endsWith('detected') || 
           lcTitle.endsWith('disconnected') || 
           lcTitle.includes('disconnected') || 
           lcTitle.includes('smash') || 
           lcTitle.includes('jamming');
  };

  const formatTimestamp = (rawDate: any) => {
    if (!rawDate) return 'Unknown time';
    
    try {
      const timestamp = typeof rawDate === 'object' && rawDate.toDate ? 
        rawDate.toDate() : new Date(rawDate);
      
      return timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getAlertDisplayData = (alert: any) => {
    const alertType = alert.alert || alert.type || alert.alertType || 'Unknown Alert';
    const message = alert.message || alert.alertMessage || alertType;
    const vehiclePlate = alert.vehiclePlate || alert.carId || 'Unknown Vehicle';
    
    return { alertType, message, vehiclePlate };
  };

  const criticalCount = filteredAlerts.filter(isCriticalAlert).length;
  const selectedVehicleName = vehicles.find(vehicle => vehicle.vehiclePlate === selectedVehicle)?.name || 'Select Car';

  return (
    <SafeAreaView className='flex-1' edges={['left', 'right', 'bottom']}>
      <ScrollView 
        className="flex-1 p-4 bg-white"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#182f51']}
            tintColor={'#182f51'}
          />
        }
      >
        {/* Vehicle Selector - Clean styling from your design */}
        <TouchableOpacity
          onPress={() => setDropdownOpen(!dropdownOpen)}
          className="mb-4 px-4 py-2 border border-gray-300 rounded bg-gray-100 flex-row justify-between items-center"
        >
          <Text className="font-medium">{selectedVehicleName}</Text>
          <View className="flex-row items-center">
            {criticalCount > 0 && (
              <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{criticalCount}</Text>
              </View>
            )}
            <Text>▼</Text>
          </View>
        </TouchableOpacity>
        
        {dropdownOpen && (
          <View className="mb-4 border border-gray-300 rounded bg-white shadow-sm">
            {vehicles.map(vehicle => (
              <TouchableOpacity
                key={vehicle.id}
                onPress={() => {
                  setSelectedVehicle(vehicle.vehiclePlate);
                  setDropdownOpen(false);
                }}
                className="px-4 py-3 border-b border-gray-200 flex-row justify-between items-center"
              >
                <Text className="font-medium">{vehicle.name}</Text>
                <Text className="text-xs text-gray-500">
                  {vehicle.vehiclePlate === 'all' ? 'All' : 'Live'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Alerts List - Clean styling from your design */}
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#182f51" />
            <Text className="text-gray-500 mt-2">Loading alerts...</Text>
          </View>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const { alertType, message, vehiclePlate } = getAlertDisplayData(alert);
            const isCritical = isCriticalAlert(alert);

            return (
              <View 
                key={alert.id} 
                className={`mb-3 p-4 border rounded flex-row items-center ${
                  isCritical 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <Ionicons
                  name={getIconName(alertType)}
                  size={22}
                  color={isCritical ? '#DC2626' : '#4B5563'}
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className={`font-semibold text-base ${
                    isCritical ? 'text-red-600' : 'text-gray-800'
                  }`}>
                    {alertType}
                  </Text>
                  <Text className="text-gray-600 mt-1">{message}</Text>
                  {vehiclePlate && vehiclePlate !== 'Unknown Vehicle' && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Vehicle: {vehiclePlate}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-500 mt-2">
                    {formatTimestamp(alert.rawDate)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View className="py-8 items-center">
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text className="text-gray-500 mt-2 text-lg">No alerts</Text>
            <Text className="text-gray-400 text-center mt-1">
              {selectedVehicle === 'all' 
                ? 'No alerts found for your vehicles' 
                : 'No alerts found for this vehicle'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}