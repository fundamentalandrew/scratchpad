CREATE TABLE `alphix_report` (
  `uuid` varchar(36) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `defaultCollectionUuid` varchar(36) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `alphix_report_clientUuid_type_name_uniq_IDX` (`clientUuid`,`type`,`name`) USING BTREE,
  KEY `alphix_report_clientUuid_IDX` (`clientUuid`) USING BTREE,
  KEY `alphix_report_type_IDX` (`type`) USING BTREE,
  KEY `alphix_report_name_IDX` (`name`) USING BTREE,
  KEY `alphix_report_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `alphix_report_defaultCollectionUuid_IDX` (`defaultCollectionUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
