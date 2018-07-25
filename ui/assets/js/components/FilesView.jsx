import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { EscapeHtml } from '../common';

const UrlToRepo = (repo) => repo;
const NameForRepo = (repo) => repo;

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
    if (!line.Match) {
      return EscapeHtml(line.Content);
    }
    var content = line.Content,
        buffer = [];

    while (true) {
      regexp.lastIndex = 0;
      var m = regexp.exec(content);
      if (!m) {
        buffer.push(EscapeHtml(content));
        break;
      }

      buffer.push(EscapeHtml(content.substring(0, regexp.lastIndex - m[0].length)));
      buffer.push( '<em>' + EscapeHtml(m[0]) + '</em>');
      content = content.substring(regexp.lastIndex);
    }
    return buffer.join('');
  };

/**
 * Take a list of matches and turn it into a simple list of lines.
 */
var MatchToLines = function(match) {
    var lines = [],
        base = match.LineNumber,
        nBefore = match.Before.length,
        nAfter = match.After.length;
    match.Before.forEach(function(line, index) {
      lines.push({
        Number : base - nBefore + index,
        Content: line,
        Match: false
      });
    });

    lines.push({
      Number: base,
      Content: match.Line,
      Match: true
    });

    match.After.forEach(function(line, index) {
      lines.push({
        Number: base + index + 1,
        Content: line,
        Match: false
      });
    });

    return lines;
  };

/**
 * Take several lists of lines each representing a matching block and merge overlapping
 * blocks together. A good example of this is when you have a match on two consecutive
 * lines. We will merge those into a singular block.
 *
 * TODO(knorton): This code is a bit skanky. I wrote it while sleepy. It can surely be
 * made simpler.
 */
var CoalesceMatches = function(matches) {
    var blocks = matches.map(MatchToLines),
        res = [],
        current;
    // go through each block of lines and see if it overlaps
    // with the previous.
    for (var i = 0, n = blocks.length; i < n; i++) {
      var block = blocks[i],
          max = current ? current[current.length - 1].Number : -1;
      // if the first line in the block is before the last line in
      // current, we'll be merging.
      if (block[0].Number <= max) {
        block.forEach(function(line) {
          if (line.Number > max) {
            current.push(line);
          } else if (current && line.Match) {
            // we have to go back into current and make sure that matches
            // are properly marked.
            current[current.length - 1 - (max - line.Number)].Match = true;
          }
        });
      } else {
        if (current) {
          res.push(current);
        }
        current = block;
      }
    }

    if (current) {
      res.push(current);
    }

    return res;
  };

class FilesView extends React.Component {
    onLoadMore(event) {
      Model.LoadMore(this.props.repo);
    }

    render() {
      var rev = this.props.rev,
          repo = this.props.repo,
          regexp = getRegExp(this.props.regexp),
          matches = this.props.matches,
          totalMatches = this.props.totalMatches;
    //   var files = matches.map(function(match, index) {
    //     var filename = match.Filename,
    //         blocks = CoalesceMatches(match.Matches);
    //     var matches = blocks.map(function(block) {
    //       var lines = block.map(function(line) {
    //         var content = ContentFor(line, regexp);
    //         return (
    //           <div className="line">
    //             <a href={UrlToRepo(repo, filename, line.Number, rev)}
    //                 className="lnum"
    //                 target="_blank">{line.Number}</a>
    //             <span className="lval" dangerouslySetInnerHTML={{__html:content}} />
    //           </div>
    //         );
    //       });

    //       return (
    //         <div className="match">{lines}</div>
    //       );
    //     });

    //     return (
    //       <div className="file" key={match.Filename}>
    //         <div className="title">
    //           <a href={UrlToRepo(repo, match.Filename, null, rev)}>
    //             {match.Filename}
    //           </a>
    //         </div>
    //         <div className="file-body">
    //           {matches}
    //         </div>
    //       </div>
    //     );
    //   });

      var more = '';
      if (matches.length < totalMatches) {
        more = (<button className="moar" onClick={this.onLoadMore.bind(this)}>Load all {totalMatches} matches in {NameForRepo(repo)}</button>);
      }

      return (
        <div className="files">
        {more}
        </div>
      );
    }
  };


const mapDispatchToProps = dispatch => {
    return {}
}

const mapStateToProps = ({ query, results }) => {
    return {
        query
    }
}

export default connect(
    mapStateToProps
)(FilesView);
