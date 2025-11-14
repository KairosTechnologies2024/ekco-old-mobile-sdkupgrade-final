import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../config/firebase';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            
            // Firebase password reset logic from old app
            await sendPasswordResetEmail(auth, email);
            
            // Success handling from old app
            Alert.alert('Success!', 'Check your email 👌', [
                { text: 'OK', onPress: () => router.back() },
            ]);
            
        } catch (e: any) {
            // Error handling from old app
            console.log(e.message);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-primary-background-color px-6 justify-center">
            <View className="w-full max-w-md self-center">
                {/* Logo */}
                <View className='mb-6 relative'>
                    <Image
                        source={require('../../../assets/images/ekco logo white.png')}
                        className="w-36 h-36 self-center"
                        resizeMode="contain"
                    />
                    <Text className='text-white text-sm text-center uppercase absolute top-28 left-1/2 transform -translate-x-1/2'>Vehicle Tracking</Text>
                </View>

                {/* Title */}
                <Text className="text-white text-lg mb-2 text-center font-bold">
                    Let's reset your
                </Text>
                <Text className="text-white text-lg mb-2 text-center font-bold">
                    password..
                </Text>
                <Text className="text-white text-sm mb-8 text-center">
                    Enter your email.
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
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        className="bg-accent-color p-3 rounded items-center"
                        activeOpacity={0.8}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Reset Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Back to Login */}
                <View className="mt-8 items-center">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-gray-400 underline">Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View className="mt-8 space-y-1 items-center">
                    <Text className="text-gray-300">developed by</Text>
                    <Image
                        source={require('../../../assets/images/kairos tech logo white 2.png')}
                        className="w-28 h-28 mb-6 self-center"
                        resizeMode="contain"
                    />
                    <Text className="text-gray-300">Ekco v1.0.6</Text>
                </View>
            </View>
        </View>
    );
}