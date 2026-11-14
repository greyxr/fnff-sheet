terraform {
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.4" }
  }
}

provider "aws" {}

variable "bucket_name" {
  type = string
}

variable "google_client_id" {
  type = string
}

variable "allowed_origins" {
  type    = list(string)
  default = ["https://greyxr.github.io", "http://127.0.0.1:8000"]
}

resource "aws_s3_bucket" "game_data" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "game_data" {
  bucket                  = aws_s3_bucket.game_data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "tls_only" {
  bucket     = aws_s3_bucket.game_data.id
  depends_on = [aws_s3_bucket_public_access_block.game_data]
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        aws_s3_bucket.game_data.arn,
        "${aws_s3_bucket.game_data.arn}/*",
      ]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../lambda/handler.py"
  output_path = "${path.module}/handler.zip"
}

resource "aws_iam_role" "api" {
  name = "${var.bucket_name}-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "bucket" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = [
        aws_s3_bucket.game_data.arn,
        "${aws_s3_bucket.game_data.arn}/*",
      ]
    }]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${var.bucket_name}-api"
  role          = aws_iam_role.api.arn
  runtime       = "python3.12"
  handler       = "handler.handler"
  timeout       = 10

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      BUCKET = aws_s3_bucket.game_data.id
    }
  }
}

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.bucket_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_authorizer" "google" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "google"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = "https://accounts.google.com"
    audience = [var.google_client_id]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  for_each           = toset(["GET", "POST", "PUT", "DELETE"])
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "${each.key} /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.google.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 20
  }
}

resource "aws_lambda_permission" "gateway" {
  statement_id  = "ApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*"
}

output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
