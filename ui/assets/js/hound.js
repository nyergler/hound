import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import promiseMiddleware from 'redux-promise';
import logger from 'redux-logger'
import { search } from './actions';
import searchApp from './reducers.js';

import SearchBar from './components/SearchBar.jsx';
import ResultView from './components/ResultView.jsx';

import {UrlToRepo} from './common';

const qs = (params) => Object.keys(params).map(key => key + '=' + params[key]).join('&');

var Signal = function() {
};

Signal.prototype = {
  listeners : [],

  tap: function(l) {
    // Make a copy of the listeners to avoid the all too common
    // subscribe-during-dispatch problem
    this.listeners = this.listeners.slice(0);
    this.listeners.push(l);
  },

  untap: function(l) {
    var ix = this.listeners.indexOf(l);
    if (ix == -1) {
      return;
    }

    // Make a copy of the listeners to avoid the all to common
    // unsubscribe-during-dispatch problem
    this.listeners = this.listeners.slice(0);
    this.listeners.splice(ix, 1);
  },

  raise: function() {
    var args = Array.prototype.slice.call(arguments, 0);
    this.listeners.forEach(function(l) {
      l.apply(this, args);
    });
  }
};

var ParamsFromQueryString = function(qs, params) {
  params = params || {};

  if (!qs) {
    return params;
  }

  qs.substring(1).split('&').forEach(function(v) {
    var pair = v.split('=');
    if (pair.length != 2) {
      return;
    }

    params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  });


  return params;
};

var ParamsFromUrl = function(params) {
  params = params || {
    q: '',
    i: 'nope',
    files: '',
    repos: '*'
  };
  return ParamsFromQueryString(location.search, params);
};


/**
 * The data model for the UI is responsible for conducting searches and managing
 * all results.
 */
var Model = {
  // raised when a search begins
  willSearch: new Signal(),

  // raised when a search completes
  didSearch: new Signal(),

  willLoadMore: new Signal(),

  didLoadMore: new Signal(),

  didError: new Signal(),

  LoadMore: function(repo) {
    var _this = this,
        results = this.resultsByRepo[repo],
        numLoaded = results.Matches.length,
        numNeeded = results.FilesWithMatch - numLoaded,
        numToLoad = Math.min(2000, numNeeded),
        endAt = numNeeded == numToLoad ? '' : '' + numToLoad;

    _this.willLoadMore.raise(this, repo, numLoaded, numNeeded, numToLoad);

    const params = {
      ...this.params,
      rng: numLoaded+':'+endAt,
      repos: repo
    };

    fetch(`api/v1/search?${qs(params)}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.Error) {
        _this.didError.raise(_this, data.Error);
        return;
      }

      var result = data.Results[repo];
      results.Matches = results.Matches.concat(result.Matches);
      _this.didLoadMore.raise(_this, repo, _this.results);
    })
    .catch(() => _this.didError.raise(this, "The server broke down"));
  },

};



class App extends React.Component{
  componentWillMount() {
    var params = ParamsFromUrl(),
        repos = (params.repos == '') ? [] : params.repos.split(',');

    this.setState({
      q: params.q,
      i: params.i,
      files: params.files,
      repos: repos
    });

    window.addEventListener('popstate', (e) => {
      var params = ParamsFromUrl();
      this.refs.searchBar.setParams(params);
      this.props.dispatch(search(params));
    });

    if (params.q) {
      this.props.dispatch(search(params));
    }
  }

  updateHistory(params) {
    var path = location.pathname +
      '?q=' + encodeURIComponent(params.q) +
      '&i=' + encodeURIComponent(params.i) +
      '&files=' + encodeURIComponent(params.files) +
      '&repos=' + params.repos;
    history.pushState({path:path}, '', path);
  }

  onSearchRequested(params) {
    this.updateHistory(params);
    this.props.dispatch(search(params));
  }

  render() {
    return (
      <div>
        <SearchBar ref="searchBar"
            q={this.state.q}
            i={this.state.i}
            searchFiles={this.state.files}
            searchRepos={this.state.repos}
            onSearch={this.onSearchRequested.bind(this)}
          />
        <ResultView ref="resultView" q={this.state.q} />
      </div>
    );
  }
};

const store = createStore(
  searchApp,
  applyMiddleware(promiseMiddleware, logger)
);

render(
  <Provider store={store}>
    <App
      dispatch={store.dispatch}
    />
  </Provider>,
  document.getElementById('root')
);
