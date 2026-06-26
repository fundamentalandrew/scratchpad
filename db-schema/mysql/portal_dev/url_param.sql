CREATE TABLE `url_param` (
  `clientUuid` varchar(50) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `processFrom` date DEFAULT NULL,
  `processStatus` varchar(50) DEFAULT 'draft',
  `createdAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`clientUuid`,`domain`) USING BTREE,
  KEY `processFrom` (`processFrom`) USING BTREE,
  KEY `processStatus` (`processStatus`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE,
  KEY `updatedAt` (`updatedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
