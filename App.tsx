import React, { useEffect, useState } from 'react';
import { Linking, Alert, Platform, View, ActivityIndicator } from 'react-native';
import BluetoothScreen from './BluetoothScreen';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './LoginScreen';
import { getToken, removeToken, saveToken, userCheck } from './auth_service';

const Stack = createStackNavigator();

const Screens: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<null | string>(null);
  const navigation = useNavigation();
  const [authChecking, setAuthChecking] = useState<boolean>(false);

  // useEffect(() => {
  //   checkAuthentication()
  // }, []);

  useEffect(() => {
    Linking.getInitialURL().then(url => { checkLink(url) });
    Linking.addEventListener('url', handleOpenUrl);
  }, []);

  const checkAuthentication = async () => {
    const _token = await getToken();

    if (_token) {
      setInitialRoute("BluetoothScreen")
    } else {
      setInitialRoute("LoginScreen")
    }
  }

  const handleOpenUrl = (e: any) => {
    checkLink(e.url);
  }

  const checkLink = async (url: string | null) => {
    if (url) {
      const code = url.split('code/')[1];
      if (code) {
        setAuthChecking(true)
        userCheck(code).then(async res => {
          if (!res.error && res.data != false) {
            await saveToken(res.data);
            navigateToScreen("BluetoothScreen")
          } else {
            // throw new Error("Network Error");
            navigateToScreen("LoginScreen", res.data)
          }
        }).catch(err => {
          let message = '';
          // Check if the error is a network error
          if (err.isAxiosError && !err.response) {
            // Handle network-related errors (e.g., no internet connection)
            console.error('Network Error:', err.message);
            message = err.message;
          } else if (err.response) {
            // Handle HTTP error responses (e.g., 404, 500)
            console.error('HTTP Error:', err.response.status, err.response.data);
            message = err.response.data;
          } else {
            // Handle other errors
            console.error('Error:', err.message);
            message = err.message;
          }
          navigateToScreen("LoginScreen", message)
        })
      } else {
        navigateToScreen("LoginScreen")
      }
    } else {
      checkAuthentication()
    }
  }

  const navigateToScreen = async (screen: string, data?: string) => {
    setAuthChecking(false)
    setInitialRoute(screen)
    if (screen == 'LoginScreen') {
      await removeToken();
      Alert.alert("Autentication Failed!", data);
    }
    if (navigation)
      navigation.navigate(screen);
  }

  if (initialRoute == null) return null;
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="BluetoothScreen" component={BluetoothScreen} />
      </Stack.Navigator>
      {
        authChecking && (
          <View style={{ flex: 1, backgroundColor: '#58585844', position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size={'large'} color="primary" />
          </View>
        )
      }
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Screens />
    </NavigationContainer>
  );
}

export default App;
