import './AppOutlets';
import * as React from 'react';
import {Platform, Text, UIManager, View} from 'react-native';
import {Provider as PaperProvider, DefaultTheme} from 'react-native-paper';
import AppNavigator from './AppNavigator';
import * as AppContext from './AppContext';
import NfcManager from "react-native-nfc-manager";

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3985cb',
  },
};

class App extends React.Component {
  constructor(props) {
    super();
    // explicitly create redux store
    // enable LayoutAnimation for Android
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    this.state = {
      nfcSupport: false
    }
  }

  async componentDidMount() {
    const deviceIsSupported = await NfcManager.isSupported()

    if (deviceIsSupported) {
      await NfcManager.start()
      await this.setState({
        nfcSupport: true
      });
    }
  }

  render() {
    return (
      <AppContext.Provider>
        <PaperProvider theme={CustomDefaultTheme}>
          {this.state.nfcSupport ? <AppNavigator/> : <View>
            <Text>No nfc support</Text>
          </View>}
        </PaperProvider>
      </AppContext.Provider>
    );
  }
}

export default App;
