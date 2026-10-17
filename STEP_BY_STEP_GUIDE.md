# STEP-BY-STEP GUIDE (Problem 2 – Terraform + Cloudflare)

Code poora ready hai. Tumhe bas ye steps karne hain aur screenshots lene hain.
Har step ke end me **📸** = screenshot jo submission me chahiye.

---
## PHASE A – Setup (Steps 1–5)

**1. Cloudflare account**
1. https://dash.cloudflare.com pe free account banao, email verify karo.
2. Left menu → **Workers & Pages** kholo. Agar "workers.dev subdomain" choose karne ko bole to naam choose karo (e.g. `muskan`). Ye zaruri hai, warna app ka URL nahi banega.
3. **Account ID** copy karo (Workers & Pages page ke right side me, ya Account home → ⋯ → Copy account ID).
4. Yaha dashboard se kuch create NAHI karna. Sirf dekhna.

**2. Terraform install**
- Windows: `winget install Hashicorp.Terraform` (ya https://developer.hashicorp.com/terraform/install se zip, PATH me daalo)
- Mac: `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`
- Linux: HashiCorp ke apt/yum repo se.
- Check: `terraform --version` → 📸

**3. Git check:** `git --version` (na ho to https://git-scm.com se install).

**4. Project folder:** is zip ko extract karo → `student-task-manager-iac/`. VS Code me kholo. Structure same hai jo doc me diya tha.

**5. Cloudflare API Token**
1. Dashboard → top-right profile → **My Profile → API Tokens → Create Token → Create Custom Token**.
2. Permissions (sirf ye do, least privilege):
   - `Account` → `Workers Scripts` → **Edit**
   - `Account` → `Workers KV Storage` → **Edit**
3. Account Resources: *Include → tumhara account*. Create → token **ek baar hi dikhta hai**, copy karo.
4. Terminal me set karo (code/file me kabhi nahi likhna):
   - Mac/Linux: `export CLOUDFLARE_API_TOKEN="xxxx"`
   - PowerShell: `$env:CLOUDFLARE_API_TOKEN="xxxx"`
   - CMD: `set CLOUDFLARE_API_TOKEN=xxxx`

---
## PHASE B – Terraform code (Steps 6–11)  ✅ already bana hua

`terraform/` me ye files hain; samajh ke padho (viva me poochenge):

| File | Kaam |
|---|---|
| `providers.tf` | Cloudflare provider (`~> 5.0`), token env var se |
| `variables.tf` | account_id, worker_name, kv_namespace_name, environment, app_name, workers_subdomain |
| `main.tf` | KV namespace + Worker script + binding `TASKS_KV` + workers.dev URL |
| `outputs.tf` | worker name, KV id, app URL |
| `terraform.tfvars.example` | sample values |

Apni values bharo:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # Windows: copy
# terraform.tfvars edit karo: account_id = "...", workers_subdomain = "muskan"
```
`application/worker.js` = API + UI serve. Optional offline test (Terraform ki zarurat nahi):
```bash
node scripts/test_worker_local.mjs     # "All worker tests passed ✔"
```

---
## PHASE C – Terraform lifecycle (Steps 12–21)

Sab `terraform/` folder ke andar:

| Step | Command | Expected | Screenshot |
|---|---|---|---|
| 12 | `terraform init` | `Terraform has been successfully initialized!` | 📸 |
| 13 | `terraform fmt` | files formatted (ye pehle chalao, CI me fmt-check hai) | |
| 14 | `terraform validate` | `Success! The configuration is valid.` | 📸 |
| 15 | `terraform plan` | `Plan: 3 to add` (KV namespace, Worker, subdomain) | 📸 + highlight `+` resources (Paint/Snip se box lagao) |
| 16 | `terraform apply` → `yes` | `Apply complete!` + outputs | 📸 apply, 📸 dashboard me Worker, 📸 KV namespace |
| 17 | Dashboard: Workers & Pages → `student-task-manager` → Settings → Bindings me `TASKS_KV`; Storage & Databases → KV me `student_tasks` | resources dikhte hain | 📸 |
| 18 | `terraform output application_url` → browser me kholo, task add karo: *Prepare Final Year Project Presentation / High / Pending* | task table me dikhe | 📸 |
| 19 | CRUD tests: UI se **Create → Read → Update (Mark Completed) → Delete**. Backup: `./scripts/smoke_test.sh <url>` | 4 test cases pass | 📸 create, 📸 update, 📸 delete |
| 20 | `terraform show` | state me resources dikhte hain; explain karo state kya hai | |
| 21 | `terraform.tfvars` me `environment = "test"` karo (ya `worker_name` / `app_name`) → `terraform plan` (`~` update-in-place dikhega) → `terraform apply` → UI ke badge me "test" | change apply hua | 📸 plan with `~` |

⚠️ Plan me aksar `Plan: 3 to add` aata hai. Agar subdomain resource pe error aaye to Phase "Troubleshooting" dekho.

---
## PHASE D – Git + GitHub (Steps 22–24)

```bash
cd student-task-manager-iac
git init -b main
git add .
git status        # CHECK: terraform.tfvars aur *.tfstate list me NAHI hone chahiye
git commit -m "Initial Terraform configuration"
```
Better: doc ke hisaab se **meaningful commits** karo (alag alag):
`Initial Terraform configuration` → `Added KV namespace` → `Added Worker` → `Added Worker KV binding` → `Added CRUD API` → `Added GitHub Actions` → `Updated application`.
(Tip: pehle `git add terraform/providers.tf terraform/variables.tf && git commit ...` aise step-by-step.)

GitHub pe **empty repo** banao (README/gitignore add mat karo), phir:
```bash
git remote add origin https://github.com/<username>/student-task-manager-iac.git
git push -u origin main
```
📸 GitHub repository page (files + commits).

**Step 23 (secrets safe):** `.gitignore` already tokens/tfvars/state block karta hai. `.terraform.lock.hcl` commit karo (ye secret nahi hai). Viva ke liye: secrets git me kyu nahi → git history permanent, leak = account takeover.

**Step 24 (GitHub Secrets):** Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Step 5 ka token |
| `CLOUDFLARE_ACCOUNT_ID` | account id |
| `WORKERS_SUBDOMAIN` | e.g. `muskan` |
| `TF_API_TOKEN` | HCP Terraform token (neeche) |
| `TF_CLOUD_ORGANIZATION` | HCP org name |
| `TF_WORKSPACE` | HCP workspace name |

### ⚠️ Zaruri: remote state (CI se pehle)
GitHub Actions ka runner har baar naya hota hai; local `terraform.tfstate` wahi nahi hota → CI apply "resource already exists" error dega. Fix (free, card nahi chahiye):
1. https://app.terraform.io pe free account → **Create organization** (e.g. `muskan-iac`).
2. Org me **Workspace** → *CLI-driven workflow* → naam `student-task-manager`.
3. Workspace **Settings → General → Execution Mode = Local** (important!).
4. User Settings → Tokens → **Create API token** → `TF_API_TOKEN` secret me daalo.
5. Local pe migrate:
```bash
cd terraform
cp backend.tf.example backend.tf
export TF_CLOUD_ORGANIZATION="muskan-iac"
export TF_WORKSPACE="student-task-manager"
terraform login            # ya export TF_TOKEN_app_terraform_io="<token>"
terraform init -migrate-state    # "yes" bolo
terraform plan             # "No changes" aana chahiye
```
`backend.tf` ko commit karo.

---
## PHASE E – CI/CD (Steps 25–26)

`.github/workflows/deploy.yml` ready hai: checkout → install Terraform → init → fmt check → validate → plan → apply (sirf `main` push pe; PR pe sirf plan).

**Step 26 demo:**
1. `application/index.html` me `<title>` aur `<h1>` ko `Cloud-Based Student Task Manager` karo.
2. ```bash
   git add . && git commit -m "Update application title" && git push
   ```
3. GitHub → **Actions** tab → run green hone tak dekho → 📸 successful run (steps dikhte hon).
4. App refresh karo → naya title.

(Flow jo dikhana hai: Push → GitHub Actions → Terraform → Cloudflare → Deployment.)

---
## PHASE F – Destroy & Recreate (Steps 27–29)

⚠️ Pehle ye karo ki CI me koi run chal na raha ho. Destroy ke saath KV ka data bhi udta hai (normal hai).

```bash
cd terraform
terraform plan -destroy      # sab "-" dikhega
terraform destroy            # yes → "Destroy complete!"  📸
```
**Step 28:** Dashboard refresh → Worker aur KV namespace gayab 📸.

**Step 29 (recreate):**
```bash
terraform plan               # phir se "3 to add"
terraform apply              # recreate  📸
```
App URL phir se chalega (data fresh/khaali hoga, naya KV namespace ID bhi naya). Explain: *infra Terraform files me declared hai, isliye automatic reproduce hua.*

---
## PHASE G – Final demo (Section 30) – 20 steps ka order
1 Terraform code dikhao → 2 `validate` → 3 `plan` → 4 plan explain → 5 `apply` → 6 Worker (dashboard) → 7 KV → 8 app kholo → 9 add → 10 read → 11 update → 12 delete → 13 tfvars/config badlo → 14 `plan` → 15 diff explain (`~`) → 16 `apply` → 17 GitHub repo → 18 Actions pipeline → 19 `destroy` → 20 `plan`+`apply` recreate.
👉 Demo se pehle ek baar poora dry run kar lo. Demo ke time `terraform destroy` pehle se mat chalana (step 5 se pehle infra existing ho to plan "no changes" dikhayega; ya to pehle destroy karke start karo).

---
## Screenshots checklist (`screenshots/` folder me rakho)
- [ ] terraform --version
- [ ] terraform init
- [ ] terraform validate
- [ ] terraform plan (create wale resources highlighted)
- [ ] terraform apply (Apply complete!)
- [ ] Cloudflare Worker (dashboard)
- [ ] Workers KV namespace (dashboard)
- [ ] Working web app
- [ ] Create / Update / Delete operations
- [ ] GitHub repository
- [ ] GitHub Actions successful run
- [ ] terraform destroy (Destroy complete!)
- [ ] Infrastructure recreation (apply after destroy)

## Report (Section 32-G / 38)
Chapters 1–10 doc me diye hain. 20 questions ke answers `REPORT_ANSWERS.md` me ready hain; apne words me likhna. Terraform config chapter me `main.tf` ka code + explanation, CI/CD chapter me `deploy.yml`, testing chapter me screenshots.
Title: *“Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code”*

## Timeline (3–4 weeks)
W1: Phase A–B + init/validate/plan · W2: apply, app test, CRUD · W3: Git/GitHub, modify experiment · W4: CI/CD, destroy/recreate, report, viva.

---
## Troubleshooting
| Problem | Fix |
|---|---|
| `Error: Authentication error (10000)` / 403 | Token permissions check (Workers Scripts Edit + Workers KV Storage Edit), account selected hai, env var set hai (naya terminal me dobara set karo) |
| `account_id` prompt aata hai | `terraform.tfvars` terraform/ folder me hai? naam exactly `terraform.tfvars` |
| URL "workers.dev subdomain not found" / 404 | Dashboard → Workers & Pages me subdomain ek baar register karo, `workers_subdomain` var me wahi naam |
| `application_url` output me "Set var.workers_subdomain" | tfvars me `workers_subdomain` bharo |
| Provider v5 me schema/attribute error | `terraform init -upgrade`; provider docs: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs |
| CI: `already exists` | Remote state (Phase D) setup nahi hua |
| CI: fmt check fail | local pe `terraform fmt -recursive` chalao, commit karo |
| Dashboard se manually kuch badla | Drift: `terraform plan` dikhayega; `apply` se wapas config jaisa ho jayega |
