'use strict';

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { loadMore } from '../actions';
import { UrlToRepo } from '../common';

const getRegExp = (q, icase) => {
    return new RegExp(
      q.trim(),
      icase ? 'ig' : 'g'
    );
}

/**
 * Produce html for a line using the regexp to highlight matches.
 */
var ContentFor = function(line, regexp) {
  return line.FormattedLine;
  if (!line.Match) {
      return line.FormattedLine;
    }
    var content = line.FormattedLine,
        buffer = [];

    while (content) {
      regexp.lastIndex = 0;
      var m = regexp.exec(content);
      if (!m) {
        buffer.push(content);
        break;
      }

      buffer.push(content.substring(0, regexp.lastIndex - m[0].length));
      buffer.push( <em key={buffer.length}>{m[0]}</em>);
      content = content.substring(regexp.lastIndex);
    }
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
              <span className="lval" dangerouslySetInnerHTML={{__html: ContentFor(line, regexp)}}></span>
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
