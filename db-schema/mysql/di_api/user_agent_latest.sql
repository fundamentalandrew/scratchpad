CREATE TABLE `user_agent_latest` (
  `browser` varchar(100) NOT NULL,
  `platform` varchar(100) NOT NULL,
  `os` varchar(100) NOT NULL,
  `userAgent` varchar(500) NOT NULL,
  `created` datetime NOT NULL,
  `updated` datetime DEFAULT NULL,
  PRIMARY KEY (`browser`,`platform`,`os`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
