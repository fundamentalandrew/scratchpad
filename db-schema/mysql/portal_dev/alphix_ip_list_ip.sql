CREATE TABLE `alphix_ip_list_ip` (
  `alphixIpListUuid` varchar(36) NOT NULL,
  `ip` varchar(43) NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`alphixIpListUuid`,`ip`),
  KEY `alphix_ip_list_ip_alphixIpListUuid_ip_IDX` (`alphixIpListUuid`,`ip`) USING BTREE,
  KEY `alphix_ip_list_ip_alphixIpListUuid_IDX` (`alphixIpListUuid`) USING BTREE,
  KEY `alphix_ip_list_ip_ip_IDX` (`ip`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
