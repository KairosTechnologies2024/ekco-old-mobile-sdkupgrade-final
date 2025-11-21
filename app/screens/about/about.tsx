import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
  return (
    <SafeAreaView className="flex-1 bg-white">
     

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* App Information Section */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons
              name="information-circle-outline"
              size={28}
              color="#0a7ea4"
              style={{ marginRight: 12 }}
            />
            <Text className="text-xl font-bold text-black">App Information</Text>
          </View>

          <View className="space-y-3">
            <View>
              <Text className="text-sm text-gray-600 font-medium">App Name</Text>
              <Text className="text-lg text-black">Ekco Vehicle Tracker</Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600 font-medium">Version</Text>
              <Text className="text-lg text-black">1.14.0</Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600 font-medium">Package</Text>
              <Text className="text-sm text-gray-800 font-mono">com.ekcovercel.com</Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600 font-medium">Description</Text>
              <Text className="text-base text-black leading-5">Advanced GPS tracking and fleet management solution.</Text>
            </View>
          </View>
        </View>

        {/* Ekco Information Section */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons
              name="business-outline"
              size={28}
              color="#0a7ea4"
              style={{ marginRight: 12 }}
            />
            <Text className="text-xl font-bold text-black">About Ekco</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-lg font-semibold text-black mb-2">Ekco</Text>
              <Text className="text-base text-blue-600 font-medium mb-3">Next Generation Of Vehicle Tracking</Text>
              <Text className="text-base text-black leading-6">
                Ekco provides cutting-edge GPS tracking solutions designed to optimize fleet operations, improve driver safety, and enhance business efficiency. Our comprehensive platform offers real-time tracking, detailed analytics, and intelligent insights to help vehicle owners make data-driven decisions.
              </Text>
            </View>

            <View>
              <Text className="text-sm text-gray-600 font-medium mb-2">Key Features</Text>
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">Real-time GPS tracking</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">Fleet management tools</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">Early Alerts</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">Fuel Cuts</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">24/7 Support</Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#10b981"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base text-black">Comprehensive reporting</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Contact/Support Section */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons
              name="help-circle-outline"
              size={28}
              color="#0a7ea4"
              style={{ marginRight: 12 }}
            />
            <Text className="text-xl font-bold text-black">Support</Text>
          </View>

          <View className="space-y-3">
            <Text className="text-base text-black leading-5">
              For support, feature requests, or technical assistance, please contact our support team or visit our documentation.
            </Text>

            <View className="flex-row items-center pt-2">
              <Ionicons
                name="mail-outline"
                size={18}
                color="#000"
                style={{ marginRight: 8 }}
              />
              <Text className="text-base text-black">support@kairostechnology.co.za</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="pb-8">
          <Text className="text-center text-sm text-gray-500">
            © 2025 Ekco. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}