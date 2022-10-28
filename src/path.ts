import {readdir} from 'fs/promises'
import {resolve} from 'path'

// Thank you StackOverflow user gwtel & Gander
// https://stackoverflow.com/a/65415138

export async function* getFiles(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, {withFileTypes: true})
    for (const entry of entries) {
        const res = resolve(dir, entry.name)
        if (entry.isDirectory()) {
            yield* getFiles(res)
        } else {
            yield res
        }
    }
}

export async function getJsonFiles(dir: string): Promise<string[]> {
    const files = []
    for await (const file of getFiles(dir)) {
        if (file.endsWith('.json')) {
            files.push(file)
        }
    }
    return files
}

export async function findWingetFileIn(
    dir: string,
    wingetFileName: string = 'winstall.json'
): Promise<string> {
    const files = await getJsonFiles(dir)

    for (const file of files) {
        if (file.endsWith(wingetFileName)) {
            return file
        }
    }

    throw new Error(`No file named ${wingetFileName} found`)
}
