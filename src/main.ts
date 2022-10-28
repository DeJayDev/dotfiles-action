import * as core from '@actions/core'
import * as github from '@actions/github'
import {readFileSync} from 'fs'
import robert from 'robert'
import * as git from './git'
import {findWingetFileIn} from './path'

async function run(): Promise<void> {
    try {
        const octokit = github.getOctokit(process.env.GITHUB_TOKEN as string)
        const context = github.context

        const wingetFile = await findWingetFileIn('.')
        const wingetData = JSON.parse(readFileSync(wingetFile, 'utf8'))
        const client = robert.client('https://api.winget.run').format('json')

        for (const obj of wingetData.Sources[0].Packages) {
            const [publisher, winPackage] = obj.Id.split('.')
            const version = obj.Version
            const data = await client
                .get(`/v2/packages/${publisher}/${winPackage}`)
                .send()
            if (data.Package.Versions[0] === version) {
                continue
            }

            core.warning(
                `Version mismatch for ${obj.Id}. ${data.Package.Versions[0]} !== ${version}`
            )

            var updateData = {
                id: obj.Id,
                oldVersion: version,
                newVersion: data.Package.Versions[0]
            }

            var newBranch = await git.createBranchFromMain({
                octokit,
                context,
                updateData
            })

            // In place update, we need the file we wish to PR as b64
            obj.Version = data.Package.Versions[0]

            await git.modifyFile({
                octokit,
                context,
                path: wingetFile,
                updateData,
                content: Buffer.from(
                    JSON.stringify(wingetData, null, 4)
                ).toString('base64'),
                sha: await git.getShaForFile({
                    octokit,
                    context,
                    path: wingetFile
                }),
                branch: newBranch.ref
            })

            git.removeOpenPRsFor({octokit, context, updateData})

            git.createPR({
                octokit,
                context,
                name: `Update ${updateData.id} to ${updateData.newVersion}`,
                description: `Automatically update ${updateData.id} to ${updateData.newVersion}`,
                branch: newBranch.ref
            })
        }
    } catch (error: any) {
        core.info(error.stack)
        core.setFailed(error.message)
    }
}

run()
