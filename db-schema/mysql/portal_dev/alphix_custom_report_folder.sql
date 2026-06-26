CREATE TABLE `alphix_custom_report_folder` (
  `uuid` varchar(36) NOT NULL,
  `clientUuid` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `idx_clientUuid` (`clientUuid`),
  KEY `idx_name` (`name`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
