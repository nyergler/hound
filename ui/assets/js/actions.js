import { createAction } from 'redux-actions';
import * as api from './api';

export const LOAD_REPO = 'LOAD_REPO';
export const SEARCH = 'SEARCH';

export const loadRepos = createAction(LOAD_REPO, api.loadRepositories);
export const search = createAction(SEARCH, api.search);