# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

Mini project (IaC): Terraform provisions a **Cloudflare Worker** + **Workers KV namespace** + binding;
GitHub Actions deploys it on every push.

## Architecture
```
git push -> GitHub -> GitHub Actions -> Terraform -> Cloudflare Provider
                                                      |-> Workers KV namespace (student_tasks)
                                                      |-> Worker (UI + REST API) -- binding TASKS_KV
Browser -> Worker -> KV
```

## Structure
```
terraform/     providers.tf, main.tf, variables.tf, outputs.tf, terraform.tfvars.example, backend.tf.example
application/   worker.js (API + static serving), index.html, style.css, script.js
.github/workflows/deploy.yml
scripts/       test_worker_local.mjs (offline test), smoke_test.sh (CRUD test on deployed URL)
screenshots/   evidence
STEP_BY_STEP_GUIDE.md   <- start here
REPORT_ANSWERS.md       <- 20 report questions + viva answers
```

## Quick start
```bash
export CLOUDFLARE_API_TOKEN="..."        # never commit
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill account_id, workers_subdomain
terraform init && terraform validate && terraform plan && terraform apply
```

## REST API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/tasks | create |
| GET | /api/tasks | list |
| GET | /api/tasks/{id} | read one |
| PUT | /api/tasks/{id} | update (title / priority / status) |
| DELETE | /api/tasks/{id} | delete |

Task: `{ id, title, priority (High|Medium|Low), status (Pending|In Progress|Completed), createdDate }`

## Extras implemented
Search, status filter, priority sorting, completion statistics, `environment` variable with validation (dev/test/production).
