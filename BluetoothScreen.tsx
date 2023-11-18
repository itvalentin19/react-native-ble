import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, PermissionsAndroid, Platform } from 'react-native';
import axios from 'axios';
import { BleError, BleManager, Device } from 'react-native-ble-plx';

interface FetchedDevice {
	name: string;
	alias: string;
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

	useEffect(() => {
		try {
			manager = new BleManager();
		} catch (err: any) {
		}
	}, []);

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
		fetchDevices();
		const interval = setInterval(fetchDevices, 5000);
		return () => clearInterval(interval);
	}, []);

	const handleDevices = () => {
		const _devices: any[] = devices.map(device => {
			const sameDevice = [...scannedDevices]?.find(d => d.id == device.name || d.name == device.name || d.name == device.alias);
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
				if (error) {
					console.log(error);
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
					}
				}
			})
			setScannedDevices(_devices)
		}
	}

	const fetchDevices = async () => {
		try {
			const response = await axios.get<FetchedDevice[]>(
				'https://www.zivilfahnder.de/devices.php'
			);
			// const testData: FetchedDevice[] = [
			// 	{ "alias": "Puck", "name": "Ce7rgh3" },
			// 	{ "alias": "MD#1", "name": "gA9JMcY" },
			// 	{ "alias": "Device Number 2", "name": "hIZqh7a" },
			// 	{ "alias": "AirPlus Pro", "name": "4A:C6:79:63:E8:83" },
			// 	{ "alias": "", "name": "KL9UB1O" }
			// ];
			setDevices(response.data)
		} catch (error) {
			console.log(error);
		}
	};

	function calculateDistance(rssi = 0, mp = -69, n = 2) {
		let range = 10 ** ((mp - (rssi)) / (10 * n));
		range = parseFloat(range.toFixed(2));
		if (range < 5) return '5m ↓';
		if (range < 10 && range >= 5) return '5 ~ 10 m';
		if (range < 20 && range >= 10) return '10 ~ 20 m';
		return '20m ↑';
	}

	const renderItem = ({ item }: { item: DisplayDevice | any }) => (
		<View style={styles.deviceItem}>
			<Text style={styles.deviceName}>{item.alias || item.name || "Unknown"}</Text>
			<Text style={{ ...styles.deviceDistance, color: item.rssi != undefined ? 'green' : 'red' }}>{item.rssi != undefined ? `${calculateDistance(item.rssi)} (RSSI: ${item.rssi})` : 'Not in range'}</Text>
		</View>
	);

	const renderHeader = (title: string) => (
		<View style={styles.headerContainer}>
			<Text style={styles.headerText}>{title}</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			{
				bluetoothState == false && (
					<Text style={styles.alertText}>Device bluetooth service is off.</Text>
				)
			}
			<FlatList
				style={{ flex: 1 }}
				data={displayDevices}
				renderItem={renderItem}
				keyExtractor={(item, index) => index.toString()}
				ListHeaderComponent={renderHeader("BLE Finder")}
			/>
			<FlatList
				style={{ flex: 1 }}
				data={scannedDevices}
				renderItem={renderItem}
				keyExtractor={(item, index) => index.toString()}
				ListHeaderComponent={renderHeader("Scaned Devices")}
			/>
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
		width: '50%',
	},
	deviceDistance: {
		width: '50%',
	},
	headerContainer: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 10,
	},
	headerText: {
		fontSize: 24,
		fontWeight: 'bold',
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
	}
});

export default BluetoothScreen;
