import React from 'react';

const RepoOption = (props) => {
    return (
        <option value={props.value} selected={props.selected}>{props.value}</option>
    )
};

RepoOption.propTypes = {

};

export default RepoOption;