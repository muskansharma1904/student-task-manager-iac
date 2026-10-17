# ---------------------------------------------------------------
# providers.tf
# Terraform ko batata hai ki kaun sa provider (plugin) chahiye.
# Cloudflare ka official provider "cloudflare/cloudflare" hai (v5.x).
# API token yaha NAHI likhna. Provider khud environment variable
#   CLOUDFLARE_API_TOKEN
# se token utha leta hai.
# ---------------------------------------------------------------
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  # api_token  -> env var CLOUDFLARE_API_TOKEN se aata hai (secret, code me nahi)
}
