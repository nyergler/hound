package insight

import (
	"context"
	"fmt"
	"net"

	"github.com/sourcegraph/go-langserver/pkg/lsp"
	"github.com/sourcegraph/jsonrpc2"
)

type LspClient struct {
	client     *jsonrpc2.Conn
	languageID string
}

func Dial(ctx context.Context, languageId, address string) (*LspClient, error) {

	handler := jsonrpc2.HandlerWithError(
		func(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (interface{}, error) {
			return true, nil
		},
	)
	tcpConn, err := net.Dial("tcp", address)
	conn := jsonrpc2.NewConn(ctx, jsonrpc2.NewBufferedStream(tcpConn, jsonrpc2.VSCodeObjectCodec{}), handler)
	// ch := channel.RawJSON(conn, conn)
	// cli := jrpc2.NewClient(ch, nil) // nil for default options

	return &LspClient{
		conn,
		languageId,
	}, err
}

func (l *LspClient) Initialize(ctx context.Context, root lsp.DocumentURI) (*lsp.InitializeResult, error) {
	result := lsp.InitializeResult{}
	params := lsp.InitializeParams{
		RootURI: root, // "file:///Users/nathanyergler/lob/lob-api",
		Capabilities: lsp.ClientCapabilities{
			Workspace:    lsp.WorkspaceClientCapabilities{},
			TextDocument: lsp.TextDocumentClientCapabilities{},
		},
	}

	error := l.client.Call(ctx, "initialize", &params, &result)

	return &result, error
}

func (l *LspClient) Hover(ctx context.Context, params *lsp.TextDocumentPositionParams) (*lsp.Hover, error) {
	result := lsp.Hover{}

	err := l.client.Call(ctx, "textDocument/hover", &params, &result)

	return &result, err
}

func (l *LspClient) Definition(ctx context.Context, params *lsp.TextDocumentPositionParams) ([]lsp.Location, error) {
	result := []lsp.Location{}

	err := l.client.Call(ctx, "textDocument/definition", &params, &result)

	return result, err
}

func (l *LspClient) Implementation(ctx context.Context, params *lsp.TextDocumentPositionParams) ([]lsp.Location, error) {
	result := []lsp.Location{}

	err := l.client.Call(ctx, "textDocument/implementation", &params, &result)

	return result, err
}

func (l *LspClient) References(ctx context.Context, location *lsp.TextDocumentPositionParams, includeDeclaration bool) ([]lsp.Location, error) {
	result := []lsp.Location{}
	params := lsp.ReferenceParams{
		TextDocumentPositionParams: lsp.TextDocumentPositionParams{
			TextDocument: location.TextDocument,
			Position:     location.Position,
		},
		Context: lsp.ReferenceContext{
			IncludeDeclaration: includeDeclaration,
		},
	}

	err := l.client.Call(ctx, "textDocument/implementation", &params, &result)

	return result, err
}

func (l *LspClient) Symbol(ctx context.Context, params *lsp.WorkspaceSymbolParams) ([]lsp.SymbolInformation, error) {
	result := []lsp.SymbolInformation{}

	err := l.client.Call(ctx, "workspace/symbol", &params, &result)

	fmt.Printf("%v", err)

	return result, err
}
