import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="location"   
        options={{ 
          title: 'Location', 
          headerShown: false, 
          tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} />
        }} 
      />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' ,
      tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />




      }} 
      
      />
      <Tabs.Screen name="trips" options={{ title: 'Trips' ,

   tabBarIcon: ({ color, size }) => <Ionicons name="paper-plane" size={size} color={color} />


      }} />
    </Tabs>
  );
}
