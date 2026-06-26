CREATE TABLE `firmo_deduplicate_processed` (
  `uuid` varchar(36) NOT NULL,
  `firmo_master_uuid` varchar(36) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `reviewed_at` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `firmo_master_uuid` (`firmo_master_uuid`),
  KEY `domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
