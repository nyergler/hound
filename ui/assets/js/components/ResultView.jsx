import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import FilesView from './FilesView.jsx';

class ResultView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.error) {
            return (
                <div id="no-result" className="error">
                    <strong>ERROR:</strong>{this.state.error}
                </div>
            );
        }

        if (this.props.results !== null && this.props.results.length === 0) {
            // TODO(knorton): We need something better here. :-(
            return (
                <div id="no-result">&ldquo;Nothing for you, Dawg.&rdquo;<div>0 results</div></div>
            );
        }

        if (this.props.results === null && this.props.query) {
            return (
                <div id="no-result"><img src="images/busy.gif" /><div>Searching...</div></div>
            );
        }

        var regexp = this.props.query,
            results = this.props.results || [];
        var repos = results.map(function (result, index) {
            return (
                <div className="repo" key={result.Repo}>
                    <div className="title">
                        <span className="mega-octicon octicon-repo"></span>
                        <span className="name">{result.Repo}</span>
                    </div>
                    <FilesView matches={result.Matches}
                        rev={result.Rev}
                        repoName={result.Repo}
                        repo={result.Repo}
                        regexp={regexp}
                        totalMatches={result.FilesWithMatch} />
                </div>
            );
        });
        return (
            <div id="result">{repos}</div>
        );
    }
};

ResultView.propTypes = {
    query: PropTypes.string,
    results: PropTypes.array
};

const mapDispatchToProps = dispatch => {
    return {}
}

const mapStateToProps = ({ query, results }) => {
    return {
        query,
        results,
    }
}

export default connect(
    mapStateToProps
)(ResultView);
