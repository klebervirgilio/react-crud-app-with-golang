import React, { Component } from 'react';
import AppBar from './Layout/AppBar';
import Home from './Home';

class App extends Component {
  render() {
    return (
      <div className="App">
        <AppBar />
        <Home />
      </div>
    );
  }
}

export default App;