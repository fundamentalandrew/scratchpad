CREATE TABLE `firmographic_group_setting` (
  `uuid` varchar(36) NOT NULL,
  `setting` json DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `firmographicGroupUuid` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `firmographic_group_setting_uuid_IDX` (`uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
