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

  didLoadRepos : new Signal(),

  ValidRepos: function(repos) {
    var all = this.repos,
        seen = {};
    return repos.filter(function(repo) {
      var valid = all[repo] && !seen[repo];
      seen[repo] = true;
      return valid;
    });
  },

  RepoCount: function() {
    return Object.keys(this.repos).length;
  },

  Load: function() {
    var _this = this;
    var next = function() {
      var params = ParamsFromUrl();
      _this.didLoadRepos.raise(_this, _this.repos);

      if (params.q !== '') {
        _this.Search(params);
      }
    };

    fetch('api/v1/repos')
    .then((response) => response.json())
    .then((data) => {
      _this.repos = data;
      next();
    })
    .catch((response) => console.log(response));
  },

  Search: function(params) {
    this.willSearch.raise(this, params);
    var _this = this,
        startedAt = Date.now();

    params = {
      stats: 'fosho',
      repos: '*',
      rng: ':20',
      ...params
    };

    if (params.repos === '') {
      params.repos = '*';
    }

    _this.params = params;

    // An empty query is basically useless, so rather than
    // sending it to the server and having the server do work
    // to produce an error, we simply return empty results
    // immediately in the client.
    if (params.q == '') {
      _this.results = [];
      _this.resultsByRepo = {};
      _this.didSearch.raise(_this, _this.Results);
      return;
    }
    store.dispatch(search(params));
  },

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

  NameForRepo: function(repo) {
    var info = this.repos[repo];
    if (!info) {
      return repo;
    }

    var url = info.url,
        ax = url.lastIndexOf('/');
    if (ax  < 0) {
      return repo;
    }

    var name = url.substring(ax + 1).replace(/\.git$/, '');

    var bx = url.lastIndexOf('/', ax - 1);
    if (bx < 0) {
      return name;
    }

    return url.substring(bx + 1, ax) + ' / ' + name;
  },

  UrlToRepo: function(repo, path, line, rev) {
    return UrlToRepo(this.repos[repo], path, line, rev);
  }

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

    var _this = this;
    Model.didLoadRepos.tap(function(model, repos) {
      // If all repos are selected, don't show any selected.
      if (model.ValidRepos(_this.state.repos).length == model.RepoCount()) {
        _this.setState({repos: []});
      }
    });

    Model.didSearch.tap(function(model, results, stats) {
      _this.refs.searchBar.setState({
        stats: stats,
        repos: repos,
      });

      _this.refs.resultView.setState({
        results: results,
        regexp: _this.refs.searchBar.getRegExp(),
        error: null
      });
    });

    Model.didLoadMore.tap(function(model, repo, results) {
      _this.refs.resultView.setState({
        results: results,
        regexp: _this.refs.searchBar.getRegExp(),
        error: null
      });
    });

    Model.didError.tap(function(model, error) {
      _this.refs.resultView.setState({
        results: null,
        error: error
      });
    });

    window.addEventListener('popstate', function(e) {
      var params = ParamsFromUrl();
      _this.refs.searchBar.setParams(params);
      Model.Search(params);
    });
  }

  onSearchRequested(params) {
    this.updateHistory(params);
    Model.Search(this.refs.searchBar.getParams());
  }

  updateHistory(params) {
    var path = location.pathname +
      '?q=' + encodeURIComponent(params.q) +
      '&i=' + encodeURIComponent(params.i) +
      '&files=' + encodeURIComponent(params.files) +
      '&repos=' + params.repos;
    history.pushState({path:path}, '', path);
  }

  render() {
    return (
      <div>
        <SearchBar ref="searchBar"
            q={this.state.q}
            i={this.state.i}
            files={this.state.files}
            repos={this.state.repos}
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
    <App />
  </Provider>,
  document.getElementById('root')
);
