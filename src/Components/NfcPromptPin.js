import React from 'react';
import {Image, Text, View, Animated, StyleSheet, Modal, TextInput} from 'react-native';
import {Button} from 'react-native-paper';
import NfcManager from 'react-native-nfc-manager';
import {useOutlet} from 'reconnect.js';
import Theme from "../Theme";
import {showToast} from "./Toast";

function NfcPromptLogin(props) {
  const [visible, setVisible] = React.useState(false);
  const [newPin, setNewPin] = React.useState("");
  const [retryCount, setRetryCount] = React.useState(0);


  const animValue = React.useRef(new Animated.Value(0)).current;
  const [_data, _setData] = useOutlet('androidPinPrompt');
  const {visible: _visible, message = '', newLogin = {}, onFinish = () => {}} = _data || {};

  React.useEffect(() => {
    if (_visible) {
      setVisible(true);
      Animated.timing(animValue, {
        duration: 300,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        duration: 200,
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [_visible, animValue]);

  function cancelNfcScan() {
    onFinish(false);
    _setData({visible: false, message});
  }

  const bgAnimStyle = {
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: animValue,
  };

  const promptAnimStyle = {
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
  };

  return (
    <Modal transparent={true} visible={visible}>
      <View style={[styles.wrapper]}>
        <View style={{flex: 1}} />

        <Animated.View style={[styles.prompt, promptAnimStyle]}>
          <Text style={{fontWeight: 'bold', fontSize: 24, color: Theme.colors.textPrimary}}>Potvrzení platby</Text>

          <View
            style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>


            <TextInput
                label="Potvrdit PIN"
                style={styles.input}
                onChangeText={text => setNewPin(text)}
                placeholderTextColor={Theme.colors.textSecondary}
                placeholder="PIN"
                keyboardType="numeric"
                autoFocus={true}
                secureTextEntry={true}
                editable={!!newLogin.pin}
            >
            </TextInput>

          </View>

          <View style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
            <Button mode="contained" onPress={cancelNfcScan}>
              Zrušit
            </Button>
            <Button mode="contained" onPress={() => {
              if (newPin.length < 4 || newPin.length > 12) {
                showToast({
                  message: `Špatný PIN!`,
                  type: 'alert',
                });
                console.warn("Invalid pin entry!");
                return;
              }

              if (retryCount > 2) {
                setRetryCount(0);
                showToast({
                  message: `Údaje se neshodují! Platba nebyla provedena.`,
                  type: 'alert',
                });
                console.warn("Invalid pin entry - not matching!")
                cancelNfcScan();
                return;
              }
              const trusted =  (typeof newLogin.pin === "string") ? Number.parseInt(newLogin.pin) : newLogin.pin;
              const provided = (typeof newPin === "string") ? Number.parseInt(newPin) : newPin;

              const valid = provided === trusted;
              if (!valid) {
                setRetryCount(retryCount+1);
              }
              onFinish(valid);
            }}>
              Potvrdit
            </Button>
          </View>
        </Animated.View>

        <Animated.View style={[styles.promptBg, bgAnimStyle]} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  promptBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  prompt: {
    height: 200,
    alignSelf: 'stretch',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    zIndex: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    margin: 20,
    width: "100%",
    height: 45,
    color: 'black',
    fontSize: 20,
    borderRadius: 7,
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: Theme.colors.grey
  }
});

export default NfcPromptLogin;
