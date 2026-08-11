# Terraform Remote State Backend (S3 + DynamoDB)

Guide for setting up and rebuilding the Terraform remote state backend used by this project — S3 for state storage, DynamoDB for state locking.

## 1. Check/install Terraform

```bash
terraform --version
```

If not found (macOS/Homebrew) — HashiCorp pulled Terraform from the default Homebrew repo after their license change, it now lives in their own tap:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform --version
```

## 2. Confirm AWS CLI + credentials work

```bash
aws --version
aws sts get-caller-identity
```

If `aws` isn't installed:

```bash
brew install awscli
aws configure
```

`aws configure` will ask for:
1. `AWS Access Key ID`
2. `AWS Secret Access Key`
3. `Default region name` → `us-east-1`
4. `Default output format` → `json`

Get the access key from: AWS Console → IAM → Users → your user → **Security credentials** tab → **Access keys** → **Create access key** (choose use case "Command Line Interface (CLI)"). Note: an IAM **password** only logs into the AWS web console — it is not the same as an **access key**, which is what the CLI/Terraform actually use.

## 3. Directory structure

```
terraform/
├── tfstate-bootstrap/     # one-time setup: creates the S3 bucket + DynamoDB lock table
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── versions.tf            # root config: uses the backend created above
├── providers.tf           # backend "s3" block (literal values, no variables allowed here)
├── variables.tf
└── main.tf                # actual app infrastructure (e.g. DynamoDB tables)
```

**Why two configs?** The backend (S3 bucket + lock table) has to exist *before* anything can use it as a backend — so it's bootstrapped once using local state, then the "real" config points its backend at that bucket/table.

## 4. Create the bootstrap files — `terraform/tfstate-bootstrap/`

**`versions.tf`**
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

**`variables.tf`**
```hcl
variable "bucket_name" {
  description = "Name of the S3 bucket that will store Terraform state"
  type        = string
  default     = "ticket-app-tfstate"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table used for state locking"
  type        = string
  default     = "ticket-app-tflocks"
}

variable "aws_region" {
  description = "AWS region to create the state bucket/lock table in"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional named AWS CLI profile to authenticate with"
  type        = string
  default     = ""
}
```

**`providers.tf`**
```hcl
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}
```

**`main.tf`**
```hcl
resource "aws_s3_bucket" "tfstate" {
  bucket = var.bucket_name

  tags = {
    Name      = var.bucket_name
    ManagedBy = "terraform-bootstrap"
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_locks" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name      = var.dynamodb_table_name
    ManagedBy = "terraform-bootstrap"
  }
}
```

**`outputs.tf`**
```hcl
output "bucket" {
  description = "S3 bucket for Terraform state"
  value       = aws_s3_bucket.tfstate.bucket
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for state locking"
  value       = aws_dynamodb_table.tf_locks.name
}
```

## 5. Apply the bootstrap

```bash
cd terraform/tfstate-bootstrap
terraform fmt
terraform init
terraform validate
terraform plan -out=tfplan
```

Confirm the plan shows **5 to add**, then:

```bash
terraform apply tfplan
```

## 6. Create the root config files — `terraform/`

**`versions.tf`**
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

**`variables.tf`**
```hcl
variable "project_name" {
  description = "Base name for resources created by this Terraform config"
  type        = string
  default     = "ticket-app"
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional named AWS CLI profile to authenticate with"
  type        = string
  default     = ""
}
```

**`providers.tf`**

The `backend "s3" { ... }` block cannot use variables — Terraform has to resolve the backend before any variables are evaluated, so every value inside it must be a literal string.

```hcl
terraform {
  backend "s3" {
    bucket         = "ticket-app-tfstate"
    key            = "ticket-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ticket-app-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}
```

**`main.tf`**
```hcl
resource "aws_dynamodb_table" "items" {
  name         = "${var.project_name}-items"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "${var.project_name}-items"
  }
}
```

## 7. Apply the root config

```bash
cd terraform
terraform fmt
terraform init
terraform plan -out=tfplan
```

Confirm the plan shows **1 to add**, then:

```bash
terraform apply tfplan
```

## 8. Verify

```bash
terraform state list
aws dynamodb list-tables --region us-east-1
```

Expect to see `ticket-app-tflocks`, `ticket-app-tfstate` (bucket), and `ticket-app-items`.

## Notes / gotchas

- **Region mismatch destroys nothing by itself, but orphans resources.** `var.aws_region` in the *root* config only controls where `aws_dynamodb_table.items` lives — it does NOT affect the backend (bucket + lock table stay in `us-east-1`, hardcoded in `providers.tf`). If you change `aws_region` *after* already applying, Terraform won't find the table in the new region and will plan to create a fresh one there — the old one in the previous region becomes orphaned (still exists, still billing) until manually deleted.
- **`LockID` is not arbitrary** — Terraform's S3 backend hardcodes `LockID` as the partition key name it writes to when acquiring/releasing a lock. It must match exactly on the DynamoDB table or locking silently fails.
- **Terraform loads every `.tf` file in a directory** and merges them — file names (`main.tf`, `variables.tf`, etc.) are pure convention, not a technical requirement.
- **S3 bucket names are globally unique** across all AWS accounts — if `ticket-app-tfstate` is taken, override `bucket_name`.
- **Deleting a versioned S3 bucket**: Terraform can't delete a bucket with objects/versions still in it (no `force_destroy` set here). Empty it first via AWS Console → S3 → bucket → **Empty** button, or `terraform destroy` will fail with `BucketNotEmpty`.
- **`.gitignore`** already excludes `.terraform/`, `*.tfstate`, `*.tfplan`/`tfplan`, and `*.tfvars` — but keeps `.terraform.lock.hcl` and all `.tf` files, which should be committed so everyone gets the same provider version.
