'use strict';

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { loadMore } from '../actions';
import { UrlToRepo } from '../common';

import { Identifier } from './Identifier';

import styles from '../../css/hound.css';


const getRegExp = (q, icase) => {
    return new RegExp(
      q.trim(),
      icase ? 'ig' : 'g'
    );
}

const TOKEN_TAGS = {
  NameOther: Identifier,
  NameFunction: Identifier,
  NameClass: Identifier,
  NameVariable: Identifier,

  other: 'span',
}

/**
 * Produce html for a line using the regexp to highlight matches.
 */
var ContentFor = function(repo, filename, line, regexp) {
  if (!line.LineTokens) {
    return line.FormattedLine;
  }
  let offset = 0;
  const lineNum = (line.Number || 1) - 1;
  const tokens = line.LineTokens;
  const buffer = tokens.map((t, i) => {
    const Tag = TOKEN_TAGS[t.type] || TOKEN_TAGS['other'];
    const tokenTag = (
      <Tag key={`tag-${i}`} className={styles[t.type]}
        reponame={repo}
        filename={filename}
        offset={offset}
        line={lineNum}
      >
        {t.value}
      </Tag>
    );
    offset += t.value.length;

    return tokenTag;
  });

  return <Fragment>{buffer}</Fragment>;
};

class FilesView extends React.Component {

    render() {
      const rev = this.props.rev,
          repo = this.props.repos[this.props.repo],
          regexp = getRegExp(this.props.regexp, this.props.searchParams.i),
          matches = this.props.matches,
          totalMatches = this.props.totalMatches;

      const files = this.props.matches.map((fileMatch, index) => {
        const blocks = fileMatch.Matches.map((matchBlock, j) => {
          const matchLines = matchBlock.Lines.map((line, k) => {
            return (
              <div className={styles.line} key={`${fileMatch.Filename}-${line.Number}`}>
              <a href={UrlToRepo(repo, fileMatch.Filename, line.Number, rev)}
                  className={styles.lnum}
                  target="_blank">{line.Number}</a>
              <span className={styles.lval}>{ContentFor(this.props.repo, fileMatch.Filename, line, regexp)}</span>
            </div>
            );
          });

          return (
            <div className={styles.match} key={`${fileMatch.Filename}-${j}`}>{matchLines}</div>
          )
        });

        return (
          <div className={styles.file} key={fileMatch.Filename}>
            <div className={styles.title}>
              <a href={UrlToRepo(repo, fileMatch.Filename, null, rev)}>
                {fileMatch.Filename}
              </a>
            </div>
            <div className={styles["file-body"]}>
              {blocks}
            </div>
          </div>
        );
      });

      var more = '';
      if (matches.length < totalMatches) {
        more = (
        <button
          className={styles.moar}
          onClick={() => this.props.onLoadMore(this.props.repoName, matches.length, totalMatches, this.props.searchParams)}
        >Load all {totalMatches} matches in {this.props.repoName}</button>);
      }

      return (
        <div className={styles.files}>
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
