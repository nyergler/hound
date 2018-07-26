import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import promiseMiddleware from 'redux-promise';
import logger from 'redux-logger';
import { search } from './actions';
import searchApp from './reducers.js';

import SearchBar from './components/SearchBar.jsx';
import ResultView from './components/ResultView.jsx';

import { UrlToRepo } from './common';

const qs = params => Object.keys(params).map(key => `${key}=${params[key]}`).join('&');

const ParamsFromQueryString = function (qs, params) {
  params = params || {};

  if (!qs) {
    return params;
  }

  qs.substring(1).split('&').forEach((v) => {
    const pair = v.split('=');
    if (pair.length != 2) {
      return;
    }

    params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  });


  return params;
};

const ParamsFromUrl = function (params) {
  params = params || {
    q: '',
    i: true,
    files: '',
    repos: '*',
  };
  return ParamsFromQueryString(location.search, params);
};


class App extends React.Component {
  componentWillMount() {
    const params = ParamsFromUrl();
    this.setStateFromParams(params);

    window.addEventListener('popstate', (e) => {
      const params = ParamsFromUrl();
      this.setStateFromParams(params);
      this.props.dispatch(search(params));
    });
  }

  setStateFromParams(params) {
    const repos = (params.repos == '') ? [] : params.repos.split(',');

    this.setState({
      q: params.q,
      i: params.i === 'true',
      files: params.files,
      repos,
    });
  }

  updateHistory(params) {
    const path = `${location.pathname
    }?q=${encodeURIComponent(params.q)
    }&i=${encodeURIComponent(params.i)
    }&files=${encodeURIComponent(params.files)
    }&repos=${params.repos}`;
    history.pushState({ path }, '', path);
  }

  onSearchRequested(params) {
    this.updateHistory(params);
    this.props.dispatch(search(params));
  }

  render() {
    return (
      <div>
        <SearchBar
          q={this.state.q}
          i={this.state.i}
          searchFiles={this.state.files}
          searchRepos={this.state.repos}
          onSearch={this.onSearchRequested.bind(this)}
        />
        <ResultView q={this.state.q} />
      </div>
    );
  }
}

const store = createStore(
  searchApp,
  applyMiddleware(promiseMiddleware, logger),
);

render(
  <Provider store={store}>
    <App
      dispatch={store.dispatch}
    />
  </Provider>,
  document.getElementById('root'),
);
