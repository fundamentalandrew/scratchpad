CREATE TABLE `alphix_report_setting` (
  `reportUuid` varchar(36) NOT NULL,
  `setting` varchar(50) NOT NULL,
  `value` text NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`reportUuid`,`setting`),
  KEY `alphix_report_setting_reportUuid_IDX` (`reportUuid`) USING BTREE,
  KEY `alphix_report_setting_setting_IDX` (`setting`) USING BTREE,
  KEY `alphix_report_setting_createdAt_IDX` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
