CREATE TABLE `alphix_custom_report_file` (
  `uuid` varchar(36) NOT NULL,
  `alphixCustomReportUuid` varchar(36) NOT NULL,
  `reportRunAt` datetime DEFAULT NULL,
  `reportRunStatus` varchar(50) NOT NULL,
  `fileName` varchar(250) NOT NULL,
  `storageLocation` varchar(250) NOT NULL,
  `fileHash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `firstDownload` date DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_alphixCustomReportUuid` (`alphixCustomReportUuid`),
  KEY `idx_reportRunAt` (`reportRunAt`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_alphixCustomReportUuid_reportRunAt` (`alphixCustomReportUuid`,`reportRunAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
