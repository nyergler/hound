import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';

import { loadRepos, search } from '../actions';
import RepoOption from './RepoOption.jsx';
import Styles from './SearchBar.css';

var FormatNumber = function (t) {
  var s = '' + (t | 0),
    b = [];
  while (s.length > 0) {
    b.unshift(s.substring(s.length - 3, s.length));
    s = s.substring(0, s.length - 3);
  }
  return b.join(',');
};

var ParamValueToBool = function (v) {
  v = v.toLowerCase();
  return v == 'fosho' || v == 'true' || v == '1';
};

export class SearchBar extends React.Component {

  constructor(props) {
    super(props);
    this.state = this.getInitialState();
  }

  componentDidMount() {
    this.props.loadRepositories();

    var q = this.refs.q;

    // TODO(knorton): Can't set this in jsx
    q.setAttribute('autocomplete', 'off');

    this.setParams(this.props);

    if (this.hasAdvancedValues()) {
      this.showAdvanced();
    }

    q.focus();
  }

  getInitialState() {
    return {
      advanced: false,
      state: null,
      allRepos: [],
      repos: []
    };
  }

  queryGotKeydown(event) {
    switch (event.keyCode) {
      case 40:
        // this will cause advanced to expand if it is not expanded.
        React.findDOMNode(files).focus();
        this.refs.files.focus();
        break;
      case 38:
        this.setState({ advanced: false });
        break;
      case 13:
        this.submitQuery();
        break;
    }
  }

  queryGotFocus(event) {
    if (!this.hasAdvancedValues()) {
      this.hideAdvanced();
    }
  }

  filesGotKeydown(event) {
    switch (event.keyCode) {
      case 38:
        // if advanced is empty, close it up.
        if (this.refs.files.value.trim() === '') {
          this.hideAdvanced();
        }
        this.refs.q.focus();
        break;
      case 13:
        this.submitQuery();
        break;
    }
  }

  filesGotFocus(event) {
    this.showAdvanced();
  }

  submitQuery() {
    this.props.onSearch(this.getParams());
  }

  getRegExp() {
    return new RegExp(
      this.refs.q.value.trim(),
      this.refs.icase.checked ? 'ig' : 'g');
  }

  getParams() {
    // selecting all repos is the same as not selecting any, so normalize the url
    // to have none.
    // var repos = Model.ValidRepos(this.refs.repos.state);
    // if (repos.length == Model.RepoCount()) {
    //   repos = [];
    // }
    console.log(this.refs.repos.state);
    var repos = [];

    return {
      q: this.refs.q.value.trim(),
      files: this.refs.files.value.trim(),
      repos: repos.join(','),
      i: this.refs.icase.checked ? 'fosho' : 'nope'
    };
  }

  setParams(params) {
    var q = this.refs.q,
      i = this.refs.icase,
      files = this.refs.files;

    q.value = params.q;
    i.checked = ParamValueToBool(params.i);
    files.value = params.files;
  }

  hasAdvancedValues() {
    return this.refs.files.value.trim() !== '' || this.refs.icase.checked || this.refs.repos.value !== '';
  }

  toggleAdvanced() {
    this.setState({ showAdvanced: !this.state.showAdvanced });
  }

  render() {
    var repoCount = this.props.repos.length,
      repoOptions = [],
      selected = {};

    this.state.repos.forEach(function (repo) {
      selected[repo] = true;
    });

    this.props.repoNames.forEach(function (repoName) {
      repoOptions.push(<RepoOption key={repoName} value={repoName} selected={selected[repoName]} />);
    });

    var stats = this.props.stats;
    var statsView = '';
    if (stats) {
      statsView = (
        <div className="stats">
          <div className="stats-left">
            <a href="excluded_files.html"
              className="link-gray">
              Excluded Files
              </a>
          </div>
          <div className="stats-right">
            <div className="val">{FormatNumber(stats.Total)}ms total</div> /
              <div className="val">{FormatNumber(stats.Server)}ms server</div> /
              <div className="val">{stats.Files} files</div>
          </div>
        </div>
      );
    }

    return (
      <div id="input">
        <div id="ina">
          <input id="q"
            type="text"
            placeholder="Search by Regexp"
            ref="q"
            autoComplete="off"
            onKeyDown={this.queryGotKeydown.bind(this)}
            onFocus={this.queryGotFocus.bind(this)} />
          <div className="button-add-on">
            <button id="dodat" onClick={this.submitQuery.bind(this)}></button>
          </div>
        </div>

        <div id="inb">
          <div id="adv" className={this.state.showAdvanced ? Styles.showAdvanced : Styles.hideAdvanced}>
            <span className="octicon octicon-chevron-up hide-adv" onClick={this.toggleAdvanced.bind(this)}></span>
            <div className="field">
              <label htmlFor="files">File Path</label>
              <div className="field-input">
                <input type="text"
                  id="files"
                  placeholder="regexp"
                  ref="files"
                  onKeyDown={this.filesGotKeydown.bind(this)}
                  onFocus={this.filesGotFocus.bind(this)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ignore-case">Ignore Case</label>
              <div className="field-input">
                <input id="ignore-case" type="checkbox" ref="icase" />
              </div>
            </div>
            <div className="field">
              <label className="multiselect_label" htmlFor="repos">Select Repo</label>
              <div className="field-input">
                <select id="repos" className="form-control multiselect" multiple={true} size={Math.min(16, repoCount)} ref="repos">
                  {repoOptions}
                </select>
              </div>
            </div>
          </div>
          <div className="ban" className={this.state.showAdvanced ? Styles.hideBanner : Styles.showBanner} onClick={this.toggleAdvanced.bind(this)}>
            <em>Advanced:</em> ignore case, filter by path, stuff like that.
            </div>
        </div>
        {statsView}
      </div>
    );
  }
}

SearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

const mapDispatchToProps = dispatch => {
  return {
    loadRepositories: () => dispatch(loadRepos()),
    onSearch: params => dispatch(search(params))
  }
}

const mapStateToProps = ({ repos, repoNames, stats, }) => {
  return {
    repos,
    repoNames,
    stats,
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchBar);
