CREATE TABLE `firmo_aics_webcontent` (
  `firmoUuid` varchar(36) NOT NULL,
  `firmoWebsite` varchar(255) DEFAULT NULL,
  `firmoCreatedAt` datetime DEFAULT NULL,
  `contentFull` mediumtext,
  `contentCut` text,
  `contentFullLength` int(6) unsigned DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`firmoUuid`),
  KEY `firmoCreatedAt` (`firmoCreatedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
