# Rspamd worker proxy configuration for Postfix milter
bind_socket = "*:11332";
milter = yes;
timeout = 120s;
upstream "local" {
  default = yes;
  self_scan = yes;
}
