CREATE TABLE `alphix_ip_list` (
  `uuid` varchar(36) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `creator` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `alphix_ip_list_UN` (`uuid`,`name`),
  KEY `alphix_ip_list_uuid_IDX` (`uuid`) USING BTREE,
  KEY `alphix_ip_list_clientUuid_IDX` (`clientUuid`) USING BTREE,
  KEY `alphix_ip_list_name_IDX` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
