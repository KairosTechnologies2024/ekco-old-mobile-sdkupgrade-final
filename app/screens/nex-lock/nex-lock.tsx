import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NexLock() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom", "left", "right"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons
              name="lock-closed-outline"
              size={28}
              color="#0a7ea4"
              style={{ marginRight: 12 }}
            />
            <Text className="text-xl font-bold text-black">Nex-Lock</Text>
          </View>
          <Text className="text-sm text-gray-600">Advanced Locking Solution</Text>
        </View>

        {/* Content */}
        <View className="bg-gray-50 p-6 rounded-lg mb-6">
          <Text className="text-lg font-bold text-black mb-2">What is Nex-Lock?</Text>
          <Text className="text-base text-black leading-6 mb-4">
            Nex-Lock is an advanced locking solution that integrates mechanical and electronic security to protect your high-value cargo in transit specifically designed and developed for closed-body trucks. The system is fully remote-controlled and designed to activate automatically as soon as the truck begins moving. Once in motion, the locks engage without any manual input, eliminating any opportunity for the driver—or potential criminals—to access the cargo.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Deactivation is only possible through remote authorization from the control room, and only after the driver's location has been verified. This ensures total control over when and where the cargo can be accessed.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            For added security, Nex-Lock is installed internally within the truck, making it completely hidden from view. This concealed design makes it extremely difficult to locate, tamper with, or breach, offering a high level of protection against theft and unauthorized access.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            "The future of fleet safety, today"
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Overview</Text>
          <Text className="text-base text-black leading-6 mb-4">
            The Nex-Lock is a next-generation, intelligent electronic locking system specifically engineered for commercial transport and logistics fleets. Designed and developed by Kairos Technology Solutions, the Nex-Lock redefines cargo security with real-time remote control, intelligent access management, and integrated fleet connectivity — ensuring the highest standards of safety and operational efficiency for logistics operators.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            The intelligence behind the Nex-Lock is powered by the design and development of our EKCO Vehicle Tracking Device—a proudly South African product, engineered and developed in-house by our skilled team of Engineers & Developers. This integration provides a unique advantage, as EKCO serves not only as a core control unit for the lock but also as an additional monitoring and recovery solution, enhancing overall security and operational efficiency.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Statistics: For the first half of 2025, 54% of vehicle crime involved hijackings, with cargo trucks and courier vans becoming prime targets
          </Text>
          <Text className="text-base font-semibold text-black mb-2">What This Means</Text>
          <Text className="text-base text-black leading-6 mb-4">
             Despite marginal declines in some categories, truck hijackings remain a serious threat, particularly for business fleets.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Cargo theft continues on a massive scale, affecting logistics, retail and supply chains.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Design & Engineering</Text>
          <Text className="text-base text-black leading-6 mb-4">
            The Nex-Lock is a rugged, weatherproof, tamper-resistant locking mechanism, built with industrial-grade stainless steel & Mild-Steel housing and a solid-state electronic actuator system. Designed to fit a wide range of truck and trailer configurations, the lock is modular, allowing for retrofit on existing fleets or installation during manufacturing.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            The locking system is powered by a low-power, high-efficiency lithium-ion battery module with optional connection to the vehicle’s power supply, ensuring operational longevity and uninterrupted performance in all conditions.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Remote Activation & Deactivation</Text>
          <Text className="text-base text-black leading-6 mb-4">
            At the heart of Nex-Lock innovation is its remote-control capability:
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Cloud-Connected System: The lock connects to Kairos’ secure IoT platform via LTE/4G or satellite, enabling real-time communication between the lock and a centralized fleet risk control room.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Command Interface: Authorized operators can lock or unlock the system from a desktop dashboard or mobile device through a secure, role-based access interface.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Audit Logs: Every lock/unlock event is logged with timestamp, location, time & date, ensuring a full trail of accountability.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Security Features</Text>
          <Text className="text-base text-black leading-6 mb-4">
             Encrypted Communication: All data between lock, vehicle, and fleet risk control room is secured.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Fail-Safe Over-ride Mode: In the event of doors not being closed properly and locks are activated, Nex-Lock will automatically disengage, placing the lock into a deactivation state.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Jamming Safety Feature: in the event of the Lock / Device being signal jammed, Nex-Lock will remain in a "Locked" state at all times, giving
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Malfunction Over-ride: In the event of a malfunction—whether caused by signal failure, component issues, or any other unforeseen factor—a secure override procedure has been developed. This override can only be activated by specifically designated personnel, appointed and authorized by top management. This ensures controlled access and maintains the security integrity of the system during emergency situations.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Smart Technology Integration</Text>
          <Text className="text-base text-black leading-6 mb-4">
             Sensor Array: Integrated accelerometers, tamper sensors, and GPS modules provide real-time situational awareness, including lock status, Dates & Times, and location, including full description of specific vehicle details.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Over-the-Air Updates: Firmware upgrades and security patches can be delivered remotely via the cloud interface, ensuring the system is always up to date.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Solution & Key Benefits</Text>
          <Text className="text-base text-black leading-6 mb-4">
             Enhanced Cargo Security: Prevents unauthorized access and theft, helping to reduce the loss of goods in transit.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Remote Fleet Control: Reduces dependency on driver action; increases accountability.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Operational Visibility: Real-time insights and access logs for compliance and auditing.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Remotely Lock and Unlock trailers from a secure control room—no need to rely on the driver.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Track and monitor lock status, location, and access history in real-time via the cloud.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">About US & Our Mission</Text>
          <Text className="text-base text-black leading-6 mb-4">
            A Groundbreaking Problem-Solver that will revolutionize our frame of mind when it comes to our Vehicle’s Safety & Security. Designed with pure innovation and passion, this remarkable Vehicle Tracking Product is set to transform your daily lives.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Discover the power of cutting-edge Technology combined with exceptional craftsmanship, all packed into a sleek and stylish design accompanied with a practical and intuitive Mobile App.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            So, are you ready for NEXT-GEN Vehicle Tracking & Stolen Vehicle Recovery? Then look NO further than EKCO Vehicle Tracking.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            We focus on a significant vehicle safety and security problem that many South Africans face on a daily basis. We want to offer a product and service that will help reduce the level of vehicle crimes in our country. We focus on prevention while building client satisfaction, confidence, peace of mind & trust in our brand.
          </Text>

          <Text className="text-base font-semibold text-black mb-2">We Understand</Text>
          <Text className="text-base text-black leading-6 mb-4">
            At Ekco Vehicle Tracking, we understand the challenges companies face in ensuring the security and efficiency of their vehicles & it is the reason why we've developed a Next Gen, cutting-edge Vehicle Tracking & Safety Solution equipped with a range of features tailored to meet our client’s needs and to solve this major problem we face in South Africa.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            A Product designed and developed with pure innovation and passion, this remarkable vehicle tracking product is set to transform your daily life in ways you can’t imagine.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            We are a business that is ready to provide an excellent service with helping to reduce the level of vehicle crimes in S.A. as well as saving you money.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Customer Service & Satisfaction
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            Providing outstanding customer service is our greatest priority. We strive to fulfil a level of professional respect to our clients. At Kairos Technology Solutions, customer service is not just a support function — it is a core pillar of our brand promise. We are committed to delivering not only cutting-edge security solutions but also an exceptional experience throughout the customer journey. We ensure that you are always taken care off.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
             Proudly South African
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            We have the privilege of localizing every aspect of our development. Our Hardware and Software is developed and designed using the latest frameworks, which undergoes continuous testing and frequent updates.
          </Text>

          <Text className="text-lg font-bold text-black mb-2">Conclusion</Text>
          <Text className="text-base text-black leading-6 mb-4">
            At Kairos Technology Solutions, we believe that security should be as intelligent as the logistics systems it protects. The Nex-Lock represents not just a product, but a shift toward smarter, safer, and more efficient fleet operations.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            By integrating advanced technology with real-time control and enterprise-level support, we provide our partners with the tools to secure their cargo, reduce the level of risk, and gain complete operational visibility — all from a centralized risk control point.
          </Text>
          <Text className="text-base text-black leading-6 mb-4">
            We are excited about the opportunity to work with you in transforming fleet security and delivering measurable value to your operations. We look forward to the next step in partnering with you to deploy this innovative solution.
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
