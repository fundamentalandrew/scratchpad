CREATE TABLE `user_sso_approval` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `approved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tid` varchar(36) DEFAULT NULL,
  `oid` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_provider` (`user_id`,`provider`),
  KEY `idx_user_id` (`user_id`),
  KEY `approved_at` (`approved_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;
