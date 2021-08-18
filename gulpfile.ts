import execa from 'execa'
import { readFile, writeFile } from 'fs/promises'
import { series } from 'gulp'
import yaml from 'js-yaml'
import { resolve } from 'path'

const DEFAULT_NETWORK_ENDPOINT = 'wss://khala.phala.network/ws'
const DEFAULT_NETWORK_TYPEDEFS = 'khala'
const DEFAULT_START_BLOCK = 1

const endpoint = process.env['NETWORK_ENDPOINT'] ?? DEFAULT_NETWORK_ENDPOINT
const startBlock = /^\d+$/.test(process.env['START_BLOCK']) ? parseInt(process.env['START_BLOCK']) : DEFAULT_START_BLOCK
const typedefsRef = process.env['NETWORK_TYPEDEFS'] ?? DEFAULT_NETWORK_TYPEDEFS

interface Project {
    dataSources?: [{ startBlock?: number }]
    network?: {
        endpoint?: string
        typedefs?: unknown
    }
}

export const configure = async (): Promise<void> => {
    console.info('Using typedefs:', typedefsRef)
    console.info('Using endpoint:', endpoint)

    const template = yaml.load((await readFile(resolve(__dirname, 'project.template.yaml'))).toString()) as Project

    const registry = await import('@phala/typedefs')
    const types = registry[typedefsRef] as unknown

    const dataSources = template.dataSources.map((dataSource) => ({
        ...dataSource,
        startBlock,
    }))

    const network = {
        ...template.network,
        endpoint,
        types,
    }

    const project = {
        ...template,
        dataSources,
        network,
    }

    await writeFile(resolve(__dirname, 'project.yaml'), yaml.dump(project))
}

export const codegen = async (): Promise<void> => {
    await execa('npx', ['subql', 'codegen'])
}

export const build = async (): Promise<void> => {
    await execa('npx', ['tsc', '--build'])
}

export const docker = series(configure, codegen, build)
