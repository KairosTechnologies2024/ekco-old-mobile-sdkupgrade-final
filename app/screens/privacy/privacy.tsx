import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Privacy() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom", "left", "right"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color="#0a7ea4"
              style={{ marginRight: 12 }}
            />
            <Text className="text-xl font-bold text-black">Privacy Policy</Text>
          </View>
          <Text className="text-sm text-gray-600">Last Updated: 2025/02/15</Text>
        </View>

        {/* Content */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <Text className="text-base text-black leading-6 mb-4">
            Thank you for choosing Kairos Technology Solutions for your Vehicle Tracking and Stolen Vehicle Recovery needs. This Privacy Policy is designed to inform you about the information we collect, how we use it, and the choices you have regarding your information. By using our services, you agree to the terms outlined in this Privacy Policy.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Information We Collect</Text>
          <Text className="text-base font-semibold text-black mb-2">Personal Information</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We may collect the following personal information from users:
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Customer Full Names
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Contact Information (email address, phone number, ID Number, Emergency contact)
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Vehicle Details (Vehicle Registration, VIN / Chassis number, Make, and year Model, Color)
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Location Data
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Usage Data (Trip reports, stops, routes, speed detection, ignition status)
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            ▪ Banking Details (Bank name, Account number, Branch code, Account Type)
          </Text>

          <Text className="text-base font-semibold text-black mb-2">Non-Personal Information</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We may collect non-personal information, such as aggregated data and analytics, for the purpose of improving our services and user experience.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">How We Use Your Information</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We use the collected information for the following purposes:
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            2.1. Providing Services: To offer and maintain our vehicle tracking services.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            2.2. Customer Support: To respond to inquiries, troubleshoot issues, and provide customer support.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            2.3. Improvements: To enhance and optimize our services, including adding new features and functionalities.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            2.4. Communication: To send updates, provide real-time alerts (Doors opened, Ignition status, possible break-ins and remote jamming detection), provide real-time live GPS location and addresses and Trip reports.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Data Security</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We take reasonable measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. However, no data transmission over the internet or electronic storage is completely secure. Therefore, we cannot guarantee absolute security.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">3.1. Data Access Controls</Text>
          <Text className="text-base text-black leading-6 mb-4">
            Access to the collected data is restricted to authorized personnel only, and strict access controls are implemented to prevent unauthorized access. Employees with access to user data are trained on privacy and security protocols.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">3.2. Storage Security</Text>
          <Text className="text-base text-black leading-6 mb-4">
            Data is stored in secure databases with access controls and encryption. We regularly assess and update our storage infrastructure to meet the highest security standards.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">3.3. User Authentication</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We implement strong user authentication measures to prevent unauthorized access to user accounts. This includes the use of secure passwords and usernames.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Sharing Your Information</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We do not sell, trade, or rent your personal information to third parties whatsoever.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">Service Providers</Text>
          <Text className="text-base text-black leading-6 mb-4">
            Third-party vendors who help us operate and improve our services.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">Legal Compliance</Text>
          <Text className="text-base text-black leading-6 mb-4">
            When required by law or in response to valid legal requests.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">6.1. Applicable Laws and Regulations</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We are committed to complying with all relevant data protection laws and regulations that apply to our vehicle tracking services.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">6.2. Changes to Privacy Laws</Text>
          <Text className="text-base text-black leading-6 mb-4">
            In the event of changes to privacy laws and regulations, we will promptly update our privacy policy to reflect these changes. Users will be notified of any material changes to the policy.
          </Text>
          <Text className="text-base font-semibold text-black mb-2">6.3. Data Subject Rights</Text>
          <Text className="text-base text-black leading-6 mb-4">
            Users have rights under data protection laws, including the right to access, rectify, delete, or restrict the processing of their personal information.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            We are committed to maintaining compliance with applicable privacy laws and regulations. If you have any questions or concerns regarding our privacy practices, please contact us on the details below.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Access and Update</Text>
          <Text className="text-base text-black leading-6 mb-4">
            You can access and update your personal information by contacting us via our direct contact number, email address provided below.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Changes to this Privacy Policy</Text>
          <Text className="text-base text-black leading-6 mb-4">
            We reserve the right to update this Privacy Policy. Any changes will be effective immediately upon posting. We encourage you to review this Privacy Policy periodically.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Contact Us</Text>
          <Text className="text-base text-black leading-6 mb-4">
            If you have any questions or concerns about this Privacy Policy, please contact us on:
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            admin@kairostechnology.co.za
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Telephone: 031 109 6584
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Website: www.kairostechnology.co.za
          </Text>
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
