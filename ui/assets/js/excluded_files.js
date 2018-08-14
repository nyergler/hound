import React from 'react';
import { render } from 'react-dom';

import styles from '../css/hound.css';
import { UrlToRepo } from './common';

class ExcludedRow extends React.Component {
  render() {
    const url = UrlToRepo(this.props.repo, this.props.file.Filename, this.props.rev);
    return (
      <tr>
        <td className={styles.name}>
          <a href={url}>
            {this.props.file.Filename}
          </a>
        </td>
        <td className={styles.reason}>
          {this.props.file.Reason}
        </td>
      </tr>
    );
  }
};

class ExcludedTable extends React.Component{
  render() {
    const _this = this;
    if (this.props.searching) {
      return (
        <div className={styles["no-result"]}>
          <img src="images/busy.gif" />
          <div>
Searching...
          </div>
        </div>
      );
    }

    const rows = [];
    this.props.files.forEach((file) => {
      rows.push(<ExcludedRow key={file.Filename} file={file} repo={_this.props.repo} />);
    });

    return (
      <table>
        <thead>
          <tr>
            <th>
Filename
            </th>
            <th>
Reason
            </th>
          </tr>
        </thead>
        <tbody className={styles.list}>
          {rows}
        </tbody>
      </table>
    );
  }
};

class RepoButton extends React.Component{
  handleClick(repoName) {
    this.props.onRepoClick(repoName);
  }

  render() {
    return (
      <button onClick={this.handleClick.bind(this, this.props.repo)}
        className={`${styles["repo-button"]} ${this.props.selected ? styles.selected : ''}`}>
        {this.props.repo}
      </button>
    );
  }
};

class RepoList extends React.Component{
  render() {
    const repos = this.props.repos.map((repo) =>
      <RepoButton key={repo} repo={repo} onRepoClick={this.props.onRepoClick.bind(this)} selected={this.props.selectedRepo === repo }/>
    );

    return (
      <div className={styles.repolist}>
        {repos}
      </div>
    );
  }
};

class FilterableExcludedFiles extends React.Component{

  constructor(props) {
    super(props);
    this.state = this.getInitialState();
  }

  getInitialState() {
    fetch(
      '/api/v1/repos'
    ).then(response => response.json())
    .then((repos) => {
      this.setState({ repos });
    });

    return {
      files: [],
      repos: {},
      repo: null,
    };
  }

  onRepoClick(repo) {
    this.setState({
      searching: true,
      repo: this.state.repos[repo],
      selectedRepo: repo,
    });

    fetch(`api/v1/excludes?repo=${repo}`)
    .then(response => response.json())
    .then(files => {
      this.setState({
        files,
        searching: false,
      });
    });
  }

  render() {
    return (
      <div className={styles.excluded_container}>
        <a href="/">
Home
        </a>
        <h1>
Excluded Files
        </h1>

        <div className={`${styles.excluded_files} ${styles["table-container"]}`}>
          <RepoList repos={Object.keys(this.state.repos)} onRepoClick={this.onRepoClick.bind(this)} repo={this.state.repo} selectedRepo={this.state.selectedRepo} />
          <ExcludedTable files={this.state.files} searching={this.state.searching} repo={this.state.repo} />
        </div>
      </div>
    );
  }
};

render(
  <FilterableExcludedFiles />,
  document.getElementById('root'),
);
