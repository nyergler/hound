import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { loadRepos, search } from '../actions';

import houndStyles from '../../css/hound.css';
import octicons from "../../css/octicons/octicons.css"
import styles from './Searchbar.css';

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
    if (!this.hasAdvancedValues()) {
      this.setState({ showAdvanced: false });
    }
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
        <div className={houndStyles.stats}>
          <div className={houndStyles["stats-left"]}>
            <a href="excluded_files.html"
              className={houndStyles["link-gray"]}>
              Excluded Files
              </a>
          </div>
          <div className={houndStyles["stats-right"]}>
            <div className={houndStyles.val}>{FormatNumber(stats.Total)}ms total</div> /
              <div className={houndStyles.val}>{FormatNumber(stats.Server)}ms server</div> /
              <div className={houndStyles.val}>{stats.Files} files</div>
          </div>
        </div>
      );
    }

    return (
      <div className={houndStyles.input}>
        <div className={houndStyles.ina}>
          <input className={houndStyles.q}
            type="text"
            placeholder="Search by Regexp"
            ref="q"
            autoComplete="off"
            name="q"
            value={this.state.q}
            onChange={this.handleInputChange.bind(this)}
            onKeyDown={this.queryGotKeydown.bind(this)}
            onFocus={this.queryGotFocus.bind(this)} />
          <div className={houndStyles["button-add-on"]}>
            <button className={houndStyles.dodat} onClick={this.submitQuery.bind(this)}></button>
          </div>
        </div>

        <div className={houndStyles.inb}>
          <div className={houndStyles.adv} className={this.state.showAdvanced ? styles.showAdvanced : styles.hideAdvanced}>
            <span className={`${houndStyles["hide-adv"]} ${octicons.octicon} ${octicons["octicon-chevron-up"]}`} onClick={this.toggleAdvanced.bind(this)}></span>
            <div className={houndStyles.field}>
              <label htmlFor="files">File Path</label>
              <div className={houndStyles["field-input"]}>
                <input type="text"
                  className={houndStyles.files}
                  name="files"
                  placeholder="regexp"
                  value={this.state.files}
                  onChange={this.handleInputChange.bind(this)} />
              </div>
            </div>
            <div className={houndStyles.field}>
              <label htmlFor="ignore-case">Ignore Case</label>
              <div className={houndStyles["field-input"]}>
                <input id="ignore-case" type="checkbox" name="icase" checked={this.state.icase} onChange={this.handleInputChange.bind(this)} />
              </div>
            </div>
            <div className={houndStyles.field}>
              <label className={houndStyles.multiselect_label} htmlFor="repos">Select Repo</label>
              <div className={houndStyles["field-input"]}>
                <select className={`form-control multiselect ${houndStyles.repos}`} name="repos" multiple={true}
                  onChange={this.handleInputChange.bind(this)}
                  value={this.state.repos}
                  size={Math.min(16, repoCount)}>
                  {repoOptions}
                </select>
              </div>
            </div>
          </div>
          <div className={houndStyles.ban} className={this.state.showAdvanced ? styles.hideBanner : styles.showBanner} onClick={this.toggleAdvanced.bind(this)}>
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
