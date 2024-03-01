import React from 'react';
import {createStorage} from './Utils/Storage';

const appAsyncStore = createStorage('appData');

const Context = React.createContext();

const Actions = {};

class Provider extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showNfcPrompt: false,
      storageCache: {},
    };
  }

  async componentDidMount() {
    Actions.setShowNfcPrompt = (show) => {
      this.setState({showNfcPrompt: show});
    };

    Actions.initStorage = async () => {
      const nextCache = await appAsyncStore.get(true);
      this.setState({storageCache: nextCache});
    };

    Actions.getStorage = () => {
      return this.state.storageCache;
    };

    Actions.setStorage = async (data) => {
      console.log("Save state ", data);
      await appAsyncStore.set(data);
      this.setState({storageCache: await appAsyncStore.get(true)});
    };
  }

  render() {
    return (
      <Context.Provider
        value={{
          state: this.state,
          actions: Actions,
        }}>
        {this.props.children}
      </Context.Provider>
    );
  }
}

export {Context, Provider, Actions};
