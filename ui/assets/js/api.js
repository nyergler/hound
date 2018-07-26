const qs = (params) => Object.keys(params).map(key => key + '=' + params[key]).join('&');

export async function loadRepositories() {
    return fetch('api/v1/repos')
    .then((response) => response.json());
}

export async function search(params) {
    const startedAt = Date.now();

    params = {
        stats: 'fosho',
        repos: '*',
        rng: ':20',
        ...params
    };

    if (params.repos === '') {
        params.repos = '*';
    }

    return fetch(`api/v1/search?${qs(params)}`)
        .then((response) => response.json())
        .then((data) => {

            var matches = data.Results,
                // XXX backend should always include Stats
                stats = data.Stats || {},
                results = [];
            for (var repo in matches) {
                if (!matches[repo]) {
                    continue;
                }

                var res = matches[repo];
                results.push({
                    Repo: repo,
                    Rev: res.Revision,
                    Matches: res.Matches,
                    FilesWithMatch: res.FilesWithMatch,
                });
            }

            results.sort(function (a, b) {
                return b.Matches.length - a.Matches.length || a.Repo.localeCompare(b.Repo);
            });

            var byRepo = {};
            results.forEach(function (res) {
                byRepo[res.Repo] = res;
            });

            return {
                results,
                searchParams: params,
                resultsByRepo: byRepo,
                stats: {
                    Server: stats.Duration,
                    Total: Date.now() - startedAt,
                    Files: stats.FilesOpened
                },
            }
        });
}

export async function loadMore(repoName, numLoaded, totalResults, searchParams) {
    var numNeeded = totalResults - numLoaded,
    numToLoad = Math.min(2000, numNeeded),
    endAt = numNeeded == numToLoad ? '' : '' + numToLoad;

const params = {
  ...searchParams,
  rng: numLoaded+':'+endAt,
  repos: repoName
};

return search(params)
.then((result) => {
    return {
        repoName: repoName,
        results: result.resultsByRepo[repoName],
    };
});
}