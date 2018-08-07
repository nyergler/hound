'use strict';

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { loadMore } from '../actions';
import { UrlToRepo } from '../common';

import styles from '../../css/hound.css';


const getRegExp = (q, icase) => {
    return new RegExp(
      q.trim(),
      icase ? 'ig' : 'g'
    );
}

const TOKEN_TAGS = {
  other: 'span'
}

/**
 * Produce html for a line using the regexp to highlight matches.
 */
var ContentFor = function(line, regexp) {
  if (!line.LineTokens) {
    return line.FormattedLine;
  }
  const tokens = line.LineTokens;
  const buffer = tokens.map((t) => {
    const Tag = TOKEN_TAGS[t.type] || TOKEN_TAGS['other'];
    return <Tag className={styles[t.type]}>{t.value}</Tag>;
  });

  return <Fragment>{buffer}</Fragment>;
};

class FilesView extends React.Component {

    render() {
      var rev = this.props.rev,
          repo = this.props.repos[this.props.repo],
          regexp = getRegExp(this.props.regexp, this.props.searchParams.i),
          matches = this.props.matches,
          totalMatches = this.props.totalMatches;

      const files = this.props.matches.map((fileMatch, index) => {
        const blocks = fileMatch.Matches.map((matchBlock, j) => {
          const matchLines = matchBlock.Lines.map((line, k) => {
            return (
              <div className="line" key={`${fileMatch.Filename}-${line.Number}`}>
              <a href={UrlToRepo(repo, fileMatch.Filename, line.Number, rev)}
                  className="lnum"
                  target="_blank">{line.Number}</a>
              <span className="lval">{ContentFor(line, regexp)}</span>
            </div>
            );
          });

          return (
            <div className="match" key={`${fileMatch.Filename}-${j}`}>{matchLines}</div>
          )
        });

        return (
          <div className="file" key={fileMatch.Filename}>
            <div className="title">
              <a href={UrlToRepo(repo, fileMatch.Filename, null, rev)}>
                {fileMatch.Filename}
              </a>
            </div>
            <div className="file-body">
              {blocks}
            </div>
          </div>
        );
      });

      var more = '';
      if (matches.length < totalMatches) {
        more = (
        <button
          className="moar"
          onClick={() => this.props.onLoadMore(this.props.repoName, matches.length, totalMatches, this.props.searchParams)}
        >Load all {totalMatches} matches in {this.props.repoName}</button>);
      }

      return (
        <div className="files">
        {files}
        {more}
        </div>
      );
    }
  };

FilesView.propTypes = {
  query: PropTypes.string,
  searchParams: PropTypes.object,
};

const mapDispatchToProps = (dispatch) => {
    return {
      onLoadMore: (repoName, numLoaded, total, searchParams) => dispatch(loadMore(repoName, numLoaded, total, searchParams)),
    }
}

const mapStateToProps = ({ searchParams, query, repos }) => {
    return {
      searchParams,
      query,
      repos,
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FilesView);
