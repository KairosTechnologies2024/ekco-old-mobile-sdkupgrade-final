import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { getManufacturer } from 'react-native-device-info';

export class MapService {
  // Testing flag - set to true to force Leaflet usage even on GMS devices
  private static forceLeafletForTesting: boolean = false;

  // Method to enable/disable Leaflet testing mode
  static setForceLeafletForTesting(enabled: boolean) {
    this.forceLeafletForTesting = enabled;
    console.log(`🔧 Leaflet testing mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Check if we should use Google Maps or Leaflet
  static async shouldUseGoogleMaps(): Promise<boolean> {
    try {
      // iOS: Always use Google Maps (assuming it's available)
      if (Platform.OS === 'ios') {
        console.log('📱 iOS detected: Using Google Maps');
        return true;
      }

      // Android: Check for GMS availability
      if (Platform.OS === 'android') {
        let hasGMS = false;
        let detectionMethod = 'unknown';

        try {
          const manufacturer = await getManufacturer();
          console.log('📱 Android device manufacturer:', manufacturer);

          // Known non-GMS manufacturers
          const knownNonGMSManufacturers = ['huawei', 'honor', 'xiaomi'];
          const isKnownNonGMS = knownNonGMSManufacturers.some(mfg =>
            manufacturer.toLowerCase().includes(mfg)
          );

          if (isKnownNonGMS) {
            hasGMS = false;
            detectionMethod = 'manufacturer_known_non_gms';
          } else {
            hasGMS = true;
            detectionMethod = 'manufacturer_assumed_gms';
          }

          // Fallback: Try to detect GMS availability directly
          try {
            const gmsAvailable = await (GoogleSignin as any).hasPlayServices();
            console.log('📱 Direct GMS check result:', gmsAvailable);

            if (gmsAvailable) {
              hasGMS = true;
              detectionMethod = 'direct_gms_check';
            } else {
              hasGMS = false;
              detectionMethod = 'direct_gms_check_unavailable';
            }
          } catch (gmsError) {
            console.warn('⚠️ Direct GMS check failed, falling back to manufacturer logic:', gmsError);
          }

          console.log(`📱 Final GMS detection via ${detectionMethod}: hasGMS=${hasGMS}`);

        } catch (manufacturerError) {
          console.warn('⚠️ Manufacturer detection failed, defaulting to Google Maps:', manufacturerError);
          hasGMS = true;
          detectionMethod = 'error_fallback';
        }

        // Apply testing flag override
        if (hasGMS && this.forceLeafletForTesting) {
          console.log('📱 FORCED: Using Leaflet for testing on GMS device');
          return false;
        } else if (hasGMS && !this.forceLeafletForTesting) {
          console.log('📱 GMS available: Using Google Maps');
          return true;
        } else {
          console.log('📱 No GMS: Using Leaflet');
          return false;
        }
      }

      // Other platforms: default to Google Maps
      return true;
    } catch (error) {
      console.error('❌ Error determining map service:', error instanceof Error ? error.message : String(error));
      return true; // Default to Google Maps on error
    }
  }
}
