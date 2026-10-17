# ---------------------------------------------------------------
# main.tf  -  asli infrastructure
#   1. Workers KV namespace
#   2. Cloudflare Worker (script + KV binding + env variables)
#   3. workers.dev URL enable
# ---------------------------------------------------------------

# Frontend files (HTML/CSS/JS) ko Worker ke andar embed karte hain.
# worker.js me 3 placeholders hain; Terraform unhe file contents se
# replace karke final Worker code banata hai.
locals {
  app_dir = "${path.module}/../application"

  worker_content = replace(
    replace(
      replace(
        file("${local.app_dir}/worker.js"),
        "__INDEX_HTML__", jsonencode(file("${local.app_dir}/index.html"))
      ),
      "__STYLE_CSS__", jsonencode(file("${local.app_dir}/style.css"))
    ),
    "__SCRIPT_JS__", jsonencode(file("${local.app_dir}/script.js"))
  )
}

# 1) KV namespace -> task records yaha store honge
resource "cloudflare_workers_kv_namespace" "student_tasks" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# 2) Worker + binding
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.account_id
  script_name        = var.worker_name
  main_module        = "worker.js"
  content            = local.worker_content
  compatibility_date = "2025-01-01"

  bindings = [
    {
      # Worker code me  env.TASKS_KV.put/get/list/delete
      name         = "TASKS_KV"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.student_tasks.id
    },
    {
      name = "ENVIRONMENT"
      type = "plain_text"
      text = var.environment
    },
    {
      name = "APP_NAME"
      type = "plain_text"
      text = var.app_name
    }
  ]
}

# 3) <worker>.<subdomain>.workers.dev URL ON karo
resource "cloudflare_workers_script_subdomain" "task_manager" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.task_manager.script_name
  enabled     = true
}
