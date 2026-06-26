CREATE TABLE `firmo_master_connection` (
  `firmoMasterUuid` varchar(36) NOT NULL,
  `connectionType` varchar(50) NOT NULL,
  `connectionUuid` varchar(50) NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`connectionType`,`connectionUuid`),
  KEY `firmo_master_connection_createdAt_IDX` (`createdAt`) USING BTREE,
  KEY `firmo_master_connection_firmoMasterUuid_IDX` (`firmoMasterUuid`) USING BTREE,
  KEY `firmo_master_connection_connectionType_IDX` (`connectionType`) USING BTREE,
  KEY `firmo_master_connection_connectionUuid_IDX` (`connectionUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
