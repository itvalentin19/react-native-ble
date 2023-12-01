import React, { useState } from 'react';
import { View, TextInput, Button, Text, Image, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as authService from './auth_service';
import constants from './constants';


const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('jorgencnc960608@gmail.com');
  const [pin, setPin] = useState('1234');
  const navigation = useNavigation();

  const handleLogin = () => {
    if (email == '' || pin == '') { return; }
    authService.login(email, pin).then(async res => {
      if (res.error == false) {
        await authService.saveToken(res.data)
        navigation.navigate('BluetoothScreen');
        setEmail('');
        setPin('');
      } else {
        Alert.alert("Authentication failed", res.data);
      }
    })
  };

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={{ alignItems: 'center' }}>
            <Image source={{ uri: constants.APP_LOGO }} style={styles.logo} />
          </View>
          <TextInput
            placeholder="Email"
            value={email}
            keyboardType={'email-address'}
            onChangeText={setEmail}
            style={styles.textInput}
          />
          <TextInput
            placeholder="PIN"
            value={pin}
            keyboardType={'numeric'}
            onChangeText={setPin}
            style={styles.textInput}
          />
          <Button title="Login" onPress={handleLogin} />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column', justifyContent: 'center', padding: 40, gap: 5, backgroundColor: 'white' },
  logo: { width: 100, height: 100, resizeMode: 'contain', marginVertical: 50 },
  textInput: { height: 40, borderWidth: 1, borderColor: 'gray', marginVertical: 10, padding: 10, borderRadius: 8 }
})

export default LoginScreen;