# TODO: Enable Notification Banners in Foreground

## Steps to Complete

- [x] Add expo-notifications dependency to package.json
- [x] Modify FCMService.setupNotificationHandlers in services/fcmService.ts to use expo-notifications for displaying local notifications in foreground
- [x] Update app/_layout.tsx to request notification permissions via Expo Notifications
- [x] Ensure proper handling for both Android and iOS platforms
- [x] Install dependencies using npm install
- [ ] Test notifications in foreground on Android
- [ ] Test notifications in foreground on iOS
- [ ] Verify that notification banners appear when the app is open

# TODO: Fix Pushy Headless Task Registration

## Steps to Complete

- [x] Create index.js as custom entry point to register Pushy headless task
- [x] Update package.json "main" field to "index.js"
- [ ] Test Pushy notifications on non-GMS Android device
- [ ] Verify FCM still works on GMS devices
