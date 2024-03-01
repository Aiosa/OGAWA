/**
 * Disabled for now
 */

import React, {PureComponent, useEffect, useState} from 'react';
import NfcManager, { NfcEvents, NfcTech, Ndef } from 'react-native-nfc-manager';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    StyleSheet,
    Text,
    View, Platform, TextInput, UIManager, Image, Linking,
} from 'react-native';

import {getOutlet} from "reconnect.js";
import {getNewOutlet} from 'reconnect.js';
import {crypt, decrypt} from "../../Utils/SaltCrypt";
import Toast, {showToast} from "../../Components/Toast";
import Theme from "../../Theme";
import {Button} from "react-native-paper";
import {nfcEnabled} from "../../Utils/nfcUtils";

getNewOutlet(
    'androidLoginPrompt',
    {
        visible: false,
    },
    {autoDelete: false},
);
getNewOutlet(
    'androidPinPrompt',
    {
        visible: false,
    },
    {autoDelete: false},
);

class RegisterPin extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            nfcHandled: false,
            nfcHandling: false,
            newPin: "",
            failedAttempts: 0,
        }
    }

    async componentDidMount() {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
            try {
                console.log("Tag discovered...", JSON.stringify(tag));
                let messages = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
                for (let message of messages) {
                    try {
                        let text = Ndef.text.decodePayload(message.payload);
                        if (!text) continue;
                        text = text.split('://');
                        console.log("Tag discovered...");
                        if (text && text.length === 2 && text[0] === "oagawa") {
                            let data = decrypt("salt", text);

                            data = typeof data === "string" ? JSON.parse(data) : data;
                            if (data.pin) {
                                showToast({
                                    message: `Karta je již zaregistrovaná!`,
                                    type: 'alert',
                                });
                                return;
                            }
                        }

                    } catch (e) {
                        console.warn("Skipping message", e);
                    }
                }

            } catch (e) {
                console.error("Failed to parse tag data!", e);
            }
        })
        this.requestNdfHandler();
    }

    async componentWillUnmount() {
        await NfcManager.unregisterTagEvent();
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    }

    async requestNdfHandler(handler=null, technology=NfcEvents.Ndef) {
        if (this.state.nfcHandling) return;
        await this.setState({
            nfcHandling: true
        });
        let error = null;

        try {
            if (handler) {
                if (this.state.nfcHandled) {
                    console.info("NDEF: Temporary disable detect routine.")
                    await NfcManager.unregisterTagEvent();
                }

                console.info("NDEF: Await Handler.")
                try {
                    technology && await NfcManager.requestTechnology(technology);
                    try {
                        await handler();
                    } catch (e) {
                        console.error("Writing data: ", e);
                        error = e;
                    }
                } finally {
                    technology && await NfcManager.cancelTechnologyRequest();
                }
            }

            await NfcManager.registerTagEvent();
            console.info("NDEF: Configure detect routine.")
        } finally {
            await this.setState({
                nfcHandled: true,
                nfcHandling: false
            });
        }

        if (error) throw error;
    }

    async writeNFC(data) {
        if (!data.pin) {
            console.log("Writing skip: no data to save.")
            return;
        }
        return this.requestNdfHandler(async () => {
            console.log("Prepare bytes current state")

            const bytes = Ndef.encodeMessage([Ndef.uriRecord(
                `ogawa://${crypt("salt", JSON.stringify(data))}`, 'ogawa'
            )]);
            console.log("Writing current state")
            if (bytes) {
                if (Platform.OS === "android") {
                    await NfcManager.ndefHandler.writeNdefMessage(bytes);
                    //todo
                    //await NfcManager.ndefFormatableHandlerAndroid.formatNdef(bytes);
                } else {
                    await NfcManager.ndefHandler.writeNdefMessage(bytes);
                }
            }
            console.log("Done");
            //Platform.OS === "android" ? NfcTech.NdefFormatable :
        }, NfcTech.Ndef);
    }

    onBack() {
        if (this.props.navigation.canGoBack()) {
            this.props.navigation.goBack();
        }
    }

    render() {

        const {newPin} = this.state;

        return ( <SafeAreaView style={{ paddingTop: 100 }}>
            <TouchableOpacity
                onPress={() => this.onBack()}
                style={{marginTop: 40, marginLeft: 40, zIndex: 100, position: "absolute", backgroundColor: "white", opacity: 0.6, borderRadius: 20, padding: 10}}
                hitSlop={{ top: 30, bottom: 30, left: 30, right: 50 }}
            >
                <Image source={require('../../../images/icon-back.png')} style={{tintColor: Theme.colors.textPrimary, height: 22,
                    width: 22,}}></Image>
            </TouchableOpacity>
            <View style={{display: "flex", flexDirection: "row", position: "absolute", top: 0, left: 0, right: 0}}>
                <Image source={require('../../../images/ogawa-big.png')} style={{height: 100, width: 250, flex: 1, }}></Image>

                <Image source={require('../../../images/scamgate.png')} style={{height: 100, width: 250, flex: 2 }}></Image>
            </View>


            <View style={{marginHorizontal: 25, marginVertical: 30}}>
                <Text style={{color: Theme.colors.textPrimary, fontSize: 25, fontWeight: 900}}>Zaregistrovat novou kartu</Text>
                <Text style={{color: Theme.colors.textSecondary, fontSize: 15, marginBottom: 20}}>Vyber nový pin a přilož kartu k jeho potvrzení. Pin nelze změnit. Pin musí být mezi 4 a 8 číslicemi.</Text>
                <TextInput
                    label="Vyber PIN"
                    style={styles.inputRegister}
                    onChangeText={text => {
                        this.setState({newPin: text});
                        this.setState({failedAttempts: true});
                    }}
                    placeholder="PIN"
                    placeholderTextColor={Theme.colors.textSecondary}
                    keyboardType="numeric"
                    secureTextEntry={true}
                />
                <TextInput
                    label="Potvrď PIN"
                    style={[styles.inputRegister, this.failedAttempts && {borderColor: Theme.colors.red}]}
                    onChangeText={text => {
                        const failed = this.state.newPin === text ? 0 : 1;
                        this.setState({failedAttempts: failed});
                    }}
                    placeholder="PIN (znovu)"
                    placeholderTextColor={Theme.colors.textSecondary}
                    keyboardType="numeric"
                    secureTextEntry={true}
                />
                <Button style={{marginTop: 20, marginHorizontal: 20}} mode="contained" onPress={async () => {
                    if (!await nfcEnabled()) {
                        return;
                    }

                    if (newPin.length < 4 || newPin.length > 12) {
                        showToast({
                            message: `Špatný PIN!`,
                            type: 'alert',
                        });
                        console.warn("Invalid pin entry!")
                        return;
                    }
                    if (this.state.failedAttempts) {
                        showToast({
                            message: `Údaje se neshodují!`,
                            type: 'alert',
                        });
                        console.warn("Invalid pin entry - not matching!")
                        return;
                    }

                    let finished = true;
                    getOutlet('androidLoginPrompt').update({
                        visible: true,
                        title: `OGAWA`,
                        message: 'Přiložte opět kartu k registraci',
                        onFinish: success => {
                            //finish will only call on cancel / timeout
                            finished = false;
                        }
                    });
                    try {
                        await this.writeNFC({pin: newPin});
                        showToast({
                            message: `Karta úspěšně registrovaná.`,
                            type: 'success',
                        });
                        getOutlet('androidLoginPrompt').update({
                            visible: false,
                        });
                        finished && this.onBack();
                    } catch (e) {
                        console.error("Card register failed", e);
                    }
                }}>Registrovat Kartu</Button>
            </View>
        </SafeAreaView>);
    }
}

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    highlight: {
        fontWeight: '700',
    },
    inputCompany: {
        paddingHorizontal: 20,
        paddingVertical: 2,
        marginVertical: 10,
        color: Theme.colors.textPrimary,
        fontSize: 30,
        textAlign: 'left',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    inputRegister: {
        paddingHorizontal: 20,
        paddingVertical: 2,
        marginVertical: 10,
        marginHorizontal: 20,
        color: Theme.colors.textPrimary,
        fontSize: 20,
        borderRadius: 9,
        borderColor: Theme.colors.textSecondary,
        borderWidth: 2,
        textAlign: 'left',
        fontWeight: 'bold',
    },
    inputSetAmount: {
        flex: 1,
        paddingHorizontal: 20,
        margin: 20,
        width: "100%",
        maxHeight: 80,
        color: Theme.colors.textPrimary,
        fontSize: 50,
        borderRadius: 7,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: Theme.colors.grey
    }
});

export default RegisterPin;
