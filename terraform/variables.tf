# ---------------------------------------------------------------
# variables.tf  -  saari configuration yaha, hard-code kuch nahi
# ---------------------------------------------------------------
variable "account_id" {
  description = "Cloudflare Account ID (dashboard -> Workers & Pages -> right side)"
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker script"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Title of the Workers KV namespace"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment label (dev / test / production)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}

variable "app_name" {
  description = "Application display name passed to the Worker as an env variable"
  type        = string
  default     = "Student Task Manager"
}

variable "workers_subdomain" {
  description = "Your account's workers.dev subdomain (the part before .workers.dev). Used only to build the output URL."
  type        = string
  default     = ""
}
