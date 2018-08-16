import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import { details } from '../api';

import styles from './Identifier.css';

class IdentifierDetail extends React.Component {

  componentDidMount() {
    console.log('mounted', this.props);
  }

  render() {
    const hoverDetail = [];
    if (this.props.detail && this.props.detail.Hover) {
      this.props.detail.Hover.contents.forEach((h) => {
        if (typeof(h) === 'object') {
          hoverDetail.push(<p>{h.value}</p>);
        } else {
          hoverDetail.push(<p>{h}</p>);
        }
      });
    }
    return <span className={styles.overlay}
      onMouseOver={this.props.onMouseOver}
      onMouseOut={this.props.onMouseOut}
      onTouchStart={this.props.onTouchStart}
      onTouchEnd={this.props.onTouchEnd}
      >
      <h3>{this.props.filename}</h3>
      <div>{hoverDetail}</div>
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
            line={this.props.line}
            offset={this.props.offset}
            detail={this.state.detail}

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

            this.setState({ detail });
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