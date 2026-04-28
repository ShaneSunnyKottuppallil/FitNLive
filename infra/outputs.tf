output "public_ip" {
  value = aws_instance.mern_demo.public_ip
}

output "alb_dns" {
  value = aws_lb.app.dns_name
}
