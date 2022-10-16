import axios from 'axios'
import type { NextPage } from 'next'
import Head from 'next/head'
import { useQueryState } from 'next-usequerystate'
import React, { useEffect, useState } from 'react'
import { useInterval } from 'react-use'
import { SubgraphIndexingStatus } from './api/status'

const AUTO_REFRESH_INTERVAL = 30

export type Result<T> =
  | {
      data: T
      error?: never
    }
  | {
      data?: never
      error: { message: string }
    }

const Home: NextPage = () => {
  const inputElement = React.useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (inputElement.current) {
      inputElement.current.focus()
    }
  }, [])

  const [q, setQ] = useQueryState('q')
  const [tempQ, setTempQ] = useState(q)
  const [loading, setLoading] = useState(false)
  const [statuses, setStatuses] =
    useState<Array<SubgraphIndexingStatus> | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date())

  async function fetchData(subgraphID: string) {
    setLoading(true)
    try {
      const resp = await axios.get(`api/status?subgraphID=${subgraphID}`)
      const result = resp.data as Result<Array<SubgraphIndexingStatus>>
      if (result.error) {
        setErrMsg(result.error.message)
        setAutoRefresh(false)
      } else {
        setStatuses(result.data)
        if (result.data.some((status) => status.fatalError === null)) {
          setAutoRefresh(true)
        }
      }
    } catch (error: any) {
      setErrMsg('axios.get failed')
    }
    setLoading(false)
  }

  // fetch on load if query params is not empty
  useEffect(() => {
    if (q && (isValidID(q) || isValidName(q))) {
      fetchData(q)
    }
  }, [])

  function handleChange(event: React.FormEvent<HTMLInputElement>) {
    setTempQ(event.currentTarget.value)
  }

  function handleSubmit(event: React.FormEvent<HTMLInputElement>) {
    event.preventDefault()
    setStatuses(null)
    setErrMsg(null)
    const q = tempQ
    setQ(q, { scroll: false, shallow: true })
    if (q && (isValidID(q) || isValidName(q))) {
      fetchData(q)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center font-mono">
      <Head>
        <title>Toboro</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex w-full flex-1 items-center sm:w-3/5 lg:w-2/5">
        <div className="w-full">
          <div className=" text-center">
            <p className="my-3 text-6xl font-bold text-blue-600">Toboro</p>
            <p className="my-3 text-xl text-blue-600">
              Stay On Top of your web3 stack
            </p>
          </div>
          <input
            type="text"
            className="my-3 w-full rounded border border-solid border-blue-600 bg-white px-3 py-1.5 text-center outline-none"
            placeholder={'"Qm..." or "org/subgraph"'}
            value={tempQ || ''}
            onChange={handleChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e)
              }
            }}
            ref={inputElement}
          />

          <Display
            subgraphID={q || ''}
            loading={loading}
            statuses={statuses}
            errMsg={errMsg}
          />
        </div>
      </main>
    </div>
  )
}

export default Home

function Display({
  subgraphID,
  loading,
  statuses,
  errMsg,
}: {
  subgraphID: string
  loading: boolean
  statuses: Array<SubgraphIndexingStatus> | null
  errMsg: string | null
}) {
  if (subgraphID.length === 0) {
    return (
      <p className="my-3 text-center">
        Tired of{' '}
        <a
          className="underline"
          href="https://thegraph.com/docs/en/hosted-service/deploy-subgraph-hosted/#checking-subgraph-health"
        >
          checking subgraph health
        </a>
        ? Put an Qm-ID or a name 👆
      </p>
    )
  }
  if (!isValidID(subgraphID) && !isValidName(subgraphID)) {
    return <p className="my-3 text-center">Invalid subgraph ID</p>
  }
  if (loading) {
    return <p className="my-3 text-center">Loading ...</p>
  }
  if (errMsg) {
    return <p className="my-3 text-center">{errMsg}</p>
  }
  if (statuses) {
    return (
      <div className="flex flex-col space-y-4 divide-y-2 divide-blue-600">
        {statuses.map((status, i) => (
          <Status key={i} {...status} />
        ))}
      </div>
    )
  }
  return <p className="my-3 text-center">This should not happen</p>
}

