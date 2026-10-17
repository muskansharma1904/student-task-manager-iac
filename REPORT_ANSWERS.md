# Report Q&A (Section 38 of the problem statement) + Viva notes

1. **What is IaC?** Defining and managing infrastructure (servers, storage, networks, config) through machine-readable source files instead of manual dashboard clicks.
2. **What problem does IaC solve?** Manual setup is not reproducible, error-prone, untracked, slow to rebuild and inconsistent across teams. IaC makes it repeatable, reviewable, version-controlled and automatable.
3. **Why is Terraform declarative?** You describe the *desired end state* (a Worker and a KV namespace should exist); Terraform works out the steps to reach it by comparing with state/real infrastructure.
4. **Provider?** A plugin that lets Terraform talk to an API. Here `cloudflare/cloudflare` translates resources into Cloudflare API calls.
5. **Resource?** A block describing one infrastructure object, e.g. `cloudflare_workers_kv_namespace`, `cloudflare_workers_script`.
6. **Variable?** An input parameter (account_id, worker_name, environment) that avoids hard-coding and makes config reusable.
7. **Output?** A value Terraform prints/exports after apply (Worker name, KV namespace ID, app URL).
8. **State?** `terraform.tfstate`: the mapping between resources in code and real objects (IDs, attributes). Terraform uses it to compute diffs. May contain sensitive values, so never commit it.
9. **terraform init?** Prepares the working directory: downloads providers/modules, configures backend, creates `.terraform/` and the lock file.
10. **terraform plan?** Compares config vs. state vs. real infra and shows what would be created (+), changed (~), destroyed (-). Changes nothing.
11. **terraform apply?** Executes the plan: calls the Cloudflare API to create/update resources and updates state.
12. **terraform destroy?** Deletes every resource tracked in state for this configuration.
13. **Why not edit manually after Terraform manages it?** It causes drift: the real infra no longer matches code/state; the next apply may overwrite manual changes or fail.
14. **Why no API tokens in code?** Git history is permanent and often public; a leaked token gives full access to the account. Use env vars / GitHub Secrets.
15. **KV database?** A globally distributed key-value store: values looked up by key, eventually consistent, great for simple records, no SQL/joins.
16. **Why serverless?** No servers to manage, free tier (100k requests/day), auto-scaling, deployable entirely via API, so ideal for IaC demonstration.
17. **CI/CD?** Continuous Integration (automatic checks on each change) + Continuous Delivery/Deployment (automatic release).
18. **GitHub Actions role?** Runs the workflow on push: checkout, install Terraform, init, validate, plan, apply using stored secrets.
19. **How does Terraform recreate after deletion?** The config files still describe the desired state; state is empty/removed, so plan shows everything as "+ create" and apply rebuilds it.
20. **Infrastructure drift?** Difference between real infrastructure and what Terraform code/state describes, usually due to manual edits. Detected by `terraform plan`.

## Viva one-liners
- Why KV namespace ID as binding? Binding injects the KV namespace into the Worker as `env.TASKS_KV`; Terraform wires it using `cloudflare_workers_kv_namespace.student_tasks.id` (implicit dependency, so KV is created first).
- Why does Terraform embed HTML/CSS/JS into the Worker? Single-file Worker deploy through the provider; `replace()` + `file()` + `jsonencode()` in `main.tf`.
- Why remote state for CI? Actions runners are ephemeral; without shared state a second run would try to create resources that already exist.
- What does `~> 5.0` mean? Any 5.x version, but not 6.0.
