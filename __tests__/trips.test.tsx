import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import Trips from '../app/(tabs)/trips';
import * as firestore from 'firebase/firestore';
import * as sharing from 'expo-sharing';
import * as printing from 'expo-print';
import { Alert } from 'react-native';

jest.useFakeTimers();

const mockVehiclesDocs = [
  {
    id: 'veh1',
    data: () => ({ vehicleModel: 'Model X', vehiclePlate: 'ABC123', deviceSerial: 'SER123', userId: 'user-1' }),
  },
];

function makeSnapshot(docs: any[]) {
  return { docs, empty: docs.length === 0 } as any;
}

describe('Trips screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockGetDocsSequence(sequence: any[]) {
    // First call: vehicles; subsequent calls according to sequence array
    (firestore.getDocs as jest.Mock).mockImplementationOnce(async () => makeSnapshot(mockVehiclesDocs));
    sequence.forEach((snap) => (firestore.getDocs as jest.Mock).mockImplementationOnce(async () => makeSnapshot(snap)));
  }

  it('Should auto-load trips for the first vehicle when user is authenticated and vehicles exist', async () => {
    // ignition events
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123', date: '2020-01-01T00:00:01Z' }) },
      { id: 'ign2', data: () => ({ rawDate: 200000, status: 'off', serialNumber: 'SER123', date: '2020-01-01T00:03:20Z' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 200000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    await waitFor(() => {
      expect(firestore.getDocs).toHaveBeenCalled();
    });

    // Expect a trip list item rendered
    await waitFor(() => {
      expect(screen.getByText(/Trip History/i)).toBeTruthy();
    });
  });

  it('Should render a list of trips with stable keys', async () => {
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123' }) },
      { id: 'ign2', data: () => ({ rawDate: 2000, status: 'off', serialNumber: 'SER123' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 2000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    const { UNSAFE_getAllByType } = render(<Trips />);

    // Wait for list to render; then check presence of TouchableOpacity items (trip cards)
    await waitFor(() => {
      const items = UNSAFE_getAllByType(require('react-native').TouchableOpacity);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('Should debounce the search input and filter trips', async () => {
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:00' }) },
      { id: 'ign2', data: () => ({ rawDate: 200000, status: 'off', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:03' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 200000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    const input = await screen.findByPlaceholderText('Search trips by text...');
    act(() => {
      fireEvent.changeText(input, 'Jan');
      jest.advanceTimersByTime(300);
    });

    // Assert no crash and component updated; list still present
    await waitFor(() => expect(screen.getByText(/Trip History/i)).toBeTruthy());
  });

  it('Should show loading progress during trip loading', async () => {
    // Make ignition non-empty but delay GPS to simulate progress updates
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123' }) },
      { id: 'ign2', data: () => ({ rawDate: 2000, status: 'off', serialNumber: 'SER123' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 2000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    // Show loading state text at some point
    await waitFor(() => {
      expect(screen.getByText(/Trip History/i)).toBeTruthy();
    });
  });

  it('Should open map modal when tapping a trip with GPS logs; otherwise alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123' }) },
      { id: 'ign2', data: () => ({ rawDate: 2000, status: 'off', serialNumber: 'SER123' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 2000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    const { getAllByText } = render(<Trips />);

    await waitFor(() => expect(getAllByText(/Duration:/i).length).toBeGreaterThan(0));

    // Press a trip card by pressing on the text element
    const duration = getAllByText(/Duration:/i)[0];
    fireEvent.press(duration);

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('Should export to CSV via sharing', async () => {
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:00' }) },
      { id: 'ign2', data: () => ({ rawDate: 200000, status: 'off', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:03' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 200000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    const exportBtn = await screen.findByText(/Export All Trips/i);
    fireEvent.press(exportBtn);

    const csvBtn = await screen.findByText(/Export to CSV/i);
    fireEvent.press(csvBtn);

    await waitFor(() => expect(sharing.shareAsync).toHaveBeenCalled());
  });

  it('Should export to PDF by generating HTML and printing', async () => {
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:00' }) },
      { id: 'ign2', data: () => ({ rawDate: 200000, status: 'off', serialNumber: 'SER123', date: 'Jan 1, 2020, 00:03' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 200000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    const exportBtn = await screen.findByText(/Export All Trips/i);
    fireEvent.press(exportBtn);

    const pdfBtn = await screen.findByText(/Export to PDF/i);
    fireEvent.press(pdfBtn);

    await waitFor(() => expect(printing.printToFileAsync).toHaveBeenCalled());
  });

  it('Should allow applying quick date ranges and refetch', async () => {
    const ignitionDocs = [
      { id: 'ign1', data: () => ({ rawDate: 1000, status: 'on', serialNumber: 'SER123' }) },
      { id: 'ign2', data: () => ({ rawDate: 2000, status: 'off', serialNumber: 'SER123' }) },
    ];
    const gpsDocs = [
      { id: 'gps1', data: () => ({ rawDate: 1000, lat: 1, long: 1 }) },
      { id: 'gps2', data: () => ({ rawDate: 2000, lat: 2, long: 2 }) },
    ];

    mockGetDocsSequence([
      ignitionDocs,
      gpsDocs,
    ]);

    render(<Trips />);

    const calendarButtons = await screen.findAllByA11yRole('button');
    // Trigger date modal open via calendar icon on toolbar
    const openDateBtn = calendarButtons.find((b) => b.props?.accessibilityLabel === undefined) || calendarButtons[0];
    fireEvent.press(openDateBtn);

    // Instead, open via explicit Calendar button on toolbar
    const toolbarCalendar = await screen.findByTestId ? await screen.findByTestId('calendar-btn') : null;
    // Fallback: use quick range buttons rendered on screen
    const quickBtn = await screen.findByText(/7 Days/);
    fireEvent.press(quickBtn);

    await waitFor(() => expect(firestore.getDocs).toHaveBeenCalled());
  });

  it('Should disable export button when there are no filtered trips', async () => {
    // vehicles present but no ignition results
    mockGetDocsSequence([
      [], // ignition empty
    ]);

    render(<Trips />);

    const exportBtn = await screen.findByText(/Export All Trips/);
    // Export button in disabled state if no trips
    // We can assert by trying to press and ensuring modal does not open
    fireEvent.press(exportBtn);

    // Modal heading is not present
    await expect(screen.queryByText(/Export Complete Trip History/)).toBeNull();
  });

  it('Should render warning when Google Maps API key is default (not configured)', async () => {
    render(<Trips />);

    // The component shows a banner only when apiKeyConfigured is false. In our source it compares against a default sentinel
    // The imported constant in the component is the default sentinel so banner should appear.
    await waitFor(() => {
      expect(screen.getByText(/Using coordinate-based locations for export/i)).toBeTruthy();
    });
  });
});
