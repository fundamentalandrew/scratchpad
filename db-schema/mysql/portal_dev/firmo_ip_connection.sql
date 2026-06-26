CREATE TABLE `firmo_ip_connection` (
  `firmoIpUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `firmoMasterUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `firmoOfficeUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created` datetime NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`firmoIpUuid`,`firmoOfficeUuid`),
  KEY `firmo_ip_connection_created_IDX` (`created`) USING BTREE,
  KEY `firmo_ip_connection_firmoIpUuid_IDX` (`firmoIpUuid`) USING BTREE,
  KEY `firmo_ip_connection_firmoMasterUuid_IDX` (`firmoMasterUuid`) USING BTREE,
  KEY `firmo_ip_connection_firmoOfficeUuid_IDX` (`firmoOfficeUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
