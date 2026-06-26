CREATE TABLE `vector_ad_option` (
  `uuid` varchar(36) NOT NULL,
  `vectorAdUuid` varchar(36) DEFAULT NULL,
  `adCopy` mediumtext,
  `overrideCopy` mediumtext,
  `metadata` mediumtext,
  PRIMARY KEY (`uuid`),
  KEY `vectorAdUuid` (`vectorAdUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
