import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../config/firebase'; // Import your Firebase config
export default function AuthScreen() {
    const router = useRouter();
    
    // State from old app
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // Auto-redirect if already logged in (from old app)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user !== null) {
                router.replace('/(tabs)/location');
            } else {
                setIsAuthLoading(false);
            }
        });

        return unsubscribe; // Cleanup subscription
    }, []);

    // Login logic from old app
    const onPress = async () => {
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            
            // Firebase login from old app
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Store user in AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(userCredential.user));

            // Show success modal and navigate
            setModalVisible(true);
            setTimeout(() => {
                setModalVisible(false);
                router.replace('/(tabs)/location');
            }, 1000);
            
        } catch (e: any) {
            console.log(e.message);
            
            // Error handling from old app
            if (e.message.indexOf('user-not-found') > -1) {
                setError('This email is not registered.');
            }
            else if (e.message.indexOf('invalid-email') > -1) {
                setError('Please enter a valid email address.');
            }
            else if (e.message.indexOf('wrong-password') > -1) {
                setError('Please enter a correct password.');
            }
            else {
                setError(e.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Privacy policy link from old app
    const openPrivacyLink = () => {
        Linking.openURL("https://candid-valkyrie-ad72f6.netlify.app").catch(error => {
            console.log(error.message);
        });
    };

    if (isAuthLoading) {
        return (
            <View className="flex-1 bg-primary-background-color justify-center items-center">
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-primary-background-color px-6 justify-center">
            <StatusBar barStyle="light-content" />
            <View className="w-full max-w-md self-center">
                {/* Logo */}
                <View className='mb-6 relative'>
                    <Image
                        source={require('../../../assets/images/ekco logo white.png')}
                        className="w-36 h-36 self-center"
                        resizeMode="contain"
                    />
                    <Text className='text-white text-sm text-center uppercase absolute top-28 left-1/2 transform -translate-x-1/2'>
                        Vehicle Security
                    </Text>
                </View>

                {/* Title */}
                <Text className="text-white text-sm mb-8 text-center">
                    Please enter the provided account details below.
                </Text>

                {/* Form */}
                <View className="space-y-4">
                    {/* Error message from old app */}
                    {error ? <Text className="text-red-500 mb-1 text-center">{error}</Text> : null}
                    
                    <TextInput
                        placeholder="Enter your email address"
                        placeholderTextColor="#999"
                        className="border border-white text-black p-3 rounded bg-secondary-background-color w-full mb-4"
                        value={email}
                        onChangeText={(text) => setEmail(text.replace(/\s/g, ''))}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                   
                    <TextInput
                        placeholder="Enter your password"
                        placeholderTextColor="#999"
                        secureTextEntry
                        className="border border-white text-black p-3 rounded bg-secondary-background-color w-full mb-6"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        className="bg-accent-color p-3 rounded items-center"
                        activeOpacity={0.8}
                        onPress={onPress}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Login</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View className="mt-8 space-y-1 items-center">
                    <TouchableOpacity onPress={() => router.push('/screens/auth/reset-password')}>
                        <Text className="text-gray-400 underline mb-6">Forgot Password</Text>
                    </TouchableOpacity>
                    
                 
                    
                    <Text className="text-gray-300">Developed by</Text>
                    <Image
                        source={require('../../../assets/images/kairos tech logo white 2.png')}
                        className="w-28 h-28 mb-6 self-center"
                        resizeMode="contain"
                    />
                    <Text className="text-gray-300">Version 1.14.1</Text>
                </View>
            </View>

            {/* Success Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ width: 300, backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Login Successful</Text>
                        <Ionicons name="checkmark-circle" size={48} color="green" />
                    </View>
                </View>
            </Modal>
        </View>
    );
}