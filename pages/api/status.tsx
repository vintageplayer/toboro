import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { isValidID, Result } from '..'

interface Block {
  hash: string
  number: string
}

interface SubgraphError {
  message: string
  block?: Block
  handler?: string
  deterministic: boolean
}

interface ChainIndexingStatus {
  network: string
  chainHeadBlock?: Block
  earliestBlock?: Block
  latestBlock?: Block
  lastHealthyBlock?: Block
}

const QUERY_BODY = `{
  subgraph
  synced
  health
  entityCount
  fatalError {
    handler
    message
    deterministic
    block {
      hash
      number
    }
  }
  chains {
    network
    chainHeadBlock {
      number
      hash
    }
    earliestBlock {
      number
      hash
    }
    latestBlock {
      number
      hash
    }
    lastHealthyBlock {
      hash
      number
    }
  }
  node
}`
