CREATE TABLE `alphix_custom_report_schedule` (
  `uuid` varchar(36) NOT NULL,
  `alphixCustomReportUuid` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `dayOfWeek` tinyint(3) unsigned DEFAULT NULL,
  `dayOfMonth` tinyint(3) unsigned DEFAULT NULL,
  `monthOfQuarter` tinyint(3) unsigned DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `idx_alphixCustomReportUuid` (`alphixCustomReportUuid`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
