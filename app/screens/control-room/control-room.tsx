import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const openWhatsApp = () => {
    const phoneNumber = '+27731448617';
    const url = `whatsapp://send?phone=${phoneNumber}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4">
        <View className="items-center my-6">
          <MaterialIcons name="chat" size={64} color="#000" style={{marginBottom: 8}} />
          <Text className="text-lg font-semibold text-center">Live Chat with Control Room</Text>
        </View>

        <View className="mb-6">
          <Text className="text-base text-center text-gray-600">
            Contact the control room directly via WhatsApp for immediate assistance.
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold mb-2">Control Room Details</Text>
          <Text className="text-base">Phone: 031 109 6584</Text>
          <Text className="text-base">Email: admin@kairostechnology.co.za</Text>
          <Text className="text-base">Available: 24/7</Text>
        </View>

        <Pressable
          onPress={openWhatsApp}
          className="bg-green-500 py-4 rounded-lg items-center flex-row justify-center"
        >
          <MaterialIcons name="chat" size={24} color="white" style={{marginRight: 8}} />
          <Text className="text-white font-semibold text-lg">Open WhatsApp</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
