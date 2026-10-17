output "worker_name" {
  description = "Deployed Worker name"
  value       = cloudflare_workers_script.task_manager.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.id
}

output "kv_namespace_title" {
  description = "Title of the Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.student_tasks.title
}

output "environment" {
  value = var.environment
}

output "application_url" {
  description = "Public URL of the app (needs workers_subdomain variable)"
  value       = var.workers_subdomain == "" ? "Set var.workers_subdomain, or see Workers & Pages in the dashboard" : "https://${var.worker_name}.${var.workers_subdomain}.workers.dev"
}
