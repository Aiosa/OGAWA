import React from 'react';
import {View, Text, StyleSheet, Dimensions, Animated} from 'react-native';
import {useOutlet, getOutlet, getNewOutlet} from 'reconnect.js';
import Theme from "../Theme";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

getNewOutlet('toast', {message: '', type: ''}, {autoDelete: false});

function showToast({message, type}) {
  getOutlet('toast').update({message, type});
}

function Toast(props) {
  const [toast, setToast] = useOutlet('toast');
  // toast = {message: '', type: ' alert / success'}
  const [text, setText] = React.useState('');
  const [type, setType] = React.useState('');

  const animValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    async function onToastChange() {
      if (toast.message) {
        setText(toast.message);
        setType(toast.type);
        Animated.timing(animValue, {
          toValue: 1,
          useNativeDriver: true,
          duration: 300,
        }).start(async () => {
          await delay(2000);
          setToast('');
        });
      } else {
        Animated.timing(animValue, {
          toValue: 0,
          useNativeDriver: true,
          duration: 300,
        }).start(() => {
          setText('');
        });
      }
    }

    onToastChange();
  }, [toast, setToast, animValue]);

  const animStyle = {
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.bottom, animStyle]}>
      <View
        style={[
          (type === 'alert' && styles.alertContent) || styles.successContent,
          {flexDirection: 'row', alignItems: 'center'},
        ]}>

        <Text style={{color: Theme.colors.grey}}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: Dimensions.get('window').width,
    padding: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    borderRadius: 5,
    padding: 15,
    backgroundColor: '#b74b4b',

  },
  successContent: {
    borderRadius: 5,
    padding: 15,
    backgroundColor: '#12c2a2',
  },
});

export default Toast;

export {showToast};
