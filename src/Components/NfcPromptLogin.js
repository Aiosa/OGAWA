import React from 'react';
import {Image, Text, View, Animated, StyleSheet, Modal, TouchableOpacity} from 'react-native';
import {Button} from 'react-native-paper';
import {useOutlet} from 'reconnect.js';
import Theme from "../Theme";

function NfcPromptLogin(props) {
  const [visible, setVisible] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const animValue = React.useRef(new Animated.Value(0)).current;
  const [_data, _setData] = useOutlet('androidLoginPrompt');
  const {visible: _visible, title = '', amount = 0, onAmountChange = null, message = '', onFinish = () => {}} = _data || {};

  React.useEffect(() => {
    if (_visible) {
      setVisible(true);
      setSelectedIndex(0);
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
        setSelectedIndex(0);
      });
    }
  }, [_visible, animValue]);

  function cancelNfcScan() {
    onFinish(false);
    setSelectedIndex(0);
    _setData({visible: false, title, message});
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
          <View
            style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8}}>
            <Text style={{color: Theme.colors.textPrimary, fontSize: 16, fontWeight: 700, letterSpacing: -0.2}}>BEZKONTAKTNÍ PLATBA</Text>

            <Text style={{color: Theme.colors.textPrimary, fontSize: 60, fontWeight: 700, marginBottom: 15}}>{title}</Text>

            { amount && onAmountChange ?
                (<View style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                  <TouchableOpacity
                      style={[styles.selectButton, selectedIndex === 0 ? {backgroundColor: Theme.colors.green} : {}]}
                      onPress={() => {
                        setSelectedIndex(0);
                        const newTitle = onAmountChange(amount);
                        if (newTitle) {
                          _setData({..._data, title: newTitle});
                        }
                      }}>
                    <Text
                      style={[styles.selectText, selectedIndex === 0 ? {color: Theme.colors.white} : {}]}
                    >Bez dýška</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.selectButton, selectedIndex === 1 ? {backgroundColor: Theme.colors.green} : {}]}
                      onPress={() => {
                        setSelectedIndex(1);
                        const newTitle = onAmountChange(Math.round(amount*1.01));
                        if (newTitle) {
                          _setData({..._data, title: newTitle});
                        }
                      }}>
                    <Text
                        style={[styles.selectText, selectedIndex === 1 ? {color: Theme.colors.white} : {}]}
                    >1%</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.selectButton, selectedIndex === 2 ? {backgroundColor: Theme.colors.green} : {}]}
                      onPress={() => {
                        setSelectedIndex(2);
                        const newTitle = onAmountChange(Math.round(amount*1.02));
                        if (newTitle) {
                          _setData({..._data, title: newTitle});
                        }
                      }}>
                    <Text
                        style={[styles.selectText, selectedIndex === 2 ? {color: Theme.colors.white} : {}]}
                    >2%</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                      style={[styles.selectButton, selectedIndex === 3 ? {backgroundColor: Theme.colors.green} : {}]}
                      onPress={() => {
                        setSelectedIndex(3);
                        const newTitle = onAmountChange(Math.round(amount*1.05));
                        if (newTitle) {
                          _setData({..._data, title: newTitle});
                        }
                      }}>
                    <Text
                        style={[styles.selectText, selectedIndex === 3 ? {color: Theme.colors.white} : {}]}
                    >5%</Text>
                  </TouchableOpacity>

                </View>) : <Image
                    source={require('../../images/n2g_512.png')}
                    style={{width: 120, height: 120, padding: 30, marginBottom: 20}}
                    resizeMode="contain"

                />
            }
            <Text style={{color: Theme.colors.textPrimary, paddingHorizontal: 12}}>{message}</Text>
          </View>

          <Button mode="contained" onPress={cancelNfcScan}>
            Zrušit
          </Button>
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
    height: 400,
    alignSelf: 'stretch',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    zIndex: 2,
  },
  selectButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Theme.colors.green,
    width: 60,
    height: 60,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
    marginBottom: 10
  },
  selectText: {
    color: Theme.colors.textPrimary
  }

});

export default NfcPromptLogin;
