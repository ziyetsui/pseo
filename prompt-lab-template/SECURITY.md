# Security

Do not disclose credentials, private source material, personal data, or exploitable vulnerabilities in a public issue.

Before launch, the repository owner must configure a private security contact and GitHub private vulnerability reporting. Until that contact exists, do not publish the repository as an operational service.

Public catalog builds are offline and read only checked-in `content/**`. They must never receive CMS database credentials, CMS preview tokens, or a GitHub App private key. The separate publisher that opens pull requests should have only repository contents and pull-request permissions.
