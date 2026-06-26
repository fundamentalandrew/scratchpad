CREATE TABLE `alphix_user_email_unsubscribe_token` (
  `userId` int(10) unsigned NOT NULL,
  `unsubscribeToken` varchar(200) NOT NULL,
  PRIMARY KEY (`userId`),
  KEY `idx_unsubscribeToken` (`unsubscribeToken`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
