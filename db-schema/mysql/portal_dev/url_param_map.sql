CREATE TABLE `url_param_map` (
  `clientUuid` varchar(50) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `dimension` varchar(255) NOT NULL,
  `parameter` varchar(255) NOT NULL,
  `multiUseParameter` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `parameterDelimiter` varchar(10) DEFAULT NULL,
  `parameterPosition` tinyint(2) unsigned DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`clientUuid`,`domain`,`dimension`) USING BTREE,
  KEY `parameter` (`parameter`) USING BTREE,
  KEY `multiUseParameter` (`multiUseParameter`) USING BTREE,
  KEY `parameterDelimiter` (`parameterDelimiter`) USING BTREE,
  KEY `parameterPosition` (`parameterPosition`) USING BTREE,
  KEY `createdAt` (`createdAt`) USING BTREE,
  KEY `updatedAt` (`updatedAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
