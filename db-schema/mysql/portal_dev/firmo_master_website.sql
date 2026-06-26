CREATE TABLE `firmo_master_website` (
  `firmoMasterUuid` varchar(36) NOT NULL,
  `website` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`website`),
  KEY `firmo_master_website_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `firmo_master_website_firmoMasterUuid_IDX` (`firmoMasterUuid`) USING BTREE,
  KEY `firmo_master_website_website_IDX` (`website`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
