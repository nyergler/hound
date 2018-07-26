import {
    LOAD_REPO, SEARCH, LOAD_MORE
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

        case LOAD_MORE:
            const repoName = action.payload.repoName;
            console.log('****', action.payload, state);
            return {
                ...state,
                resultsByRepo: {
                    ...state.resultsByRepo,
                    [repoName]: {
                        ...state.resultsByRepo[repoName],
                        Matches: state.resultsByRepo[repoName].Matches.concat(action.payload.results.Matches),
                    },
                },
            };

        default:
            return state;
    }
}