Key Requirements:
- Need versioning so that new versions of microservices can be deployed without risk of breaking production (prod continues linking to v2 while release links to v3)
- We do want is seperate production and development environments, on seperate GCP projects. New versions created on dev first, then PR'd and created on prod.
- At some point we detect old versions and automatically deprecate them.
- There should be a branch in git per version. With the main branch being synced to the latest produciton version.
- Terraform template repo with the spec of how we handle microservices.
- Terraform central repo with split state per service that uses the template.
- MUST HAVE: Terraform must NEVER manage production DB's or storage or they are protected to the highest level.

Open Questions:
- How do we handle secret management?
  - Be able to have a list of secrets per service, deployed to all versions.
  - Seperate secrets for dev and prod.
  - Ability to add new secrets to a new version.
  - Ability to manage this via IaC but without dev's having access.

Additional:
- Can also add a repo to manage prototypes via terraform, similar secret management but only one deployment on dev.

Need Deployment:
https://github.com/FundamentalMedia/microlang

https://github.com/FundamentalMedia/asset-builder-service

https://github.com/FundamentalMedia/universal-auth
- Secure connection to ValKey



