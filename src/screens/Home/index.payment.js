/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
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
    View, Platform, TextInput, UIManager,
} from 'react-native';

import {getOutlet} from "reconnect.js";
import {getNewOutlet} from 'reconnect.js';
import {crypt, decrypt} from "../../Utils/SaltCrypt";

getNewOutlet(
    'androidLoginPrompt',
    {
        visible: false,
    },
    {autoDelete: false},
);


class Home extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            nfcSupport: false,
            cardData: {},
            nfcHandled: false,
            nfcHandling: false,
            cardDetected: false,
            screen: "home",
            screenParams: {},
            newPin: "",
            paidAmount: 0,
            newLogin: {}
        }
    }

    async componentDidMount() {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
            console.log("Tag detected!");

            await this.setState({
                cardDetected: true
            });
            try {
                let messages = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
                for (let message of messages) {
                    try {
                        const text = Ndef.text.decodePayload(message.payload);
                        if (!text) continue;

                        let data = decrypt("salt", text);

                        data = typeof data === "string" ? JSON.parse(data) : data;
                        if (data.pin) {
                            console.log("Tag configured!");
                            await this.setState({
                                newLogin: data
                            });
                            await this.setScreen("login");
                            return;
                        }
                    } catch (e) {
                        console.warn("Skipping message", e);
                    }
                }
            } catch (e) {
                console.error("Failed to parse tag data!", e);
            }
        })
    }

    componentWillUnmount() {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    }

    async setScreen(screen, params={}) {
        await this.setState({
            screen: screen,
            screenParams: {
                ...this.state.screenParams,
                ...params
            }
        })
    }

    async login() {
        await this.setState({
           cardData: this.state.newLogin,
           newLogin: {},
           newPin: "",
           screen: "home",
        });
    }

    async logout() {
        await this.setState({
            cardData: {},
            newLogin: {},
            newPin: "",
            screen: "home",
            cardDetected: false
        });
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
                    await NfcManager.requestTechnology(technology);
                    try {
                        await handler();
                    } catch (e) {
                        console.error("Writing data: ", e);
                        error = e;
                    }
                } finally {
                    NfcManager.cancelTechnologyRequest();
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
        data = data || this.state.cardData;
        if (!data.pin) {
            console.log("Writing skip: no data to save.")
            return;
        }
        await this.requestNdfHandler(async () => {
            console.log("Prepare bytes current state")

            const bytes = Ndef.encodeMessage([Ndef.textRecord(crypt("salt", JSON.stringify(data)))]);
            console.log("Writing current state")
            if (bytes) {
                if (Platform.OS === "android") {
                    await NfcManager.ndefHandler.writeNdefMessage(bytes);

                    //await NfcManager.ndefFormatableHandlerAndroid.formatNdef(bytes);
                } else {
                    //todo
                    await NfcManager.ndefHandler.writeNdefMessage(bytes);
                }
            }
            console.log("Done")

            //Platform.OS === "android" ? NfcTech.NdefFormatable :
        }, NfcTech.Ndef);
    }

    render() {

        const {screen, cardDetected, cardData, newPin, newLogin} = this.state;

        console.log("Screen:", screen);
        if (!cardDetected) {

            if (screen === "home") {
                return (
                    <SafeAreaView>
                        <TextInput
                            label="Zaplatit částku"
                            style={styles.input}
                            onChangeText={async text => {
                                let num = Number.parseInt(text);
                                if (!isNaN(num)) {
                                    await this.setState({
                                        paidAmount: num
                                    });
                                }
                            }}
                            placeholder="Kč"
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={[styles.btn, styles.btnScan]} onPress={async () => {
                            // setScreenParams("requestPayment", true);
                            getOutlet('androidLoginPrompt').update({
                                visible: true,
                                message: 'Ready to scan NFC',
                            });
                        }}>
                            <Text style={{ color: "white" }}>Zaplatit</Text>
                        </TouchableOpacity>

                        {

                        }
                    </SafeAreaView>
                );
            }

            if (screen === "payment") {
                return (
                    <SafeAreaView>
                        <TouchableOpacity style={[styles.btn, styles.btnScan]}>
                            <Text style={{ color: "white" }}>Přilož kreditní kartu.</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                );
            }

            if (screen === "register") {
                if (! cardData.pin) {
                    return (
                        <SafeAreaView>
                            <TextInput
                                label="Vyber PIN"
                                style={styles.input}
                                onChangeText={text => this.setState({newPin: text})}
                                placeholder="PIN"
                                keyboardType="numeric"
                                editable={!cardData.pin}
                            />
                            <TouchableOpacity style={[styles.btn, styles.btnScan]} onPress={async () => {
                                if (newPin.length < 4 || newPin.length > 12) {
                                    //todo err
                                    console.warn("Invalid pin entry!")
                                    return;
                                }

                                await this.writeNFC({pin: newPin, mouney: 0});
                                //todo message success!
                                await this.logout();
                            }}>
                                <Text style={{ color: "white" }}>Zaregistrovat se</Text>
                            </TouchableOpacity>
                        </SafeAreaView>
                    );
                } else {
                    this.logout();
                }
            }
        }

        if (screen === "home") {

            if (! cardData.pin) {
                return (
                    <SafeAreaView>
                        <TouchableOpacity style={[styles.btn, styles.btnScan]} onPress={() => this.setScreen("register")}>
                            <Text style={{ color: "white" }}>Zaregistrovat jako nový uživatel.</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                );
            } else {
                //todo
            }

        } else if (screen === "login") {
            return ( <SafeAreaView>
                <TextInput
                    label="Přihlášení"
                    style={styles.input}
                    onChangeText={text => this.setState({newPin: text})}
                    placeholder="PIN"
                    keyboardType="numeric"
                    editable={!!newLogin.pin}
                />
                <TouchableOpacity style={[styles.btn, styles.btnScan]}
                                  disabled={!newLogin.pin}
                                  onPress={() => {
                                      if (newPin.length < 4 || newPin.length > 12) {
                                          //todo err
                                          console.warn("Invalid pin entry!")
                                          return;
                                      }

                                      const trusted =  (typeof newLogin.pin === "string") ? Number.parseInt(newLogin.pin) : newLogin.pin;
                                      const provided = (typeof newPin === "string") ? Number.parseInt(newPin) : newPin;


                                      if (provided === trusted) {
                                          this.login();
                                      } else {
                                          console.error("Bad login!", newPin, newLogin.pin);
                                          //todo some retry then fail, and messages!
                                          this.logout();
                                      }
                                  }}>
                    <Text style={{ color: "white" }}>Přihlásit se</Text>
                </TouchableOpacity>
            </SafeAreaView>);
        }

        return (
            <SafeAreaView style={styles.sectionContainer}>
                <Text>Hello world</Text>
                <TouchableOpacity style={[styles.btn, styles.btnScan]}>
                    <Text style={{ color: "white" }}>Scan Tag</Text>
                </TouchableOpacity>
                {/*<TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={cancelReadTag}>*/}
                {/*  <Text style={{ color: "white" }}>Cancel Scan</Text>*/}
                {/*</TouchableOpacity>*/}
                <TouchableOpacity style={[styles.btn, styles.btnWrite]} onPress={this.writeNFC}>
                    <Text style={{ color: "white" }}>Write Tag</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
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
});

export default Home;
