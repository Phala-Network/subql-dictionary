import execa from 'execa'
import { readFile, writeFile } from 'fs/promises'
import { series } from 'gulp'
import yaml from 'js-yaml'
import { resolve } from 'path'

const DEFAULT_NETWORK_ENDPOINT = 'wss://khala.phala.network/ws'
const DEFAULT_NETWORK_TYPEDEFS = 'khala'

const endpoint = process.env['NETWORK_ENDPOINT'] ?? DEFAULT_NETWORK_ENDPOINT
const typedefsRef = process.env['NETWORK_TYPEDEFS'] ?? DEFAULT_NETWORK_TYPEDEFS

interface Project {
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

    const network = {
        ...template.network,
        endpoint,
        types,
    }

    const project = {
        ...template,
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
