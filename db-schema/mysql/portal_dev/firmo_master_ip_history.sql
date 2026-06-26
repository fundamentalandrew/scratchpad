CREATE TABLE `firmo_master_ip_history` (
  `firmoMasterUuid` varchar(36) NOT NULL,
  `ip` varchar(39) NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date DEFAULT NULL,
  `source` varchar(50) NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`ip`),
  KEY `firmoMasterUuid` (`firmoMasterUuid`) USING BTREE,
  KEY `ip` (`ip`) USING BTREE,
  KEY `startDate` (`startDate`) USING BTREE,
  KEY `endDate` (`endDate`) USING BTREE,
  KEY `source` (`source`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
