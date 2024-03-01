import NfcManager from "react-native-nfc-manager";
import {showToast} from "../Components/Toast";
import {Platform} from "react-native";

export async function nfcEnabled() {
    if (!await NfcManager.isEnabled()) {
        showToast({
            message: `Je potřeba zapnout NFC`,
            type: 'alert',
        });
        if (Platform.OS === "android") {
            await NfcManager.goToNfcSetting();
        }
        return false;
    }
    return true;
}