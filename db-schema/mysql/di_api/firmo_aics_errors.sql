CREATE TABLE `firmo_aics_errors` (
  `jobUuid` varchar(36) NOT NULL,
  `firmoUuid` varchar(36) NOT NULL,
  `firmoWebsite` varchar(255) DEFAULT NULL,
  `firmoCreatedAt` datetime DEFAULT NULL,
  `errorCode` varchar(50) NOT NULL,
  `message` text,
  `type` varchar(50) NOT NULL DEFAULT 'aCrawler',
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`jobUuid`,`firmoUuid`,`errorCode`,`type`),
  KEY `firmoUuid` (`firmoUuid`) USING BTREE,
  KEY `type` (`type`) USING BTREE,
  KEY `errorCode` (`errorCode`) USING BTREE,
  KEY `firmoCreatedAt` (`firmoCreatedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
