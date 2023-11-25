import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import constants from './constants';

export const saveToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('token', token);
  } catch (error) {
    console.error('Error saving token to storage:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error retrieving token from storage:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('Error removing token from storage:', error);
  }
};

export const login = async (email: string, pin: string) => {
  try {
    const authLink = constants.LOGIN_URL + `?l=${email}&p=${pin}`;
    const res = await axios.get(authLink);
    if (res.status == 200 && res.data != false) {
      return { data: res.data, error: false };
    } else { return { error: true, data: "Invalid Credentials Provided." }; }
  } catch (error) {
    console.error("auth_service:37: ");
    console.error(error);
    return { error: true, data: "Server not accessable" };
  }
}