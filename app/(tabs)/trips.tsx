import TripMapModal from '@/components/TripMapModal';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { reverseGeocode } from '../services/geocodingService';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCqZ5_9CEycIaYuhdYq4rDDnEVR1cnlHAA';

// Function to calculate distance between two coordinates in kilometers (Haversine formula)
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

// Format date for display
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Function to save CSV file
const saveCSVFile = async (csvContent: string, fileName: string) => {
  if (Platform.OS === 'web') {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    Alert.alert('Success', 'CSV file downloaded successfully!');
  } else {
    try {
      const htmlContent = `
        <html>
          <body>
            <pre>${csvContent}</pre>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export Trips CSV' });
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert('Success', 'CSV content generated successfully!');
    }
  }
};

interface Trip {
  id: string;
  displayDate: string;
  date: Date;
  endDate?: Date;
  rawDate: any;
  gpsLogs?: Array<{
    latitude: number;
    longitude: number;
    date: string;
    timestamp: number;
  }>;
  distance?: number;
  duration?: number;
  startAddress?: string;
  endAddress?: string;
}

interface ExportTrip {
  vehicle: string;
  startDate: string;
  endDate: string;
  startAddress: string;
  endAddress: string;
  distanceTravelled: string;
  duration: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
}

interface IgnitionEvent {
  id: string;
  status: 'on' | 'off';
  timestamp: number;
  rawDate: any;
  date?: string;
  serialNumber: string;
}

// Create stable trip ID to prevent duplicates
const createTripId = (startEvent: any, endEvent: any): string => {
  return `trip_${startEvent.rawDate}_${endEvent.rawDate}_${startEvent.serialNumber}`;
};

// Debounce function for search
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function Trips() {
  // State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeModal, setDateRangeModal] = useState(false);
  
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(true);

  // Check if API key is configured
  useEffect(() => {
    const isConfigured = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'AIzaSyCqZ5_9CEycIaYuhdYq4rDDnEVR1cnlHAA';
    setApiKeyConfigured(isConfigured);
  }, []);

  // Main function to get ALL trips without limits
  const getTripLogs = useCallback(async (deviceSerial: string, tripStart: Date, tripEnd: Date) => {
    setLoadingProgress(0);

    if (!deviceSerial) {
      console.log('No device serial provided');
      return;
    }

    if (isLoading) {
      console.log('⏸️  Load already in progress - skipping');
      return;
    }

    setIsLoading(true);
    setTrips([]);
    setFilteredTrips([]);
    
    try {
      const startTimestamp = tripStart.getTime();
      const endTimestamp = tripEnd.getTime();

      console.log('🔍 Fetching ALL trips for date range:', {
        deviceSerial,
        dateRange: {
          start: tripStart.toLocaleString(),
          end: tripEnd.toLocaleString(),
          startTimestamp,
          endTimestamp
        }
      });

      
      // Get ALL ignition events in date range - NO LIMITS
      const ignitionQuery = query(
        collection(db, 'ignition'),
        where('serialNumber', '==', deviceSerial),
        where('rawDate', '>=', startTimestamp),
        where('rawDate', '<=', endTimestamp),
        orderBy('rawDate', 'asc')
      );

      const ignitionResults = await getDocs(ignitionQuery);

      console.log('✅ Found ignition events:', ignitionResults.docs.length);

      if (ignitionResults.empty) {
        console.log('⏹️  No ignition events found in this date range');
        return;
      }

      const ignitionEvents: IgnitionEvent[] = ignitionResults.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().rawDate
      } as IgnitionEvent));

      // Log the actual date range coverage
      if (ignitionEvents.length > 0) {
        const firstEvent = new Date(ignitionEvents[0].timestamp);
        const lastEvent = new Date(ignitionEvents[ignitionEvents.length - 1].timestamp);
        console.log('📅 Complete date range coverage:', {
          first: firstEvent.toLocaleString(),
          last: lastEvent.toLocaleString(),
          coversRequestedRange: firstEvent >= tripStart && lastEvent <= tripEnd
        });
      }

      // Process ALL trips
      const newTrips: Trip[] = [];
      let currentTripStart: any = null;
      const tripPairs: Array<{on: any, off: any}> = [];

      console.log('🔄 Processing ignition events to find trip pairs...');
      
      for (const event of ignitionEvents) {
        if (event.status === 'on' && !currentTripStart) {
          currentTripStart = event;
        } else if (event.status === 'off' && currentTripStart) {
          const tripDuration = (event.timestamp - currentTripStart.timestamp) / (1000 * 60);
          // Include ALL trips regardless of duration for investigation
          if (tripDuration >= 0.1) { // Very minimal duration filter
            tripPairs.push({ on: currentTripStart, off: event });
          }
          currentTripStart = null;
        }
      }

      
      console.log('🔄 Found trip pairs:', tripPairs.length);

      // Process ALL trips with GPS data
      let processedCount = 0;
     
      for (const pair of tripPairs) {

        if (tripPairs.length > 0) {
          setLoadingProgress(Math.round((processedCount / tripPairs.length) * 100));
        } else {
          setLoadingProgress(0);
        }

        const tripStartTime = pair.on.timestamp;
        const tripEndTime = pair.off.timestamp;
        const tripDuration = Math.round((tripEndTime - tripStartTime) / (1000 * 60));

        try {
          // Get GPS data for this trip period - NO LIMITS
          const gpsQuery = query(
            collection(db, 'gps'),
            where('serialNumber', '==', deviceSerial),
            where('rawDate', '>=', tripStartTime),
            where('rawDate', '<=', tripEndTime),
            orderBy('rawDate', 'asc')
          );

          const gpsResults = await getDocs(gpsQuery);

          const gpsLogs = gpsResults.docs
            .map(gpsDoc => {
              const gpsData = gpsDoc.data();
              const lat = gpsData.lat || gpsData.latitude;
              const long = gpsData.long || gpsData.longitude;

              if (lat && long) {
                return {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(long),
                  date: gpsData.date || new Date(gpsData.rawDate).toISOString(),
                  timestamp: gpsData.rawDate
                };
              }
              return null;
            })
            .filter(Boolean) as Array<{ latitude: number; longitude: number; date: string; timestamp: number }>;

          // Include ALL trips with at least 1 GPS point for investigation
          if (gpsLogs.length >= 1) {
            // Calculate total mileage traveled along the GPS path
            let totalDistance = 0;
            if (gpsLogs.length >= 2) {
              for (let i = 0; i < gpsLogs.length - 1; i++) {
                const segmentDistance = calculateDistance(
                  gpsLogs[i].latitude,
                  gpsLogs[i].longitude,
                  gpsLogs[i + 1].latitude,
                  gpsLogs[i + 1].longitude
                );
                totalDistance += segmentDistance;
              }
            }
            const distance = parseFloat(totalDistance.toFixed(2));

            const tripId = createTripId(pair.on, pair.off);

            const trip: Trip = {
              id: tripId,
              displayDate: pair.on.date || formatDate(new Date(tripStartTime)),
              date: new Date(tripStartTime),
              endDate: new Date(tripEndTime),
              rawDate: tripStartTime,
              gpsLogs: gpsLogs,
              distance: distance,
              duration: tripDuration
            };
            newTrips.push(trip);
            processedCount++;
          }
        } catch (error) {
          console.warn('Error processing trip:', error);
          // Continue processing other trips even if one fails
        }

        // Update loading progress
        setLoadingProgress(Math.round((processedCount / tripPairs.length) * 100));
      }

      console.log('🎯 Successfully created trips:', newTrips.length, 'out of', tripPairs.length, 'pairs');

      // Sort trips by date (newest first) for better display
      const sortedTrips = newTrips.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTrips(sortedTrips);
      setFilteredTrips(sortedTrips);

      console.log('✅ Complete trip loading finished:', {
        totalTrips: sortedTrips.length,
        dateRange: `${tripStart.toLocaleDateString()} to ${tripEnd.toLocaleDateString()}`,
        vehicle: deviceSerial
      });

    } catch (error: any) {
      console.error('❌ Error fetching trips:', error);
      Alert.alert('Error', `Failed to load trip logs: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Filter trips based on search query - minimal filtering for investigation
  useEffect(() => {
    const filterTrips = () => {
      let filtered = trips;
      
      // Apply search filter only
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(trip => 
          trip.displayDate.toLowerCase().includes(query) ||
          formatDate(trip.date).toLowerCase().includes(query) ||
          (trip.distance && trip.distance.toString().includes(query)) ||
          (trip.duration && trip.duration.toString().includes(query)) ||
          (trip.startAddress && trip.startAddress.toLowerCase().includes(query)) ||
          (trip.endAddress && trip.endAddress.toLowerCase().includes(query))
        );
      }

      // Minimal quality filters for investigation - include everything
      filtered = filtered.filter(trip => 
        trip.gpsLogs && trip.gpsLogs.length >= 1 // Only require 1 GPS point
      );

      setFilteredTrips(filtered);
    };

    filterTrips();
  }, [searchQuery, trips]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    debounce((text: string) => {
      setSearchQuery(text);
    }, 300),
    []
  );

  // Handle vehicle selection
  const handleVehicleSelect = useCallback((vehicle: any) => {
    setSelectedVehicle(vehicle);
    setSearchQuery('');
    getTripLogs(vehicle.deviceSerial, startDate, endDate);
  }, [getTripLogs, startDate, endDate]);

  // Initialize vehicles and load first vehicle's trips
  useEffect(() => {
    const getVehicles = async () => {
      try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const results = await getDocs(
          query(collection(db, "vehicles"), where("userId", "==", currentUserId))
        );

        const vehiclesData = results.docs.map((v) => {
          const data = v.data();
          return {
            id: v.id,
            name: `${data.vehicleModel} - ${data.vehiclePlate}`,
            deviceSerial: data.deviceSerial,
            vehiclePlate: data.vehiclePlate,
            vehicleModel: data.vehicleModel,
          };
        });

        setVehicles(vehiclesData);
        
        // Auto-load first vehicle if not already loading
        if (vehiclesData.length > 0 && !selectedVehicle && !isLoading) {
          setSelectedVehicle(vehiclesData[0]);
          getTripLogs(vehiclesData[0].deviceSerial, startDate, endDate);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        Alert.alert('Error', 'Failed to load vehicles');
      }
    };

    getVehicles();
  }, [getTripLogs]);

  // Date picker handlers
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (selectedDate) {
      const newStartDate = new Date(selectedDate);
      newStartDate.setHours(0, 0, 0, 0);
      setStartDate(newStartDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    
    if (selectedDate) {
      const newEndDate = new Date(selectedDate);
      newEndDate.setHours(23, 59, 59, 999);
      setEndDate(newEndDate);
    }
  };

  const showStartPickerFromModal = () => {
    setShowStartDatePicker(true);
  };

  const showEndPickerFromModal = () => {
    setShowEndDatePicker(true);
  };

  // Apply custom date range
  const applyCustomDateRange = useCallback(() => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);

    if (selectedVehicle) {
      console.log('🔄 Applying custom date range for investigation:', {
        start: startDate.toLocaleString(),
        end: endDate.toLocaleString()
      });
      getTripLogs(selectedVehicle.deviceSerial, startDate, endDate);
    } else {
      Alert.alert('No Vehicle', 'Please select a vehicle first.');
    }
    
    setDateRangeModal(false);
  }, [selectedVehicle, startDate, endDate, getTripLogs]);

  // Apply quick date range
  const applyQuickDateRange = useCallback((days: number) => {
    const newEndDate = new Date();
    newEndDate.setHours(23, 59, 59, 999);
    
    const newStartDate = new Date();
    if (days === 0) {
      newStartDate.setHours(0, 0, 0, 0);
    } else {
      newStartDate.setDate(newStartDate.getDate() - days);
      newStartDate.setHours(0, 0, 0, 0);
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);

    if (selectedVehicle) {
      console.log('🔄 Applying quick date range for investigation:', {
        days,
        start: newStartDate.toLocaleString(),
        end: newEndDate.toLocaleString()
      });
      getTripLogs(selectedVehicle.deviceSerial, newStartDate, newEndDate);
    }
    setDateRangeModal(false);
  }, [selectedVehicle, getTripLogs]);

  // Handle trip selection for map view
  const handleTripSelect = (trip: Trip) => {
    if (trip.gpsLogs && trip.gpsLogs.length > 0) {
      setSelectedTrip(trip);
      setMapModal(true);
    } else {
      Alert.alert('No GPS Data', 'This trip does not have GPS data available.');
    }
  };

  // Prepare data for export
  const prepareExportData = async (): Promise<ExportTrip[]> => {
    const exportData: ExportTrip[] = [];

    if (filteredTrips.length > 10) {
      Alert.alert(
        'Processing Export',
        `Preparing ${filteredTrips.length} trips for export. This may take a moment...`
      );
    }

    for (let i = 0; i < filteredTrips.length; i++) {
      const trip = filteredTrips[i];

      if (trip.gpsLogs && trip.gpsLogs.length > 0) {
        const startCoord = trip.gpsLogs[0];
        const endCoord = trip.gpsLogs[trip.gpsLogs.length - 1];

        let startAddress = `Location (${startCoord.latitude.toFixed(6)}, ${startCoord.longitude.toFixed(6)})`;
        let endAddress = `Location (${endCoord.latitude.toFixed(6)}, ${endCoord.longitude.toFixed(6)})`;

        try {
          const [startResult, endResult] = await Promise.all([
            reverseGeocode(startCoord.latitude, startCoord.longitude),
            reverseGeocode(endCoord.latitude, endCoord.longitude)
          ]);

          startAddress = startResult.address;
          endAddress = endResult.address;
        } catch (error) {
          console.warn('Geocoding failed for trip:', trip.id, 'Using coordinates as fallback');
        }

        exportData.push({
          vehicle: selectedVehicle?.name || 'Unknown Vehicle',
          startDate: formatDate(trip.date),
          endDate: trip.endDate ? formatDate(trip.endDate) : 'Unknown',
          startAddress,
          endAddress,
          distanceTravelled: `${trip.distance || 0} km`,
          duration: trip.duration ? `${trip.duration} min` : 'Unknown',
          startLatitude: startCoord.latitude,
          startLongitude: startCoord.longitude,
          endLatitude: endCoord.latitude,
          endLongitude: endCoord.longitude,
        });
      }

      // Update progress
      const progress = Math.round(((i + 1) / filteredTrips.length) * 100);
      setExportProgress(progress);
    }

    return exportData;
  };

  // Export to CSV
  const exportToCSV = async () => {
    if (filteredTrips.length === 0) {
      Alert.alert('No Data', 'There are no trips to export.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      const exportData = await prepareExportData();
      
      const headers = ['Vehicle', 'Start Date', 'End Date', 'Start Location', 'End Location', 'Distance Travelled', 'Duration', 'Start Latitude', 'Start Longitude', 'End Latitude', 'End Longitude'];
      
      const csvContent = [
        headers.join(','),
        ...exportData.map(trip => [
          `"${trip.vehicle}"`,
          `"${trip.startDate}"`,
          `"${trip.endDate}"`,
          `"${trip.startAddress}"`,
          `"${trip.endAddress}"`,
          `"${trip.distanceTravelled}"`,
          `"${trip.duration}"`,
          trip.startLatitude,
          trip.startLongitude,
          trip.endLatitude,
          trip.endLongitude
        ].join(','))
      ].join('\n');

      const fileName = `complete_trips_export_${selectedVehicle?.vehiclePlate || 'vehicle'}_${new Date().getTime()}.csv`;
      await saveCSVFile(csvContent, fileName);
      
      setExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export CSV file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (filteredTrips.length === 0) {
      Alert.alert('No Data', 'There are no trips to export.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      const exportData = await prepareExportData();
      
      const tableRows = exportData.map(trip => `
          <tr>
            <td>${trip.vehicle}</td>
            <td>${trip.startDate}</td>
            <td>${trip.endDate}</td>
            <td>${trip.startAddress}</td>
            <td>${trip.endAddress}</td>
            <td>${trip.distanceTravelled}</td>
            <td>${trip.duration}</td>
            <td>${trip.startLatitude.toFixed(6)}</td>
            <td>${trip.startLongitude.toFixed(6)}</td>
            <td>${trip.endLatitude.toFixed(6)}</td>
            <td>${trip.endLongitude.toFixed(6)}</td>
          </tr>
        `).join('');

      const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Ekco Trips Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
      .header { margin-bottom: 20px; display: flex; align-items: center; gap: 20px; }
      .logo { height: 60px; max-width: 200px; object-fit: contain; }
      .title-section { flex: 1; }
      h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin: 0; }
      .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
      th { background-color: #3b82f6; color: white; font-weight: bold; }
      tr:nth-child(even) { background-color: #f8fafc; }
      .footer { margin-top: 20px; font-size: 12px; color: #64748b; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px; }
      .footer-logo { height: 20px; }
      .investigation-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="https://kairostechnology.co.za/wp-content/uploads/2025/10/ekco-original-logo-1.png" alt="Ekco Logo" class="logo">
      <div class="title-section">
        <h1>Ekco Trips Report</h1>
      </div>
    </div>

    <div class="investigation-note">
      <strong>INVESTIGATION REPORT:</strong> This report contains ALL recorded trips within the specified date range for location and travel analysis.
    </div>

    <div class="summary">
      <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Vehicle:</strong> ${selectedVehicle?.name || 'Unknown Vehicle'}</p>
      <p><strong>Total Trips:</strong> ${exportData.length}</p>
      <p><strong>Date Range:</strong> ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</p>
      <p><strong>Report Type:</strong> Complete Trip History (No Limits)</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Vehicle</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Start Location</th>
          <th>End Location</th>
          <th>Distance</th>
          <th>Duration</th>
          <th>Start Lat</th>
          <th>Start Lng</th>
          <th>End Lat</th>
          <th>End Lng</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="footer">
      <img src="https://kairostechnology.co.za/wp-content/uploads/2025/10/ekco-original-logo-1.png" alt="Ekco Logo" class="footer-logo">
      <p>Generated by Ekco Vehicle Tracker - ©️ Kairos Technologies</p>
    </div>
  </body>
</html>
`;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Complete Trips PDF' });
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }
      
      setExportModal(false);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Failed', 'Failed to export PDF file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel (CSV format)
  const exportToExcel = async () => {
    await exportToCSV();
  };

  // Render trip card
  const renderTripCard = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleTripSelect(item)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text className="text-gray-600 text-sm ml-1">
            {formatDate(item.date)}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons 
            name="speedometer" 
            size={16} 
            color={item.distance && item.distance > 0 ? "#10b981" : "#9ca3af"} 
          />
          <Text className={`text-xs ml-1 ${
            item.distance && item.distance > 0 ? "text-green-600" : "text-gray-400"
          }`}>
            {item.distance ? `${item.distance} km` : '0 km'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {selectedVehicle?.name || 'Trip'}
          </Text>
          <Text className="text-gray-500 text-sm">
            Duration: {item.duration} minutes
          </Text>
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color="#d1d5db" 
        />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#ef4444" />
          <Text className="text-red-600 text-xs ml-1">
            Start
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#22c55e" />
          <Text className="text-green-600 text-xs ml-1">
            End
          </Text>
        </View>
        
        {item.gpsLogs && (
          <View className="flex-row items-center">
            <Ionicons name="map-outline" size={14} color="#3b82f6" />
            <Text className="text-blue-600 text-xs ml-1">
              {item.gpsLogs.length} GPS points
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
       {/*  <Text className="text-2xl font-bold text-gray-900">Trip History</Text>
        <Text className="text-gray-600 mt-1">
          Complete trip history for vehicle investigation and analysis
        </Text> */}
      {/*   {!apiKeyConfigured && (
          <View className="mt-2 bg-yellow-100 p-2 rounded">
            <Text className="text-yellow-800 text-sm">
              Note: Using coordinate-based locations for export
            </Text>
          </View>
        )} */}
      </View>

      {/* Export Button */}
      <TouchableOpacity
        className={`mx-4 rounded-xl py-3 flex-row items-center justify-center ${
          isLoading || isExporting ? 'bg-gray-400' : 'bg-green-500'
        }`}
        onPress={() => {
          if (isLoading) {
            Alert.alert('Please Wait', 'Wait for current trips to finish loading');
          } else if (isExporting) {
            Alert.alert('Please Wait', 'Wait for export to finish');
          } else {
            setExportModal(true);
          }
        }}
        disabled={filteredTrips.length === 0}
      >
        <Ionicons name="download" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">
          Export All Trips ({filteredTrips.length})
        </Text>
      </TouchableOpacity>

      {/* Manual Refresh Button */}
      <TouchableOpacity
        className="mx-4 mt-2 mb-4 bg-blue-500 rounded-xl py-3 flex-row items-center justify-center"
        onPress={() => {
          if (selectedVehicle) {
            getTripLogs(selectedVehicle.deviceSerial, startDate, endDate);
          }
        }}
        disabled={isLoading || !selectedVehicle}
      >
        <Ionicons name="refresh" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">
          {isLoading ? 'Loading All Trips...' : 'Refresh All Trips'}
        </Text>
      </TouchableOpacity>

      {/* Vehicle Selector */}
      <View className="px-4 mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Select Vehicle</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              className={`mr-2 px-4 py-2 rounded-full ${
                selectedVehicle?.id === vehicle.id
                  ? 'bg-blue-500'
                  : 'bg-white border border-gray-300'
              }`}
              onPress={() => handleVehicleSelect(vehicle)}
            >
              <Text className={`font-medium ${
                selectedVehicle?.id === vehicle.id
                  ? 'text-white'
                  : 'text-gray-700'
              }`}>
                {vehicle.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search and Filter Bar */}
      <View className="px-4 mb-4">
        <View className="flex-row space-x-2">
          <View className="flex-1 flex-row items-center bg-white rounded-xl px-3 py-2 border border-gray-300">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              placeholder="Search trips by text..."
              className="flex-1 ml-2 text-gray-700"
              defaultValue={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>
          
          <TouchableOpacity
            className={`bg-white rounded-xl px-4 py-2 border border-gray-300 items-center justify-center ${
              isLoading || isExporting ? 'opacity-50' : ''
            }`}
            onPress={() => {
              if (isLoading) {
                Alert.alert('Please Wait', 'Wait for current trips to finish loading');
              } else if (isExporting) {
                Alert.alert('Please Wait', 'Wait for export to finish');
              } else {
                setDateRangeModal(true);
              }
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={isLoading || isExporting ? "#9ca3af" : "#374151"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Date Range */}
      <View className="px-4 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {[
              { label: 'Today', days: 0 },
              { label: '7 Days', days: 7 },
              { label: '30 Days', days: 30 },
              { label: '90 Days', days: 90 },
              { label: '1 Year', days: 365 }
            ].map((range) => (
              <TouchableOpacity
                key={range.days}
                className={`px-3 py-2 rounded-lg border border-gray-300 ${
                  isLoading ? 'bg-gray-200 opacity-50' : 'bg-white'
                }`}
                onPress={() => applyQuickDateRange(range.days)}
                disabled={isLoading}
              >
                <Text className={`text-sm font-medium ${
                  isLoading ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Current Date Range Display */}
      <View className="px-4 mb-2">
        <Text className="text-sm text-gray-600 text-center">
          Showing ALL trips from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
        </Text>
        <Text className="text-xs text-gray-500 text-center mt-1">
          {filteredTrips.length} trips found • Complete date range coverage
        </Text>
        {isLoading && (
          <Text className="text-xs text-orange-600 text-center mt-1">
            ⏳ Loading trips...
          </Text>
        )}
      </View>

      {/* Trip List */}
      <View className="flex-1 px-4">
       {isLoading ? (
  loadingProgress !== null && (
    <View className="flex-1 justify-center items-center px-8">
      <Text className="text-gray-500 mb-4 text-lg font-medium">Loading trips...</Text>
      <View className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <View
          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${loadingProgress}%` }}
        />
      </View>
      <Text className="text-gray-600 text-sm mb-4">
        {loadingProgress}% complete
      </Text>
      <Text className="text-gray-400 text-sm text-center">
        This may take a moment...{'\n'}
        Processing trip data from your vehicle
      </Text>
          </View>
  )
) : filteredTrips.length > 0 ? (
          <FlatList
            data={filteredTrips}
            renderItem={renderTripCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
           contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="car-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-lg mt-4">No trips found</Text>
            <Text className="text-gray-400 text-center mt-2">
              {selectedVehicle 
                ? 'No trips recorded for this vehicle in the selected date range'
                : 'Select a vehicle to view complete trip history'
              }
            </Text>
            {selectedVehicle && (
              <TouchableOpacity 
                className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
                onPress={() => getTripLogs(selectedVehicle.deviceSerial, startDate, endDate)}
              >
                <Text className="text-white font-medium">Load All Trips</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Date Range Modal */}
      <Modal
        visible={dateRangeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowStartDatePicker(false);
          setShowEndDatePicker(false);
          setDateRangeModal(false);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 m-4 w-11/12 max-h-3/4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Select Investigation Date Range</Text>
              <TouchableOpacity onPress={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
                setDateRangeModal(false);
              }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">Quick Select:</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {[
                { label: 'Today', days: 0 },
                { label: '7 Days', days: 7 },
                { label: '30 Days', days: 30 },
                { label: '90 Days', days: 90 },
                { label: '1 Year', days: 365 }
              ].map((range) => (
                <TouchableOpacity
                  key={range.days}
                  className="bg-gray-100 px-3 py-2 rounded-lg"
                  onPress={() => applyQuickDateRange(range.days)}
                >
                  <Text className="text-gray-700 text-sm font-medium">
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-600 mb-4">Custom Investigation Range:</Text>
            
            {/* Start Date Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Start Date</Text>
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-300"
                onPress={showStartPickerFromModal}
              >
                <Text className="text-gray-900">{startDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              
              {showStartDatePicker && (
                <View className="mt-2 bg-gray-50 p-3 rounded-lg">
                  <Text className="text-gray-600 text-sm mb-2">Select Start Date:</Text>
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={onStartDateChange}
                    maximumDate={endDate}
                    style={Platform.OS === 'ios' ? { height: 120 } : {}}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      className="bg-blue-500 py-2 rounded-lg mt-2"
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text className="text-white text-center font-semibold">Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* End Date Selection */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2">End Date</Text>
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-300"
                onPress={showEndPickerFromModal}
              >
                <Text className="text-gray-900">{endDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              
              {showEndDatePicker && (
                <View className="mt-2 bg-gray-50 p-3 rounded-lg">
                  <Text className="text-gray-600 text-sm mb-2">Select End Date:</Text>
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={onEndDateChange}
                    minimumDate={startDate}
                    maximumDate={new Date()}
                    style={Platform.OS === 'ios' ? { height: 120 } : {}}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      className="bg-blue-500 py-2 rounded-lg mt-2"
                      onPress={() => setShowEndDatePicker(false)}
                    >
                      <Text className="text-white text-center font-semibold">Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              className="bg-blue-500 rounded-xl py-3 mt-6"
              onPress={applyCustomDateRange}
            >
              <Text className="text-white font-semibold text-center">Load All Trips in Range</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={exportModal}
        transparent
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 m-4 w-11/12">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Export Complete Trip History
            </Text>
            
            <Text className="text-gray-600 mb-6">
              Export {filteredTrips.length} complete trips for investigation analysis.
              Includes ALL trip data without any limits.
            </Text>
            
            {isExporting && (
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-medium">Export Progress</Text>
                  <Text className="text-gray-600 text-sm">{exportProgress}%</Text>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${exportProgress}%` }}
                  />
                </View>
              </View>
            )}

            <View className="space-y-3 gap-2">
              <TouchableOpacity
                className="bg-blue-500 rounded-xl py-4 flex-row items-center justify-center"
                onPress={exportToPDF}
                disabled={isExporting}
              >
                <Ionicons name="document-text" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  {isExporting ? 'Exporting...' : 'Export to PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-600 rounded-xl py-4 flex-row items-center justify-center"
                onPress={exportToCSV}
                disabled={isExporting}
              >
                <Ionicons name="document" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  {isExporting ? 'Exporting...' : 'Export to CSV'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-700 rounded-xl py-4 flex-row items-center justify-center"
                onPress={exportToExcel}
                disabled={isExporting}
              >
                <Ionicons name="stats-chart" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">
                  {isExporting ? 'Exporting...' : 'Export to Excel'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View className="flex-row justify-end space-x-3 mt-6">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                onPress={() => setExportModal(false)}
              >
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      {selectedTrip && mapModal && (
        <TripMapModal
          trip={selectedTrip}
          vehicleName={selectedVehicle?.name || 'Unknown Vehicle'}
          onClose={() => {
            setSelectedTrip(null);
            setMapModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}