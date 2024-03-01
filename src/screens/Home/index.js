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
    View, Platform, TextInput, UIManager, Image, Linking,
} from 'react-native';

import {getOutlet} from "reconnect.js";
import {getNewOutlet} from 'reconnect.js';
import {crypt, decrypt} from "../../Utils/SaltCrypt";
import {handleException} from "../../Utils/getTechList";
import * as AppContext from "../../AppContext";
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

class Home extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            nfcSupport: false,
            cardData: {},
            nfcHandling: false,
            cardDetected: false,
            screen: "home",
            screenParams: {},
            newPin: "",
            paidAmount: 0,
            newLogin: {},
            failedAttempts: 0,
            paidAmountChangeable: false,
            teamData: {}
        }
    }

    async componentDidMount() {
        //todo in some root component instead?
        await AppContext.Actions.initStorage();

        const storage = AppContext.Actions.getStorage();
        if (!storage.balance) {
            const value = {balance: 0, name: "Dáme dítě"};
            await AppContext.Actions.setStorage(value);
            await this.setState({teamData: value});
        } else {
            await this.setState({teamData: storage});
        }

        Linking.addEventListener("url", async e => {
            let text = e && e.url && e.url.split('://');
            console.log("Tag discovered...", e);
            if (text && text.length === 2 && text[0] === "ogawa") {
                try {
                    let data = decrypt("salt", text[1]);
                    data = typeof data === "string" ? JSON.parse(data) : data;
                    if (data.pin) {
                        console.log("Received a configured card! Skipping interaction...");
                        return;
                    }
                } catch (e) {
                    console.warn("Skipping message", e);
                }
                //try registering
                await this.logout();
                await this.setScreen("register");
            }
        });
    }

    async setScreen(screen, params={}) {
        if (screen === "home") {
            params = {
                ...params,
                cardData: {},
                newLogin: {},
                newPin: "",
                screen: "home",
                cardDetected: false
            }
        }

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

        if (this.state.nfcHandling) {
            console.log("Still handling previous request!");
            return;
        }
        await this.setState({
            nfcHandling: true
        });
        let error = null;

        try {
            if (handler) {

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

            console.info("NDEF: Configure detect routine.")
        } finally {
            await this.setState({
                nfcHandling: false
            });
        }

        if (error) throw error;
    }

    async abortNdefOnce() {
        NfcManager.unregisterTagEvent().catch(() => 0);
        await NfcManager.cancelTechnologyRequest();
        await this.setState({
            nfcHandling: false
        });
    }

    async readNdefOnce() {
        const _this = this;

        return new Promise((resolve) => {
            let tagFound = false;

            NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag) => {
                tagFound = true;
                await _this.setState({
                    cardDetected: true
                });
                console.log("Once read: card detected", tag);
                try {
                    let messages = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
                    for (let message of messages) {
                        try {
                            let text = Ndef.uri.decodePayload(message.payload);
                            text = typeof text === "string" && text.split('://');

                            if (text && text.length === 2 && text[0] === "ogawa") {
                                let data = decrypt("salt", text[1]);

                                data = typeof data === "string" ? JSON.parse(data) : data;
                                if (data.pin) {
                                    console.log("Tag configured!");
                                    await _this.setState({
                                        newLogin: data
                                    });
                                }
                            } else {
                                console.log("Skipping invalid tag data...");
                            }
                        } catch (e) {
                            console.warn("Skipping message", e);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse tag data!", e);
                }

                NfcManager.unregisterTagEvent().catch(() => 0);
                resolve();
            });

            NfcManager.setEventListener(NfcEvents.SessionClosed, (error) => {
                if (error) {
                    handleException(error);
                }

                this.abortNdefOnce();
                if (!tagFound) {
                    NfcManager.unregisterTagEvent().catch(() => 0);
                    resolve();
                }
            });

            NfcManager.registerTagEvent();
        });
    }

    
    async writeNFC(data) {
        data = data || this.state.cardData;
        if (!data.pin) {
            console.log("Writing skip: no data to save.")
            return;
        }
        await this.requestNdfHandler(async () => {
            console.log("Prepare bytes current state")

            const bytes = Ndef.encodeMessage([Ndef.uriRecord(
                `ogawa://${crypt("salt", JSON.stringify(data))}`, 'ogawa'
            )]);
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
            console.log("Done");

            //Platform.OS === "android" ? NfcTech.NdefFormatable :
        }, NfcTech.Ndef);
    }

    onBack() {
        this.setScreen("home");
    }

    handleBackPress = () => {
        this.onBack();
        return true;
    };

    render() {

        const {screen, teamData, cardData, newPin, newLogin, paidAmount} = this.state;

        const backIcon = <TouchableOpacity
            onPress={() => this.onBack()}
            style={{marginTop: 40, marginLeft: 40, zIndex: 100, position: "absolute", backgroundColor: "white", opacity: 0.6, borderRadius: 20, padding: 10}}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 50 }}
        >
            <Image source={require('../../../images/icon-back.png')} style={{tintColor: Theme.colors.textPrimary, height: 22,
                width: 22,}}></Image>
        </TouchableOpacity>;


        if (screen === "payment") {
            return (
                <SafeAreaView style={{height: "100%"}}>
                    {backIcon}

                    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20}}>
                        <Image source={require('../../../images/scamgate.png')} style={{height: 65, width: 160 }}></Image>
                        <Text style={{color: Theme.colors.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 15, marginTop: 45}}>PLATBA</Text>
                        <TextInput
                            label="Zaplatit částku"
                            style={styles.inputSetAmount}
                            onChangeText={text => {
                                text = text && text.match(/\d|\./g);
                                if (!text) {
                                    this.setState({
                                        paidAmount: 0
                                    });
                                    return;
                                }

                                let num = Number.parseInt(text.join(''));
                                if (!isNaN(num)) {
                                    this.setState({
                                        paidAmount: num
                                    });
                                } else {
                                    console.warn("ASDAS")
                                }
                            }}
                            value={paidAmount ? `Kč ${paidAmount}` : ""}
                            placeholder="zadejte"
                            placeholderTextColor={Theme.colors.textSecondary}
                            keyboardType="numeric"
                        />

                        <Button mode="contained" icon="contactless-payment" onPress={async () => {
                            if (!await nfcEnabled()) {
                                return;
                            }

                            await this.setState({
                                failedAttempts: 0,
                                newLogin: {}
                            });

                            let finalAmount = paidAmount;
                            getOutlet('androidLoginPrompt').update({
                                visible: true,
                                title: `Kč ${finalAmount}`,
                                amount: paidAmount,
                                onAmountChange: (newAmount) => {
                                    finalAmount = newAmount;
                                    return `Kč ${finalAmount}`;
                                },
                                message: 'Přiložte platební kartu',
                                onFinish: success => {
                                    //finish will only call on cancel / timeout
                                    setTimeout(() => {
                                        NfcManager.cancelTechnologyRequest().catch(() => 0);
                                    }, 200);
                                    this.abortNdefOnce();
                                    this.setState({
                                        failedAttempts: 0,
                                        newLogin: {}
                                    });
                                }
                            });

                            await this.requestNdfHandler(this.readNdefOnce.bind(this), null);

                            if (this.state.newLogin.pin) {

                                getOutlet('androidLoginPrompt').update({visible: false});

                                getOutlet('androidPinPrompt').update({
                                    visible: true,
                                    newLogin: this.state.newLogin,
                                    onFinish: async success => {
                                        if (success) {
                                            const storage = AppContext.Actions.getStorage();
                                            await AppContext.Actions.setStorage({...storage,
                                                balance: storage.balance + finalAmount});
                                            await this.setState({
                                                paidAmount: 0,
                                                teamData: AppContext.Actions.getStorage()
                                            });
                                            getOutlet('androidPinPrompt').update({visible: false});
                                            await this.setScreen("home");
                                        } else {
                                            if (this.state.failedAttempts > 2) {
                                                showToast({
                                                    message: `Platba zamítnuta!`,
                                                    type: 'alert',
                                                });
                                                getOutlet('androidPinPrompt').update({visible: false});
                                                return;
                                            }
                                            showToast({
                                                message: `Neplatný PIN!`,
                                                type: 'alert',
                                            });
                                            await this.setState({
                                                failedAttempts: this.state.failedAttempts+1
                                            })
                                        }
                                    }
                                });
                            } else {
                                console.warn("Login: no data available!");
                            }
                            await this.requestNdfHandler();
                        }}>
                            Předat k vyúčtování
                        </Button>
                    </View>

                </SafeAreaView>
            );
        }

        return ( <SafeAreaView style={{ paddingTop: 100 }}>
            {screen !== "home" && backIcon}
            <View style={{display: "flex", flexDirection: "row", position: "absolute", top: 0, left: 0, right: 0}}>
                <Image source={require('../../../images/ogawa-big.png')} style={{height: 100, width: 250, flex: 1, }}></Image>

                <Image source={require('../../../images/scamgate.png')} style={{height: 100, width: 250, flex: 2 }}></Image>
            </View>

            {
                screen === "home" && <View style={{marginHorizontal: 25, marginVertical: 30}}>

                    <Text style={{color: Theme.colors.textSecondary, fontSize: 15}}>
                        Společnost
                    </Text>
                    <TextInput
                        label="Uživatel"
                        style={styles.inputCompany}
                        onSubmitEditing={async event => {
                            const text = event.text || event.nativeEvent.text;
                            const storage = AppContext.Actions.getStorage();
                            const data = {...storage, name: text};
                            await AppContext.Actions.setStorage(data);
                            await this.setState({teamData: data});
                        }}
                        placeholder={teamData.name}
                        placeholderTextColor={Theme.colors.textSecondary}
                    />

                    <Text style={{color: Theme.colors.textSecondary, fontSize: 15, marginTop: 30}}>
                        Zůstatek
                    </Text>
                    <Text
                        label="Zůstatek"
                        style={styles.inputCompany}
                    >{teamData.balance} Kč</Text>
                    <Button mode="contained" icon="smart-card" style={{marginTop: 50}} onPress={async () => {
                        this.setScreen("payment")
                    }}>
                        <Text>Vyžádat platbu</Text>
                    </Button>

                    {/*<Button mode="outlined" style={{marginTop: 80}} onPress={async () => {*/}
                    {/*    this.props.navigation.navigate("RegisterPin");*/}
                    {/*}}>*/}
                    {/*    <Text>Registrovat kartu</Text>*/}
                    {/*</Button>*/}
                </View>
            }

            {
                screen === "register" && <View style={{marginHorizontal: 25, marginVertical: 30}}>
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
                            finished && await this.logout();
                            getOutlet('androidLoginPrompt').update({
                                visible: false,
                            });
                        } catch (e) {
                            console.error("Card register failed", e);
                        }
                        //todo message success!

                    }}>Registrovat Kartu</Button>
                </View>
            }
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

export default Home;
