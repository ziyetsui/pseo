import {
  PublicationBaseRevisionConflictError,
  type GitPublisher,
  type GitPublisherReceipt,
} from '../domain/index.ts'

export interface MockGitPublisherOptions {
  readonly expectedBaseSha: string
}

function branchSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]+/gu, '-').replace(/^-+|-+$/gu, '')
  return normalized || 'request'
}

/**
 * Safe internal-beta adapter. It performs no network, filesystem, git, commit,
 * PR, merge or publication operation. The receipt is explicitly mock-only and
 * leaves commit/PR fields null so it cannot be mistaken for a release.
 */
export class MockGitPublisher implements GitPublisher {
  private readonly options: MockGitPublisherOptions

  constructor(options: MockGitPublisherOptions) {
    this.options = options
  }

  async requestPublication(input: Parameters<GitPublisher['requestPublication']>[0]): Promise<GitPublisherReceipt> {
    if (input.expectedBaseSha !== this.options.expectedBaseSha) {
      throw new PublicationBaseRevisionConflictError(
        'expectedBaseSha does not match the mock publisher base revision',
      )
    }

    return {
      branch: null,
      checks: [{ name: 'mock:no-external-side-effects', status: 'passed' }],
      commitSha: null,
      plannedBranch: `content/${branchSegment(input.artifactId)}-${branchSegment(input.requestId)}`,
      provider: 'mock',
      pullRequestNumber: null,
      pullRequestUrl: null,
      status: 'mock_accepted',
    }
  }
}
