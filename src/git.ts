import {Context} from '@actions/github/lib/context'
import {GitHub} from '@actions/github/lib/utils'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods'

type Helpers = {
    octokit: InstanceType<typeof GitHub>
    context: Context
}

type UpdateData = {
    id: string
    oldVersion: string
    newVersion: string
}

type ModifyFileParams = Helpers & {
    path: string
    updateData: UpdateData
    content: string
    sha: string
    branch: string
}

type GitHubBranchResponse =
    RestEndpointMethodTypes['repos']['getBranch']['response']['data']
type GitHubRefResponse =
    RestEndpointMethodTypes['git']['getRef']['response']['data']
type GitHubModiyFileResponse =
    RestEndpointMethodTypes['repos']['createOrUpdateFileContents']['response']['data']
type GitHubGetPRsResponse = RestEndpointMethodTypes['pulls']['list']['response']

export async function getBranch({
    octokit,
    context,
    branch
}: Helpers & {branch?: string}): Promise<GitHubBranchResponse> {
    return (
        await octokit.rest.repos.getBranch({
            ...context.repo,
            branch: context.ref.replace('refs/heads/', '') ?? branch
        })
    ).data
}

export async function createBranch({
    octokit,
    context,
    updateData,
    sha
}: Helpers & {
    updateData: UpdateData
    sha: string
}): Promise<GitHubRefResponse> {
    return (
        await octokit.rest.git.createRef({
            ...context.repo,
            ref: `refs/heads/${updateData.id}-${updateData.newVersion}`,
            sha: sha
        })
    ).data
}

export async function createBranchFromMain({
    octokit,
    context,
    updateData
}: Helpers & {updateData: UpdateData}): Promise<GitHubRefResponse> {
    const branch = await getBranch({octokit, context})
    return await createBranch({
        octokit,
        context,
        updateData,
        sha: branch.commit.sha
    })
}

export async function getShaForFile({
    octokit,
    context,
    path
}: Helpers & {path: string}): Promise<any> {
    // TODO: wtf is this type
    return await octokit.rest.repos.getContent({
        ...context.repo,
        path: path
    })
}

export async function modifyFile({
    octokit,
    context,
    path,
    updateData,
    content,
    sha,
    branch
}: ModifyFileParams): Promise<GitHubModiyFileResponse> {
    return (
        await octokit.rest.repos.createOrUpdateFileContents({
            ...context.repo,
            path: path,
            message: `Update ${updateData.id} to ${updateData.newVersion}`,
            content: content,
            sha: sha,
            branch: branch
        })
    ).data
}

export async function createPR({
    octokit,
    context,
    name,
    description,
    branch
}: Helpers & {
    name: string
    description: string
    branch: string
}): Promise<any> {
    return await octokit.rest.pulls.create({
        ...context.repo,
        title: name,
        body: description,
        head: branch, // Where to merge from
        base: context.ref.replace('refs/heads/', '') // Where to merge into
    })
}

export async function getOpenPRs({
    octokit,
    context
}: Helpers): Promise<GitHubGetPRsResponse> {
    return await octokit.rest.pulls.list({
        ...context.repo,
        state: 'open'
    })
}

export async function removeOpenPRsFor({
    octokit,
    context,
    updateData
}: Helpers & {updateData: UpdateData}): Promise<void> {
    const openPRs = await getOpenPRs({octokit, context})
    for (const pr of openPRs.data) {
        if (pr.title.includes(updateData.id)) {
            await octokit.rest.issues.createComment({
                ...context.repo,
                issue_number: pr.number,
                body: `Closing this PR automatically, ${updateData.id} is now on ${updateData.newVersion}`
            })
            await octokit.rest.pulls.update({
                ...context.repo,
                pull_number: pr.number,
                state: 'closed'
            })
        }
    }
}
