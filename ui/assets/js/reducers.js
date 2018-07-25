import {
    LOAD_REPO, SEARCH
} from './actions';

const initialState = {
    query: '',
    repos: {},
    repoNames: [],
    results: null
};

export default function reduce(state = initialState, action) {

    switch (action.type) {
        case SEARCH:
            return {
                ...state,
                query: action.payload.searchParams.q,
                ...action.payload
            };

        case LOAD_REPO:
            return {
                ...state,
                repoNames: Object.keys(action.payload),
                repos: action.payload
            };

        default:
            return state;
    }
}