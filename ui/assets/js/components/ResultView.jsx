import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import FilesView from './FilesView.jsx';

import styles from '../../css/hound.css';
import octicons from "../../css/octicons/octicons.css"

class ResultView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.error) {
            return (
                <div id="no-result" className={styles.error}>
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
        var repos = results.map((result, index) => {
            return (
                <div className={styles.repo} key={result.Repo}>
                    <div className={styles.title}>
                        <span className={`${octicons["mega-octicon"]} ${octicons["octicon-repo"]}`}></span>
                        <span className={styles.name}>{result.Repo}</span>
                    </div>
                    <FilesView
                        matches={this.props.resultsByRepo[result.Repo].Matches}
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

const mapStateToProps = ({ query, results, resultsByRepo }) => {
    return {
        query,
        results,
        resultsByRepo,
    }
}

export default connect(
    mapStateToProps
)(ResultView);
