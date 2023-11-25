import React, { useEffect, useState } from 'react';
import BluetoothScreen from './BluetoothScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './LoginScreen';
import { getToken } from './auth_service';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<null | string>(null);

  useEffect(() => {
    checkAuthentication()
  }, []);

  const checkAuthentication = async () => {
    const _token = await getToken();

    if (_token) {
      setInitialRoute("BluetoothScreen")
    } else {
      setInitialRoute("LoginScreen")
    }
  }

  if (initialRoute == null) return null;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="BluetoothScreen" component={BluetoothScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
