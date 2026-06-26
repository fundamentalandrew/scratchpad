CREATE TABLE `firmo_master_ip` (
  `firmoMasterUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(39) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastUpdated` date NOT NULL,
  `expiresOn` date NOT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`ip`),
  KEY `firmoMasterUuid` (`firmoMasterUuid`) USING BTREE,
  KEY `ip` (`ip`) USING BTREE,
  KEY `source` (`source`) USING BTREE,
  KEY `lastUpdated` (`lastUpdated`) USING BTREE,
  KEY `expiresOn` (`expiresOn`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
