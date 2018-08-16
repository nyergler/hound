const qs = params => Object.keys(params).map(key => `${key}=${params[key]}`).join('&');

export async function loadRepositories() {
  return fetch('api/v1/repos')
    .then(response => response.json());
}

export async function search(params) {
  const startedAt = Date.now();

  params = {
    stats: 'fosho',
    repos: '*',
    rng: ':20',
    ...params,
  };

  if (params.repos === '') {
    params.repos = '*';
  }

  return fetch(`api/v2/search?${qs(params)}`)
    .then(response => response.json())
    .then((data) => {
      let matches = data.Results,
        // XXX backend should always include Stats
        stats = data.Stats || {},
        results = [];
      for (const repo in matches) {
        if (!matches[repo]) {
          continue;
        }

        const res = matches[repo];
        results.push({
          Repo: repo,
          Rev: res.Revision,
          Matches: res.Matches,
          FilesWithMatch: res.FilesWithMatch,
        });
      }

      results.sort((a, b) => b.Matches.length - a.Matches.length || a.Repo.localeCompare(b.Repo));

      const byRepo = {};
      results.forEach((res) => {
        byRepo[res.Repo] = res;
      });

      return {
        results,
        searchParams: params,
        resultsByRepo: byRepo,
        stats: {
          Server: stats.Duration,
          Total: Date.now() - startedAt,
          Files: stats.FilesOpened,
        },
      };
    });
}

export async function loadMore(repoName, numLoaded, totalResults, searchParams) {
  let numNeeded = totalResults - numLoaded,
    numToLoad = Math.min(2000, numNeeded),
    endAt = numNeeded == numToLoad ? '' : `${numToLoad}`;

  const params = {
    ...searchParams,
    rng: `${numLoaded}:${endAt}`,
    repos: repoName,
  };

  return search(params)
    .then(result => ({
      repoName,
      results: result.resultsByRepo[repoName],
    }));
}

export async function details(repoName, filename, line, character) {

  const params = {
    repoName,
    line,
    character,
    filename,
  };

  console.log(params);

  return fetch(`api/v2/hover?${qs(params)}`)
    .then(response => response.json());
}