const Status = (props: SubgraphIndexingStatus) => {
  const chain = props.chains[0]

  return (
    <div className="p-2">
      <div className="my-3 grid grid-cols-1 gap-2">
        <div>
          <div>ID</div>

          <div
            className="cursor-copy truncate text-blue-600"
            onClick={() => props.subgraph}
          >
            {props.subgraph}
          </div>
        </div>
        <div>
          <div>Links</div>
          <div>
            <a
              target="_blank"
              className="text-blue-600 hover:underline"
              href={`https://api.thegraph.com/subgraphs/id/${props.subgraph}`}
            >
              API
            </a>
            {' ⛓️ '}

            <a
              target="_blank"
              className="text-blue-600 hover:underline"
              href={`https://api.thegraph.com/explorer/graphql?query=${encodeURIComponent(
                `{
  subgraphLogs(
    subgraphId: "${props.subgraph}"
    first: 100
    order: NewestFirst
    filters: ["error", "warning"]
    searchText: ""
  ) {
    timestamp
    text
  }
}`
              )}`}
            >
              Logs
            </a>
          </div>
        </div>
      </div>
      <div className="my-3 grid grid-cols-4 gap-4">
        <div>
          <div>Network</div>
          <div className="text-blue-600">{chain.network}</div>
        </div>
        <div>
          <div>Health</div>
          <div>
            {props.health === 'healthy'
              ? '✅'
              : props.health === 'unhealthy'
              ? '⚠️'
              : '❌'}
          </div>
        </div>
        <div>
          <div>Synced</div>
          <div>{props.synced ? '✅' : '❌'}</div>
        </div>
        <div>
          <div>Entities</div>
          <div className="text-blue-600">
            {parseInt(props.entityCount).toLocaleString('en-US')}
          </div>
        </div>
      </div>
      <div className="my-3 grid grid-cols-4 gap-4">
        {chain.earliestBlock && (
          <div>
            <div>Start #</div>
            <div
              className="cursor-copy text-blue-600"
              onClick={() =>
                parseInt(chain.earliestBlock!.number).toString()
              }
            >
              {parseInt(chain.earliestBlock.number).toLocaleString('en-US')}
            </div>
          </div>
        )}
        {chain.latestBlock && (
          <div>
            <div>Synced #</div>
            <div
              className="cursor-copy text-blue-600"
              onClick={() =>
                parseInt(chain.latestBlock!.number).toString()
              }
            >
              {parseInt(chain.latestBlock.number).toLocaleString('en-US')}
            </div>
          </div>
        )}
        {chain.chainHeadBlock && (
          <div>
            <div>Last #</div>
            <div
              className="cursor-copy text-blue-600"
              onClick={() =>
                parseInt(chain.chainHeadBlock!.number).toString()                
              }
            >
              {parseInt(chain.chainHeadBlock.number).toLocaleString('en-US')}
            </div>
          </div>
        )}
        {chain.earliestBlock && chain.latestBlock && chain.chainHeadBlock && (
          <div>
            <div>Progress</div>
            <div className="text-blue-600">
              {(
                (100 *
                  (Number(chain.latestBlock?.number) -
                    Number(chain.earliestBlock?.number))) /
                (Number(chain.chainHeadBlock?.number) -
                  Number(chain.earliestBlock?.number))
              ).toFixed(2)}
              %
            </div>
          </div>
        )}
      </div>
      {props.fatalError && (
        <div className="my-3 flex flex-col space-y-3 rounded-md border border-red-600 p-2 text-sm text-red-600">
          A{' '}
          {props.fatalError?.deterministic
            ? 'determinstic'
            : 'non-deterministic'}{' '}
          fatal error occured
          {props.fatalError?.block
            ? ` at block ${props.fatalError?.block?.number}`
            : ''}
          {props.fatalError?.handler
            ? ` on handler ${props.fatalError?.handler}`
            : ''}
          : {props.fatalError?.message}
        </div>
      )}
      {props.nonFatalErrors &&
        props.nonFatalErrors.map((nonFatalError, i) => (
          <div
            key={i}
            className="my-3 rounded-md border border-yellow-600 p-1 text-sm text-yellow-600"
          >
            {nonFatalError.handler && (
              <div>handler: {nonFatalError.handler}</div>
            )}
            {nonFatalError.block?.number && (
              <div>block number: {nonFatalError.block?.number}</div>
            )}
            {nonFatalError.message && (
              <div>message: {nonFatalError.message}</div>
            )}
          </div>
        ))}
    </div>
  )
}

export function isValidID(id: string): boolean {
  return id.length === 46 && id.startsWith('Qm')
}

export function isValidName(name: string): boolean {
  return (
    name.split('/').length === 2 && !name.startsWith('/') && !name.endsWith('/')
  )
}
