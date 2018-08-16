package ui

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"

	assetfs "github.com/elazarl/go-bindata-assetfs"
	"github.com/etsy/hound/config"
)

func assetInfo(path string) (os.FileInfo, error) {
	return os.Stat(path)
}

// Create an http.Handler for serving the web assets. If dev is true,
// the http.Handler that is returned will serve assets directly our of
// the source directories making rapid web development possible. If dev
// is false, the http.Handler will serve assets out of data embedded
// in the executable.
func Content(dev bool, cfg *config.Config) (http.Handler, error) {
	if dev {
		_, file, _, _ := runtime.Caller(0)
		fmt.Println(filepath.Join(filepath.Dir(file), "..", ".build", "ui"))
		return http.FileServer(
			// serve the webpack-built files because Babel
			http.Dir(filepath.Join(filepath.Dir(file), "..", ".build", "ui")),
		), nil
	}

	return http.FileServer(
		&assetfs.AssetFS{Asset: Asset, AssetDir: AssetDir, AssetInfo: assetInfo, Prefix: ""},
	), nil
}
