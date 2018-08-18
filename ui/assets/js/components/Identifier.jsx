import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { UrlToRepo } from '../common';
import { details } from '../api';

import styles from './Identifier.css';

class IdentifierDetail extends React.Component {

  componentDidMount() {
    console.log('mounted', this.props);
  }

  render() {
    const hoverContents = (this.props.hover && this.props.hover.contents) || [];
    const hoverDetail = hoverContents.map((h, i) => {
        if (typeof(h) === 'object') {
          return (<p key={i}>{h.value}</p>);
        } else {
          return(<p key={i}>{h}</p>);
        }
      });

    return <span className={styles.overlay}
      onMouseOver={this.props.onMouseOver}
      onMouseOut={this.props.onMouseOut}
      onTouchStart={this.props.onTouchStart}
      onTouchEnd={this.props.onTouchEnd}
      >
      <h3>{this.props.filename}</h3>
      <div>{hoverDetail}</div>
      <div className={styles.overlayButtons}>
        <button>References</button>
        {
          this.props.definition && this.props.definition.length > 0 &&
          <a target="_blank"
            href={UrlToRepo(this.props.repo, this.props.definition[0].uri, this.props.definition[0].range.start.line + 1, 'master')}>
              Definition
          </a>
        }
      </div>
    </span>;
  }
}

export class Identifier extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      visible: false,
      detail: {},
    }
  }

  render () {
    return (
      <span
        className={this.state.visible ? styles.highlight : '' }
        onMouseOver={this.onMouseOver.bind(this)}
        onMouseOut={this.onMouseOut.bind(this)}
        onTouchStart={this.onTouchStart.bind(this)}
        onTouchEnd={this.onTouchEnd.bind(this)}
      >
        {this.props.children}
        {this.state.visible &&
          <IdentifierDetail
            filename={this.props.filename}
            reponame={this.props.reponame}
            repo={this.props.repo}
            line={this.props.line}
            offset={this.props.offset}

            hover={this.state.detail.Hover}
            definition={this.state.detail.Definition}

            onMouseOver={this.onMouseOver.bind(this)}
            onMouseOut={this.onMouseOut.bind(this)}
            onTouchStart={this.onTouchStart.bind(this)}
            onTouchEnd={this.onTouchEnd.bind(this)}
          />
        }
      </span>
    )
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.state.visible && !prevState.visible) {
      details(this.props.reponame, this.props.filename, this.props.line, this.props.offset)
        .then((detail) => {
          // make sure we're still visible before bothing to update the state
          if (this.state.visible) {
            console.log(detail);

            this.setState({ ...detail, detail });
          }
        });
    }
  }

  setVisibility(visible) {
    if (this._t_id) {
      window.clearTimeout(this._t_id);
    }
    this._t_id = window.setTimeout(
      () => this.setState({ visible }),
      50
    );
  }

  onMouseOver () {
    this.setVisibility(true)
  }

  onMouseOut () {
    this.setVisibility(false)
  }

  onTouchStart () {
    this.setVisibility(true)
  }

  onTouchEnd () {
    this.setVisibility(false)
  }
}

Identifier.propTypes = {
  reponame: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  line: PropTypes.number.isRequired,
  offset: PropTypes.number.isRequired,
  children: PropTypes.string,
};


const mapStateToProps = ({ repos }, { reponame }) => {
  return {
    repo: repos[reponame],
  }
}

export default connect(
  mapStateToProps,
)(Identifier);
