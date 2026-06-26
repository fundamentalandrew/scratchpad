CREATE TABLE `alphix_goal_setting` (
  `alphixGoalId` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `setting` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alphixGoalId`,`setting`),
  KEY `alphixGoalIdIdx` (`alphixGoalId`),
  KEY `settingIdx` (`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
