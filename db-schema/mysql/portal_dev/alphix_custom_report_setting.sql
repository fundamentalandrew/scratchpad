CREATE TABLE `alphix_custom_report_setting` (
  `alphixCustomReportUuid` varchar(36) NOT NULL,
  `setting` varchar(50) NOT NULL,
  `value` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`alphixCustomReportUuid`,`setting`),
  KEY `idx_alphixCustomReportUuid` (`alphixCustomReportUuid`),
  KEY `idx_setting` (`setting`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
