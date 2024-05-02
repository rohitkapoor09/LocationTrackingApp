import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  Button,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Animated,
  Image,
  Dimensions,
  NativeModules,
  Alert,
} from 'react-native';
import MapView, {
  PROVIDER_GOOGLE,
  Marker,
  Polyline,
  AnimatedRegion,
} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import MapViewDirections from 'react-native-maps-directions';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import Geocoder from 'react-native-geocoding';
import Constants from '../constants';

const MapScreen = () => {
  const {BatteryModule}= NativeModules
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState('');
  const [markerCoordinates, setMarkerCoordinates] = useState('');

  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [heading, setHeading] = useState(0);
  const [isAlerted, setIsAlerted] = useState(false);

  const [start, setStart] = useState(false);
  const [isStartAvailable, setIsStartAvailable] = useState(false);

  const mapRef = useRef(null);
  const markerPosition = useRef(
    new AnimatedRegion({
      latitude: currentLocation?.latitude || 30.7046,
      longitude: currentLocation?.longitude || 76.7179,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    }),
  );
  const {width, height} = Dimensions.get('window');

  useEffect(() => {
    Geocoder.init(Constants.GOOGLE_API_KEY);
    getBatteryLevelFromNative()
    BatteryModule.showToastIfLowBattery(20)
  }, []);

  async function getBatteryLevelFromNative() {
    try {
      BatteryModule.getBatterLevel((error, batteryLevel) => {
        if (error) {
          // handle error here
        } else {
          if(batteryLevel < 20 ){
            Alert.alert(
              "Battery Low!",
              "Uh oh! Your battery is running low (less than 15%). This might trigger battery saver, which could affect location tracking. To avoid this, make sure location services are enabled in your settings.",
            );
          }
        }
      });
    } catch (error) {
      // console.log('Error getting battery level:', error);
    }
  }

  // useEffect(() => {
  //   // if(currentLocation && destinationLocation){
  //     const watchId = Geolocation.watchPosition(
  //       position => {
  //         const {
  //           coords: {latitude, longitude, heading},
  //         } = position;
  //         console.log(heading,'head');
  //         setHeading(heading)
  //         setMarkerCoordinates({latitude, longitude});
  //           animateMarker(latitude, longitude); // Call animate on location change
  //       },
  //       error => alert(error.message),
  //       {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
  //     );
  
  //     return () => Geolocation.clearWatch(watchId);
  //   // }
   
  // }, [markerCoordinates]);

  const animateMarker = (latitude, longitude) => {
    const newCoordinate = {latitude, longitude};

    if (markerPosition.current) {
      if (markerPosition.current.animateMarkerToCoordinate) {
        markerPosition.current.animateMarkerToCoordinate(newCoordinate, 5000);
      } else {
        markerPosition.current
          .timing({
            toValue: {latitude, longitude},
            duration: 5000, // Adjust animation duration
          })
          .start();
      }
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const position = await Geolocation.getCurrentPosition(
          ({coords}) => {
            const {latitude, longitude, heading} = coords;
            setHeading(heading)
            setCurrentLocation({latitude, longitude});
            setMarkerCoordinates({latitude, longitude});
            animateMarker(latitude, longitude); // Call animate on location change
          },
          error => Alert.alert("",error.message),
          {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
        );
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchLocation();

    const intervalId = setInterval(fetchLocation, 10000); // Adjust interval as needed

    return () => clearInterval(intervalId);
  }, []);

  const handleSetDestination = () => {
    getBatteryLevelFromNative()
    const [lat, lon] = destinationCoordinates
      .split(',')
      .map(coord => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert("",
        'Invalid input. Please enter valid latitude and longitude coordinates separated by comma.',
      );
    } else {
      setDestinationLocation({latitude: lat, longitude: lon});
    }
  };

  const handleDestinationInputChange = value => {
    setDestinationCoordinates(value);
  };
  const handleAnimateToRegion = (lat, long) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: long,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03, // Adjust these values for desired zoom level
    }, 2000); // Adjust duration as needed
  };

  const endHandler = () => {
    setDestinationLocation(null);
    setIsStartAvailable(false);
    setStart(false);
    setDistance('');
    setDuration('');
  };

  const handleStart = () => {
    const lat = currentLocation?.latitude;
    const long = currentLocation?.longitude;
    setStart(true);
    handleAnimateToRegion(lat, long)
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: 20,
          backgroundColor: 'transparent',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}>
        <GooglePlacesAutocomplete
          placeholder="Enter Destination"
          onPress={(data, details) => {
            setIsStartAvailable(false);
            setDistance('');
            setDuration('');
            if (details) {
              if (details.geometry && details.geometry.location) {
                // If details contain geometry and location, use it directly
                const {lat, lng} = details.geometry.location;
                handleDestinationInputChange(`${lat}, ${lng}`);
              } else {
                // If details do not contain location, perform geocoding
                Geocoder.from(details.description)
                  .then(json => {
                    const {lat, lng} = json.results[0].geometry.location;
                    handleDestinationInputChange(`${lat}, ${lng}`);
                  })
                  .catch(error => {
                    Alert.alert("",
                      'Location not found. Please enter valid coordinates or place name.',
                    );
                  });
              }
            } else {
              Alert.alert("",'Invalid details object. Please try again.');
            }
          }}
          onFail={error => console.log(error)}
          query={{
            key: Constants.GOOGLE_API_KEY,
            language: 'en',
          }}
        />
      </View>
      {currentLocation ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || 30.7046,
            longitude: currentLocation?.longitude || 76.7179,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05, // Adjust these values for desired zoom level
          }}>
          {currentLocation && !start && (
            <Marker
              coordinate={currentLocation}
              title="Current Location"
              description="You are here"
            />
          )}
          {destinationLocation && (
            <>
              <Marker
                coordinate={destinationLocation}
                title="Destination Location"
                description="Selected Destination"
              />
              <MapViewDirections
                origin={currentLocation}
                destination={destinationLocation}
                strokeWidth={4}
                strokeColor="blue"
                mode="DRIVING"
                optimizeWaypoints={false}
                apikey={Constants.GOOGLE_API_KEY}
                onStart={params => {
                  setIsStartAvailable(true);
                }}
                onReady={result => {
                  setDistance(result.distance);
                  setDuration(result.duration);
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: {
                      right: width / 20,
                      bottom: height / 20,
                      left: width / 20,
                      top: height / 20,
                    },
                  });
                }}
                resetOnChange
                onError={errorMessage => {
                  //handle error
                }}
              />
            </>
          )}
          {markerPosition && start && (
            <Marker.Animated
              ref={markerPosition}
              coordinate={markerCoordinates}
              anchor={{x: 0.5, y: 0.5}}>
              <Image
                source={require('../marker.png')}
                style={{
                  alignSelf: 'center',
                  width: 40,
                  height: 40,
                  padding: 20,
                  borderRadius: 20,
                  resizeMode: 'center', // Adjust resize mode as needed
                  transform:[{rotate:`${heading}deg`}]
                }}
              />
              {/* <View style={styles.animatedMarker} /> */}
            </Marker.Animated>
          )}
        </MapView>
      ) : (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator size={40} />
        </View>
      )}
      {distance && duration && (
        <View
          style={{}}>
          <Text style={{color: 'black', fontSize: 20}}>
            {`Distance: ${distance} km`}
          </Text>
          <Text style={{color: 'black', fontSize: 20}}>
            {`Duration: ${duration} min`}
          </Text>
        </View>
      )}
      {destinationCoordinates && !start && (
        <TouchableOpacity
          onPress={isStartAvailable ? handleStart : handleSetDestination}
          style={{
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'green',
            width: '60%',
            height: 40,
            borderRadius: 20,
            margin: 10,
          }}>
          <Text style={{color: 'white', fontSize: 20}}>
            {isStartAvailable ? 'Start Route' : 'Show Directions'}
          </Text>
        </TouchableOpacity>
      )}
      {start && (
        <TouchableOpacity
          onPress={endHandler}
          style={{
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'green',
            width: '60%',
            height: 40,
            borderRadius: 20,
            margin: 10,
          }}>
          <Text style={{color: 'white', fontSize: 20}}>{'End Route'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1,
  },
  map: {
    flex: 1,
  },
  animatedMarker: {
    width: 20,
    height: 20,
    backgroundColor: 'red',
    borderRadius: 10,
  },
});

export default MapScreen;
