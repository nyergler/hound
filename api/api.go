package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/etsy/hound/client"
	"github.com/etsy/hound/config"
	"github.com/etsy/hound/index"
	"github.com/etsy/hound/insight"
	"github.com/etsy/hound/searcher"
	"github.com/sourcegraph/go-langserver/pkg/lsp"
)

const (
	defaultLinesOfContext uint = 2
	maxLinesOfContext     uint = 20
)

type Stats struct {
	FilesOpened int
	Duration    int
}

func writeJson(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json;charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Panicf("Failed to encode JSON: %v\n", err)
	}
}

func writeResp(w http.ResponseWriter, data interface{}) {
	writeJson(w, data, http.StatusOK)
}

func writeError(w http.ResponseWriter, err error, status int) {
	writeJson(w, map[string]string{
		"Error": err.Error(),
	}, status)
}

type searchResponse struct {
	repo string
	res  *index.SearchResponse
	err  error
}

func coalesceMatches(matches *index.SearchResponse) *SearchResponse {

	var coalesced []*FileMatch

	for _, matchedFile := range matches.Matches {
		coalesced = append(
			coalesced,
			&FileMatch{
				matchedFile.Filename,
				client.CoalesceMatches(matchedFile.Matches),
			},
		)
	}

	return &SearchResponse{
		coalesced,
		matches.FilesWithMatch,
		matches.FilesOpened,
		matches.Duration,
		matches.Revision,
	}
}

func coalesceRepoMatches(results *map[string]*index.SearchResponse) map[string]*SearchResponse {

	res := map[string]*SearchResponse{}

	for repo, results := range *results {
		res[repo] = coalesceMatches(results)
	}
	return res
}

type FileMatch struct {
	Filename string
	Matches  []*client.Block
}
type SearchResponse struct {
	Matches        []*FileMatch
	FilesWithMatch int
	FilesOpened    int           `json:"-"`
	Duration       time.Duration `json:"-"`
	Revision       string
}

type HoverInfo struct {
	Hover          lsp.Hover
	Definition     []lsp.Location
	Implementation []lsp.Location
	References     []lsp.Location
}

/**
 * Searches all repos in parallel.
 */
func searchAll(
	query string,
	opts *index.SearchOptions,
	repos []string,
	idx map[string]*searcher.Searcher,
	filesOpened *int,
	duration *int) (map[string]*index.SearchResponse, error) {

	startedAt := time.Now()

	n := len(repos)

	// use a buffered channel to avoid routine leaks on errs.
	ch := make(chan *searchResponse, n)
	for _, repo := range repos {
		go func(repo string) {
			fms, err := idx[repo].Search(query, opts)
			ch <- &searchResponse{repo, fms, err}
		}(repo)
	}

	res := map[string]*index.SearchResponse{}
	for i := 0; i < n; i++ {
		r := <-ch
		if r.err != nil {
			return nil, r.err
		}

		if r.res.Matches == nil {
			continue
		}

		res[r.repo] = r.res
		*filesOpened += r.res.FilesOpened
	}

	*duration = int(time.Now().Sub(startedAt).Seconds() * 1000)

	return res, nil
}

// Used for parsing flags from form values.
func parseAsBool(v string) bool {
	v = strings.ToLower(v)
	return v == "true" || v == "1" || v == "fosho"
}

func parseAsRepoList(v string, idx map[string]*searcher.Searcher) []string {
	v = strings.TrimSpace(v)
	var repos []string
	if v == "*" {
		for repo := range idx {
			repos = append(repos, repo)
		}
		return repos
	}

	for _, repo := range strings.Split(v, ",") {
		if idx[repo] == nil {
			continue
		}
		repos = append(repos, repo)
	}
	return repos
}

func parseAsUintValue(sv string, min, max, def uint) uint {
	iv, err := strconv.ParseUint(sv, 10, 54)
	if err != nil {
		return def
	}
	if max != 0 && uint(iv) > max {
		return max
	}
	if min != 0 && uint(iv) < min {
		return max
	}
	return uint(iv)
}

func parseRangeInt(v string, i *int) {
	*i = 0
	if v == "" {
		return
	}

	vi, err := strconv.ParseUint(v, 10, 64)
	if err != nil {
		return
	}

	*i = int(vi)
}

func parseRangeValue(rv string) (int, int) {
	ix := strings.Index(rv, ":")
	if ix < 0 {
		return 0, 0
	}

	var b, e int
	parseRangeInt(rv[:ix], &b)
	parseRangeInt(rv[ix+1:], &e)
	return b, e
}

func relativeLocations(repoRoot string, locations *[]lsp.Location) {
	for _, l := range *locations {
		l.URI = lsp.DocumentURI(strings.TrimPrefix(string(l.URI), repoRoot))
	}
}

