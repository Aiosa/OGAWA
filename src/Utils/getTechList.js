import {Alert, Platform} from 'react-native';
import NfcManager, {NfcError} from "react-native-nfc-manager";

const getTechList = (tag) => {
  let techs = [];
  if (Platform.OS === 'ios') {
    if (!tag.tech) {
      // it might happen when we use legacy `registerTagEvent`
      return ['Ndef'];
    }
    techs.push(tag.tech);
  } else {
    techs = tag.techTypes;
  }
  return techs.map((tech) => tech.replace(/android\.nfc\.tech\./, ''));
};

const handleException = (ex) => {
  if (ex instanceof NfcError.UserCancel) {
    // bypass
  } else if (ex instanceof NfcError.Timeout) {
    Alert.alert('NFC Session Timeout');
  } else {
    console.warn(ex);

    if (Platform.OS === 'ios') {
      NfcManager.invalidateSessionWithErrorIOS(`${ex}`);
    } else {
      Alert.alert('NFC Error', `${ex}`);
    }
  }
};

export {getTechList, handleException};
