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
  return <> </>
}

export function isValidID(id: string): boolean {
  return id.length === 46 && id.startsWith('Qm')
}

export function isValidName(name: string): boolean {
  return (
    name.split('/').length === 2 && !name.startsWith('/') && !name.endsWith('/')
  )
}