func Setup(m *http.ServeMux, idx map[string]*searcher.Searcher) {

	m.HandleFunc("/api/v1/repos", func(w http.ResponseWriter, r *http.Request) {
		res := map[string]*config.Repo{}
		for name, srch := range idx {
			res[name] = srch.Repo
		}

		writeResp(w, res)
	})

	m.HandleFunc("/api/v1/search", func(w http.ResponseWriter, r *http.Request) {
		var opt index.SearchOptions

		stats := parseAsBool(r.FormValue("stats"))
		repos := parseAsRepoList(r.FormValue("repos"), idx)
		query := r.FormValue("q")
		opt.Offset, opt.Limit = parseRangeValue(r.FormValue("rng"))
		opt.FileRegexp = r.FormValue("files")
		opt.IgnoreCase = parseAsBool(r.FormValue("i"))
		opt.LinesOfContext = parseAsUintValue(
			r.FormValue("ctx"),
			0,
			maxLinesOfContext,
			defaultLinesOfContext)

		var filesOpened int
		var durationMs int

		results, err := searchAll(query, &opt, repos, idx, &filesOpened, &durationMs)
		if err != nil {
			// TODO(knorton): Return ok status because the UI expects it for now.
			writeError(w, err, http.StatusOK)
			return
		}

		var res struct {
			Results map[string]*index.SearchResponse
			Stats   *Stats
		}

		res.Results = results
		if stats {
			res.Stats = &Stats{
				FilesOpened: filesOpened,
				Duration:    durationMs,
			}
		}

		writeResp(w, &res)
	})

	m.HandleFunc("/api/v2/search", func(w http.ResponseWriter, r *http.Request) {
		var opt index.SearchOptions

		stats := parseAsBool(r.FormValue("stats"))
		repos := parseAsRepoList(r.FormValue("repos"), idx)
		query := r.FormValue("q")
		opt.Offset, opt.Limit = parseRangeValue(r.FormValue("rng"))
		opt.FileRegexp = r.FormValue("files")
		opt.IgnoreCase = parseAsBool(r.FormValue("i"))
		opt.LinesOfContext = parseAsUintValue(
			r.FormValue("ctx"),
			0,
			maxLinesOfContext,
			defaultLinesOfContext)

		var filesOpened int
		var durationMs int

		results, err := searchAll(query, &opt, repos, idx, &filesOpened, &durationMs)
		if err != nil {
			// TODO(knorton): Return ok status because the UI expects it for now.
			writeError(w, err, http.StatusOK)
			return
		}

		var res struct {
			Results map[string]*SearchResponse
			Stats   *Stats
		}
		res.Results = coalesceRepoMatches(&results)

		if stats {
			res.Stats = &Stats{
				FilesOpened: filesOpened,
				Duration:    durationMs,
			}
		}

		writeResp(w, &res)
	})

	m.HandleFunc("/api/v2/hover", func(w http.ResponseWriter, r *http.Request) {
		repoName := r.FormValue("repoName")
		repo, ok := idx[repoName]
		repoRoot, _ := url.Parse("file://" + repo.VcsDir)

		if !ok {
			writeError(w, errors.New("Invalid Repo"), http.StatusBadRequest)
			return
		}

		// dial the language server
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		client, err := insight.Connect(ctx, insight.Language(r.FormValue("filename")), repoRoot.String())
		if err != nil {
			writeError(w, err, http.StatusBadGateway)
			return
		}

		// make the request
		documentURI, _ := url.Parse(repoRoot.String())
		documentURI.Path = path.Join(documentURI.Path, r.FormValue("filename"))

		position := lsp.TextDocumentPositionParams{
			TextDocument: lsp.TextDocumentIdentifier{
				URI: lsp.DocumentURI(documentURI.String()),
			},
			Position: lsp.Position{
				Line:      int(parseAsUintValue(r.FormValue("line"), 0, math.MaxInt32, 0)),
				Character: int(parseAsUintValue(r.FormValue("character"), 0, math.MaxInt32, 0)),
			},
		}
		hoverInfo, err := client.Hover(ctx, &position)
		definition, err := client.Definition(ctx, &position)
		implementation, err := client.Implementation(ctx, &position)
		references, err := client.References(ctx, &position, false)

		relativeLocations(repoRoot.String(), &definition)
		relativeLocations(repoRoot.String(), &implementation)
		relativeLocations(repoRoot.String(), &references)

		if len(definition) > 0 {
			definition[0].URI = lsp.DocumentURI(strings.TrimPrefix(string(definition[0].URI), repoRoot.String()))
		}
		writeResp(w, &HoverInfo{Hover: *hoverInfo, Definition: definition, Implementation: implementation, References: references})

	})

	m.HandleFunc("/api/v1/excludes", func(w http.ResponseWriter, r *http.Request) {
		repo := r.FormValue("repo")
		res := idx[repo].GetExcludedFiles()
		w.Header().Set("Content-Type", "application/json;charset=utf-8")
		w.Header().Set("Access-Control-Allow", "*")
		fmt.Fprint(w, res)
	})

	m.HandleFunc("/api/v1/update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			writeError(w,
				errors.New(http.StatusText(http.StatusMethodNotAllowed)),
				http.StatusMethodNotAllowed)
			return
		}

		repos := parseAsRepoList(r.FormValue("repos"), idx)

		for _, repo := range repos {
			searcher := idx[repo]
			if searcher == nil {
				writeError(w,
					fmt.Errorf("No such repository: %s", repo),
					http.StatusNotFound)
				return
			}

			if !searcher.Update() {
				writeError(w,
					fmt.Errorf("Push updates are not enabled for repository %s", repo),
					http.StatusForbidden)
				return

			}
		}

		writeResp(w, "ok")
	})
}
