CREATE TABLE `firmo_master_name` (
  `firmoMasterUuid` varchar(36) COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`name`),
  KEY `firmo_master_name_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `firmo_master_name_firmoMasterUuid_IDX` (`firmoMasterUuid`) USING BTREE,
  KEY `firmo_master_name_name_IDX` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
