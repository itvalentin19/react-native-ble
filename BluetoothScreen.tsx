import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, PermissionsAndroid, Platform, Button, Dimensions, Linking, Image } from 'react-native';
import axios from 'axios';
import { BleError, BleManager, Device, ScanMode } from 'react-native-ble-plx';
import { getToken, removeToken } from './auth_service';
import constants from './constants';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import moment from 'moment-timezone';
import NetInfo from "@react-native-community/netinfo";

interface FetchedDevice {
	name: string;
	alias: string;
	lastupdate?: number;
	batt?: number;
	maplink?: string;
	setlink?: string;
}

interface DisplayDevice extends FetchedDevice, Device {
	name: string;
}

const BluetoothScreen: React.FC = () => {
	let manager: BleManager;
	const [devices, setDevices] = useState<FetchedDevice[]>([]);
	const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
	const [displayDevices, setDisplayDevices] = useState<DisplayDevice[]>([]);
	const [bluetoothState, setBluetoothState] = useState<boolean>(true);
	const [token, setToken] = useState<string | null>(null);
	const navigation = useNavigation();
	const isFocused = useIsFocused();
	const [isConnected, setIsConnected] = useState<boolean | null>(null);
	const [mounted, setMounted] = useState<boolean>(false);

	useFocusEffect(
		useCallback(() => {
			const unsubscribe = NetInfo.addEventListener(state => {
				setIsConnected(state.isConnected);
			});
			return () => {
				unsubscribe();
			};
		}, [isConnected])
	);

	useEffect(() => {
		try {
			manager = new BleManager();
		} catch (err: any) {
		}
	}, []);

	useEffect(() => {
		if (isFocused) {
			console.log("Getting Token .....");
			fetchToken();
		}
	}, [isFocused]);

	useEffect(() => {
		if (manager) {
			const subscription = manager.onStateChange(state => {
				if (state === 'PoweredOn') {
					setBluetoothState(true)
					scanAndConnect()
				} else {
					setBluetoothState(false)
				}
			}, true)
			return () => subscription.remove()
		}
	}, [manager])

	useEffect(() => {
		handleDevices();
	}, [scannedDevices, devices]);

	useEffect(() => {
		if (token) {
			fetchDevices();
			const interval = setInterval(fetchDevices, 60000);
			return () => clearInterval(interval);
		}
	}, [token]);

	const fetchToken = async () => {
		const savedToken = await getToken();
		setToken(savedToken);
	};

	const handleLogout = async () => {
		await removeToken();
		setToken(null);
		navigation.navigate('LoginScreen');
	};

	const requestBluetoothPermission = async () => {
		if (Platform.OS === 'ios') {
			return true
		}
		if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
			const apiLevel = parseInt(Platform.Version.toString(), 10)

			if (apiLevel < 31) {
				const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
				return granted === PermissionsAndroid.RESULTS.GRANTED
			}
			if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
				const result = await PermissionsAndroid.requestMultiple([
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
					PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
				])

				return (
					result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
					result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
					result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
				)
			}
		}

		return false
	}

	const handleDevices = () => {
		// console.log("handling devices.....", Date.now());

		const _devices: any[] = devices.map(device => {
			const sameDevice = [...scannedDevices]?.find(d => d.id.trim() == device.name.trim() || d.name?.trim() == device.name.trim() || d.name?.trim() == device.alias.trim());
			if (sameDevice) {
				// console.log("It has Same Device here!!!😃🥰");

				return Object.assign({}, device, sameDevice);
			} else return device
		});

		if (_devices != undefined) {
			const sortedDevices = _devices.sort((a: any, b: any) => a.rssi < b.rssi ? 1 : 0)
			setDisplayDevices(sortedDevices);
		}
	}

	const scanAndConnect = async () => {
		const granted = await requestBluetoothPermission()
		console.log("Scanning ble devices");
		if (granted) {

			let _devices: Device[] = [];
			manager.startDeviceScan(null, null, (error, device) => {
				// console.log("Scanning....", Date.now());

				if (error) {
					console.log(error);
					manager.stopDeviceScan();
					scanAndConnect();
					return
				}

				// Check if it is a device you are looking for based on advertisement data
				// or other criteria.
				if (device && (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag')) {
					// Stop scanning as it's not necessary if you are scanning for one device.
					console.log("🤬🤬 Stop Scanning ... 🤬🤬");
					manager.stopDeviceScan()
				} else {
					if (device) {
						// console.log("😇😅 Scanning Device ... 😇😅", _devices.length);
						// console.log(Object.keys(device));

						// if (!device.name) { device.name = "Unknown" }
						const index = _devices.findIndex(d => d.id == device.id);
						if (index > -1) {
							_devices[index] = device;
						} else {
							_devices.push(device);
						}
						setScannedDevices([..._devices])
					}
				}
			})
		}
	}

	const fetchDevices = async () => {
		try {
			const url = constants.DEVICES + "?k=" + token;
			const response = await axios.get<FetchedDevice[]>(url);
			if (response && response.data) {
				setDevices(response.data)
				setMounted(true);
			}
		} catch (error) {
			console.log(error);
		}
	};

	function calculateDistance(rssi = 0, mp = -69, n = 2) {
		let punkte = Math.abs(Math.floor((100 - Math.abs(rssi)) / 5));
		return "o".repeat(punkte + 1);
	}

	const onShouldStartLoadWithRequest = (event: any) => {
		// Check if the URL starts with "http" or "https" (external link)
		if (event.url.startsWith('http://') || event.url.startsWith('https://')) {
			// Open external links in the device's default browser
			Linking.openURL(event.url);
			return false; // Prevent the WebView from loading the URL
		}

		// Load all other URLs in the WebView
		return true;
	};

	const evaluateColor = (distance: string) => {
		if (distance.length < 4) return 'red';
		if (distance.length < 7) return 'yellow';
		return 'green';
	}

	const openPage = (link: string | null) => {
		try {
			if (link) {
				Linking.openURL(link)
			}
		} catch (error) {
		}
	}

	const evaluateBatteryIcon = (batt?: number | undefined | null) => {
		if (batt == undefined || batt == null) return constants.BATTERY_ICON_UNKNOWN;
		const index = Math.floor(batt / 100);
		if (index > 0 && index < 6) {
			return `https://kekefinder.de/img/batt-${index}.png?v=1`
		} else {
			return constants.BATTERY_ICON_UNKNOWN
		}
	}

	const calcDateTime = (timestamp: number) => {
		const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		moment.tz.setDefault(userTimezone);
		const formattedDate = moment(timestamp * 1000).format("DD.MM [um] HH:mm");

		return formattedDate;
	}

	const renderItem = ({ item }: { item: DisplayDevice | any }) => (
		<View style={styles.deviceItem}>
			<View style={{ flexDirection: 'column', width: '70%', gap: 4 }}>
				<View style={{ flexDirection: 'row', width: '100%', gap: 5, alignItems: 'center' }}>
					<Text style={styles.deviceName} numberOfLines={1}>{item.alias || "Unknown"}({item.name})</Text>
					<Image source={{ uri: evaluateBatteryIcon(item.batt) }} style={styles.iconImage} />
				</View>
				<Text style={styles.lastupdate}>letzte Position {item.lastupdate && item.lastupdate != "0" ? calcDateTime(item.lastupdate) : 'unbekannt'}</Text>
				<Text
					style={{
						...styles.deviceDistance,
						color: item.rssi != undefined ? evaluateColor(calculateDistance(item.rssi)) : 'black'
					}}
				>
					<Text style={{ color: "black" }}>Distance: </Text>
					{item.rssi != undefined ? `${calculateDistance(item.rssi)}` : 'not in range'}
				</Text>
				<Text style={{ color: "black" }}>RSSI: {item.rssi}</Text>
			</View>
			<View style={{ flexDirection: 'row', width: '30%', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap', paddingHorizontal: 4 }}>
				<TouchableOpacity onPress={() => openPage(item.setlink)}>
					<Image source={{ uri: constants.SETTING_ICON }} style={styles.iconImage} />
				</TouchableOpacity>
				<TouchableOpacity onPress={() => openPage(item.maplink)}>
					<Image source={{ uri: constants.SEARCH_ICON }} style={styles.iconImage} />
				</TouchableOpacity>
			</View>
		</View>
	);

	const renderHeader = (title: string) => (
		<View style={styles.headerContainer}>
			<Text style={styles.headerText}>{title}</Text>
			{
				mounted && displayDevices.length == 0 && (
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 20 }}>
						<Text style={{ textAlign: 'center' }}>{
							!isConnected ? "No Internet" : "No Devices"
						}</Text>
					</View>
				)
			}
		</View>
	);

	if (!token) return null;

	return (
		<View style={styles.container}>
			{
				bluetoothState == false && (
					<Text style={styles.alertText}>Device bluetooth service is off.</Text>
				)
			}
			{token ? (
				<>
					<View style={{ height: 200 }}>
						<WebView
							source={{ uri: constants.WEBVIEW_HEADER }}
							bounces={false}
							scalesPageToFit={false}
							allowsLinkPreview={false}
							scrollEnabled={false}
							style={{ width: Dimensions.get('screen').width - 40, backgroundColor: 'white' }}
						/>
					</View>
					<FlatList
						style={{ flex: 1 }}
						data={displayDevices}
						renderItem={renderItem}
						keyExtractor={(item, index) => index.toString()}
						ListHeaderComponent={renderHeader(`Du hast ${displayDevices.length} Keke aktiviert:`)}
						ListHeaderComponentStyle={{ width: Dimensions.get('screen').width - 40 }}
					/>
					<View style={{ height: 100 }}>
						<WebView
							source={{ uri: constants.WEBVIEW_FOOTER }}
							bounces={false}
							scalesPageToFit={false}
							allowsLinkPreview={false}
							style={{ width: Dimensions.get('screen').width - 40, backgroundColor: 'white' }}
							onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
						/>
					</View>
					<View style={{ alignSelf: 'center' }}>
						<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
							<Text style={styles.logoutText}>Log Out</Text>
						</TouchableOpacity>
					</View>
				</>
			) : (
				<TouchableOpacity onPress={handleLogout}>
					<Text>Please log in to continue.</Text>
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
		paddingTop: Platform.OS == 'ios' ? 60 : 30,
		backgroundColor: '#FFFFFF',
	},
	deviceItem: {
		width: '100%',
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		paddingVertical: 20,
	},
	deviceName: {
		maxWidth: '90%',
		fontSize: 14,
		color: 'black',
		fontWeight: 'bold',
	},
	deviceDistance: {
		width: '100%',
		fontSize: 13,
		lineHeight: 20
	},
	headerContainer: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 10,
	},
	headerText: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	sectionHeaderText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	alertText: {
		fontSize: 14,
		fontWeight: '500',
		color: "red",
		backgroundColor: "yellow",
		width: '100%',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "red",
		marginVertical: 10
	},
	logoutButton: {
		backgroundColor: "grey",
		paddingVertical: 10,
		paddingHorizontal: 30,
		borderRadius: 10,
	},
	logoutText: {
		color: "white",
		fontSize: 14,
		fontWeight: '500'
	},
	iconImage: {
		width: 30, height: 30, objectFit: 'contain'
	},
	lastupdate: {
		color: '#484848',
		fontSize: 12,
		fontWeight: '400'
	}
});

export default BluetoothScreen;
