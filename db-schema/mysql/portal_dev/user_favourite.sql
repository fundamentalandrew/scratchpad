CREATE TABLE `user_favourite` (
  `user_id` int(11) unsigned NOT NULL,
  `system_ref` varchar(50) NOT NULL,
  `system_id` varchar(50) NOT NULL,
  `client_id` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`system_ref`,`system_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
