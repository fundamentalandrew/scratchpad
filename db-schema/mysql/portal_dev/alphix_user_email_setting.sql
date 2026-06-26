CREATE TABLE `alphix_user_email_setting` (
  `userEmailUuid` varchar(36) NOT NULL,
  `setting` varchar(50) NOT NULL,
  `value` json NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting`,`userEmailUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
