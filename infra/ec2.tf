resource "aws_instance" "mern_demo" {
  ami           = "ami-0f5ee92e2d63afc18"
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.main.id]

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "mern-devops-demo"
  }
}