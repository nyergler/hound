package client

import (
	"github.com/etsy/hound/index"
)

type Block struct {
	Start      int
	MatchCount int
	Lines      []*index.MatchLine
}

func endOfBlock(b *Block) int {
	return b.Start + len(b.Lines) - 1
}

func startOfMatch(m *index.Match) int {
	return m.LineNumber
}

func matchIsInBlock(m *index.Match, b *Block) bool {
	return startOfMatch(m) <= endOfBlock(b)
}

func matchToBlock(m *index.Match) *Block {
	return &Block{
		Lines:      m.Lines,
		Start:      m.LineNumber,
		MatchCount: 1,
	}
}

func clampZero(n int) int {
	if n < 0 {
		return 0
	}
	return n
}

func mergeMatchIntoBlock(m *index.Match, b *Block) {
	off := endOfBlock(b) - startOfMatch(m) + 1
	nb := len(m.Lines)

	for i := off; i < nb; i++ {
		b.Lines = append(b.Lines, m.Lines[i])
	}
}

func CoalesceMatches(matches []*index.Match) []*Block {
	var res []*Block
	var curr *Block
	for _, match := range matches {
		if curr != nil && matchIsInBlock(match, curr) {
			mergeMatchIntoBlock(match, curr)
		} else {
			if curr != nil {
				res = append(res, curr)
			}
			curr = matchToBlock(match)
		}
	}

	if curr != nil {
		res = append(res, curr)
	}

	return res
}
