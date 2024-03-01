import * as React from 'react';
import {Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {
    createStackNavigator,
    CardStyleInterpolators,
} from '@react-navigation/stack';
import {Appbar} from 'react-native-paper';
import NfcPromptLogin from './Components/NfcPromptLogin';
import Toast from './Components/Toast';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Theme from './Theme';

const RootStack = createStackNavigator();

import Home from './screens/Home';
import NfcPromptPin from "./Components/NfcPromptPin";
import RegisterPin from "./screens/RegisterPin";


function Root(props) {
    return (
        <RootStack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                presentation: 'modal',
                cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            }}>
            {/*<RootStack.Screen name="Home" component={Home} />*/}
            <RootStack.Screen name="Home" component={RegisterPin} />
        </RootStack.Navigator>
    );
}

function AppNavigator(props) {

    const linking = {
        prefixes: ["ogawa://"],
        config: {
            screens: {
                Home: {
                    path: ':token',
                    parse: {token: String},
                }
            },
        },
    };

    return (
        <NavigationContainer linking={linking} >
            <Root />
            <NfcPromptLogin />
            <NfcPromptPin />
            <Toast />
        </NavigationContainer>
    );
}

export default AppNavigator;
