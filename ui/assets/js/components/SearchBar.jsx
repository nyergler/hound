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
    this.state = this.getInitialState(props);
  }

  componentDidMount() {
    this.props.loadRepositories();
    if (this.props.q) {
      this.props.onSearch(this.getParams());
    }
  }

  getInitialState(props) {
    return {
      advanced: false,
      allRepos: [],
      repos: props.searchRepos || [],
      q: props.q,
      icase: props.i,
      files: props.searchFiles,
    };
  }

  queryGotKeydown(event) {
    switch (event.keyCode) {
      case 40:
        // this will cause advanced to expand if it is not expanded.
        React.findDOMNode(files).focus();
        // this.refs.files.focus();
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
    // if (!this.hasAdvancedValues()) {
    //   this.hideAdvanced();
    // }
  }

  filesGotKeydown(event) {
    switch (event.keyCode) {
      case 38:
        // if advanced is empty, close it up.
        if (event.target.value.trim() === '') {
          this.hideAdvanced();
        }
        this.refs.q.focus();
        break;
      case 13:
        this.submitQuery();
        break;
    }
  }

  submitQuery() {
    this.props.onSearch(this.getParams());
  }

  getParams() {
    // XXX selecting all repos is the same as not selecting any, so normalize the url
    // to have none.
    var repos = [];

    return {
      q: this.state.q,
      files: this.state.files.trim(),
      repos: this.state.repos.join(','),
      i: this.state.icase,
    };
  }


  handleInputChange(event) {
    const target = event.target;
    let value = target.value;
    const name = target.name;

    switch (target.type) {
      case 'checkbox':
        value = target.checked
        break;

      case 'select-multiple':
        value = [].slice.call(target.selectedOptions).map((o) => o.value);
        break;

      default:
        break;
    }

    this.setState({
      [name]: value
    });
  }

  hasAdvancedValues() {
    return this.state.files.trim() !== '' || this.state.icase || this.state.repos.length > 0;
  }

  toggleAdvanced() {
    this.setState({ showAdvanced: !this.state.showAdvanced });
  }

  render() {
    var repoCount = this.props.repos.length,
      repoOptions = [];

    this.props.repoNames.forEach(function (repoName) {
      repoOptions.push(
        <option key={repoName} value={repoName}>{repoName}</option>
      );
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
            name="q"
            value={this.state.q}
            onChange={this.handleInputChange.bind(this)}
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
                  name="files"
                  placeholder="regexp"
                  value={this.state.files}
                  onChange={this.handleInputChange.bind(this)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ignore-case">Ignore Case</label>
              <div className="field-input">
                <input id="ignore-case" type="checkbox" name="icase" checked={this.state.icase} onChange={this.handleInputChange.bind(this)} />
              </div>
            </div>
            <div className="field">
              <label className="multiselect_label" htmlFor="repos">Select Repo</label>
              <div className="field-input">
                <select id="repos" name="repos" className="form-control multiselect" multiple={true}
                  onChange={this.handleInputChange.bind(this)}
                  value={this.state.repos}
                  size={Math.min(16, repoCount)}>
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
  searchFiles: PropTypes.string,
  i: PropTypes.bool,
  q: PropTypes.string,
  searchRepos: PropTypes.arrayOf(PropTypes.string),
};

const mapDispatchToProps = dispatch => {
  return {
    loadRepositories: () => dispatch(loadRepos()),
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
