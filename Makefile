CMDS := $(GOPATH)/bin/houndd $(GOPATH)/bin/hound

SRCS := $(shell find . -type f -name '*.go' -or -name '*.jsx' -or -name '*.js')

WEBPACK_ARGS := -p
ifdef DEBUG
	WEBPACK_ARGS := -d
endif

all: $(CMDS)

ui: ui/bindata.go ui/bindata_assetfs.go

node_modules:
	npm install

$(GOPATH)/bin/houndd: ui/bindata_assetfs.go $(SRCS)
	go install github.com/etsy/hound/cmds/houndd

$(GOPATH)/bin/hound: ui/bindata_assetfs.go $(SRCS)
	go install github.com/etsy/hound/cmds/hound

.build/bin/go-bindata-assetfs:
	GOPATH=`pwd`/.build go get github.com/jteeuwen/go-bindata/...@6025e8de665b31fa74ab1a66f2cddd8c0abf887e
	GOPATH=`pwd`/.build go get github.com/elazarl/go-bindata-assetfs/go-bindata-assetfs@38087fe4dafb822e541b3f7955075cc1c30bd294

ui/bindata_assetfs.go: .build/bin/go-bindata-assetfs node_modules $(wildcard ui/assets/**/*)
	rsync -r ui/assets/* .build/ui
	npm run webpack -- $(WEBPACK_ARGS)
	PATH=`pwd`/.build/bin $< -o $@ -pkg ui -prefix .build/ui -nomemcopy .build/ui/...

test:
	go test github.com/etsy/hound/...

clean:
	rm -rf .build node_modules

.PHONY: clean test all ui node_modules