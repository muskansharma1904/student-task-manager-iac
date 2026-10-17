# PHASE 2 (CI/CD se pehle): remote state.
# GitHub Actions ka runner har baar fresh hota hai, local terraform.tfstate
# wahi kho jata hai -> apply "already exists" error dega.
# Isliye state HCP Terraform (free) me rakhte hain, execution LOCAL mode me.
#
# Use: cp backend.tf.example backend.tf  ->  terraform init -migrate-state
# Org / workspace env vars se aate hain:
#   TF_CLOUD_ORGANIZATION, TF_WORKSPACE, TF_TOKEN_app_terraform_io
terraform {
  cloud {}
}
