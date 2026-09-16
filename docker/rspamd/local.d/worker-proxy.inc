# Milter proxy worker — single binding to port 11332 for Postfix integration
bind_socket = "*:11332";
milter = yes;
timeout = 120s;
upstream "local" {
  default = yes;
  self_scan = yes;
}
