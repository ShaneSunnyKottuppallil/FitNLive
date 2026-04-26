variable "region" {
  default = "ap-south-1"
}

variable "instance_type" {
  default = "t2.medium"
}

variable "key_name" {
  description = "EC2 key pair name"
  type        = string
}