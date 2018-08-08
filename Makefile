CMDS := $(GOPATH)/bin/houndd $(GOPATH)/bin/hound

SRCS := $(shell find . -type f -name '*.go')

WEBPACK_ARGS := -p
ifdef DEBUG
	WEBPACK_ARGS := -d
endif

all: $(CMDS)

ui: ui/bindata.go

node_modules:
	npm install

$(GOPATH)/bin/houndd: ui/bindata.go $(SRCS)
	go install github.com/etsy/hound/cmds/houndd

$(GOPATH)/bin/hound: ui/bindata.go $(SRCS)
	go install github.com/etsy/hound/cmds/hound

.build/bin/go-bindata:
	GOPATH=`pwd`/.build go get github.com/jteeuwen/go-bindata/...@6025e8de665b31fa74ab1a66f2cddd8c0abf887e

ui/bindata.go: .build/bin/go-bindata node_modules $(wildcard ui/assets/**/*)
	rsync -r ui/assets/* .build/ui
	npm run webpack -- $(WEBPACK_ARGS)
	$< -o $@ -pkg ui -prefix .build/ui -nomemcopy .build/ui/...

test:
	go test github.com/etsy/hound/...

clean:
	rm -rf .build node_modules
