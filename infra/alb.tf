# -------------------------------
# ALB
# -------------------------------
resource "aws_lb" "app" {
  name               = "mern-demo-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.main.id]
}

# -------------------------------
# TARGET GROUP
# -------------------------------
resource "aws_lb_target_group" "app" {
  name     = "mern-demo-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    path = "/"
  }
}

# Attach EC2
resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.mern_demo.id
  port             = 80
}

# -------------------------------
# EXISTING ACM CERT (IMPORTANT)
# -------------------------------
data "aws_acm_certificate" "existing" {
  domain      = var.domain   # e.g. fitnlive.online
  statuses    = ["ISSUED"]
  most_recent = true
}

# -------------------------------
# HTTPS LISTENER
# -------------------------------
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"

  ssl_policy      = "ELBSecurityPolicy-2016-08"
  certificate_arn = data.aws_acm_certificate.existing.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# -------------------------------
# HTTP → HTTPS redirect
# -------------------------------
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}