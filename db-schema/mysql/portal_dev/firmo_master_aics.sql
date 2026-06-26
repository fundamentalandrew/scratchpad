CREATE TABLE `firmo_master_aics` (
  `firmoMasterUuid` varchar(36) NOT NULL,
  `aicsSubIndustryCode` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`firmoMasterUuid`,`aicsSubIndustryCode`),
  KEY `firmoMasterUuid` (`firmoMasterUuid`),
  KEY `aicsSubIndustryCode` (`aicsSubIndustryCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
