import {getFiles, getJsonFiles} from '../src/path'

test('getFiles returns files', async () => {
    for await (const file of getFiles('.')) {
        expect(file).toBeDefined()
    }
})

test('getJsonFiles returns only json files', async () => {
    const files = await getJsonFiles('.')
    for (const file of files) {
        expect(file.endsWith('.json')).toBe(true)
    }
})

// shows how the runner will run a javascript action with env / stdout protocol
/* 

import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('it runs', () => {
    const np = process.execPath
    const ip = path.join(__dirname, '..', 'lib', 'main.js')
    const options: cp.ExecFileSyncOptions = {
        env: process.env
    }
    try {
        cp.execFileSync(np, [ip], options)
    } catch (error: any) {
        throw new Error(error.stdout.toString())
    }
})*/
