import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, left: 0, right: 0, bottom: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
  };
});

jest.mock('react-native-gesture-handler', () => {
  return {
    ScrollView: ({ children }: any) => children,
  };
});

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file://mock.pdf' }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Firebase config imports used by the component
jest.mock('./app/config/firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    collection: jest.fn((...args: any[]) => ({ __type: 'collection', args })),
    query: jest.fn((...args: any[]) => ({ __type: 'query', args })),
    where: jest.fn((...args: any[]) => ({ __type: 'where', args })),
    orderBy: jest.fn((...args: any[]) => ({ __type: 'orderBy', args })),
    getDocs: jest.fn(),
  };
});

// Mock reverse geocoding service
jest.mock('./app/services/geocodingService', () => ({
  reverseGeocode: jest.fn().mockResolvedValue({ address: 'Mock Address' }),
}));

// Silence RN Alert during tests and allow assertions
jest.spyOn(global, 'alert' as any).mockImplementation(() => {});

const RN = jest.requireActual('react-native');
jest.spyOn(RN.Alert, 'alert').mockImplementation(() => {});

// Mock TripMapModal to a lightweight stub
jest.mock('./components/TripMapModal', () => ({
  __esModule: true,
  default: ({ trip, onClose }: any) => null,
}));
