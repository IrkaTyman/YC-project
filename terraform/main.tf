terraform {
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "0.92.0"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  token     = var.token
  cloud_id  = var.cloud_id
  folder_id = var.folder_id
  zone      = "ru-central1-a"
}

# VPC
resource "yandex_vpc_network" "notes_network" {
  name = "notes-network"
}

resource "yandex_vpc_subnet" "default-ru-central1-a" {
  name           = "public-subnet"
  zone           = "ru-central1-a"
  network_id     = yandex_vpc_network.notes_network.id
  v4_cidr_blocks = ["10.129.0.0/24"]
}

resource "yandex_vpc_subnet" "default-ru-central1-b" {
  name           = "public-subnet-1"
  zone           = "ru-central1-b"
  network_id     = yandex_vpc_network.notes_network.id
  v4_cidr_blocks = ["10.130.0.0/24"]
}

resource "yandex_vpc_subnet" "default-ru-central1-d" {
  name           = "public-subnet-2"
  zone           = "ru-central1-d"
  network_id     = yandex_vpc_network.notes_network.id
  v4_cidr_blocks = ["10.131.0.0/24"]
}

resource "yandex_iam_service_account" "notes_app" {
  name        = "notes-admin"
  description = "Service account for Notes application"
}

resource "yandex_resourcemanager_folder_iam_member" "admin" {
  folder_id = var.folder_id
  role      = "admin"
  member    = "serviceAccount:${yandex_iam_service_account.notes_app.id}"
}

# PostgreSQL
resource "yandex_mdb_postgresql_cluster" "notes_db" {
  name        = "notes-db"
  environment = "PRODUCTION"
  network_id  = yandex_vpc_network.notes_network.id
  folder_id   = var.folder_id

  config {
    version = "15"
    resources {
      resource_preset_id = "s2.micro"
      disk_type_id       = "network-hdd"
      disk_size          = 10
    }
  }

  host {
    zone      = "ru-central1-a"
    subnet_id = yandex_vpc_subnet.public_subnet.id
  }
}

resource "yandex_mdb_postgresql_database" "notes_database" {
  cluster_id = yandex_mdb_postgresql_cluster.notes_db.id
  name       = "notes_db"
  owner      = yandex_mdb_postgresql_user.notes_user.name
}

resource "yandex_mdb_postgresql_user" "notes_user" {
  cluster_id = yandex_mdb_postgresql_cluster.notes_db.id
  name       = "notes_user"
  password   = var.db_password
}

resource "yandex_iam_service_account_static_access_key" "notes_sa_static_key" {
  service_account_id = yandex_iam_service_account.notes_app.id
}

resource "yandex_storage_bucket" "notes-bucket" {
  bucket     = "notes-app-storage"
  access_key = yandex_iam_service_account_static_access_key.notes_sa_static_key.access_key
  secret_key = yandex_iam_service_account_static_access_key.notes_sa_static_key.secret_key
}

resource "yandex_serverless_container" "notes_backend" {
  name               = "notes-backend"
  memory             = 512   
  cores              = 1     
  execution_timeout  = "30s" 
  concurrency        = 8     
  service_account_id = yandex_iam_service_account.notes_app.id

  image {
    url = "cr.yandex/${var.registry_id}/notes-backend:latest"
  }
}

resource "yandex_api_gateway" "notes_api_gateway" {
  name = "notes-api-gateway"
  spec = <<-EOT
    openapi: 3.0.0
    info:
      title: Notes API
      version: 1.0.0
    paths:
      /:
        get:
          x-yc-apigateway-integration:
            type: serverless_container
            container_id: ${yandex_serverless_container.notes_backend.id}
            service_account_id: ${yandex_iam_service_account.notes_app.id}
      /{path+}:
        get:
          x-yc-apigateway-integration:
            type: serverless_container
            container_id: ${yandex_serverless_container.notes_backend.id}
            service_account_id: ${yandex_iam_service_account.notes_app.id}
        post:
          x-yc-apigateway-integration:
            type: serverless_container
            container_id: ${yandex_serverless_container.notes_backend.id}
            service_account_id: ${yandex_iam_service_account.notes_app.id}
        put:
          x-yc-apigateway-integration:
            type: serverless_container
            container_id: ${yandex_serverless_container.notes_backend.id}
            service_account_id: ${yandex_iam_service_account.notes_app.id}
        delete:
          x-yc-apigateway-integration:
            type: serverless_container
            container_id: ${yandex_serverless_container.notes_backend.id}
            service_account_id: ${yandex_iam_service_account.notes_app.id}
  EOT
}

resource "yandex_function" "notification_function" {
  name               = "notification-function"
  user_hash          = "v1"
  folder_id          = var.folder_id
  runtime            = "nodejs16"
  entrypoint         = "index.handler"
  memory             = "128"
  execution_timeout  = "10"
  service_account_id = yandex_iam_service_account.notes_app.id

  content {
    zip_filename = "function.zip" # Предварительно подготовленный zip с кодом
  }

  environment = {
    API_GATEWAY_URL = yandex_api_gateway.notes_api_gateway.domain
  }
}
