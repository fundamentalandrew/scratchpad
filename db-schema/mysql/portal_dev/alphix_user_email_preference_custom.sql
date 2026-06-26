CREATE TABLE `alphix_user_email_preference_custom` (
  `userId` int(10) unsigned NOT NULL,
  `emailRef` varchar(50) NOT NULL,
  `emailUuid` varchar(36) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'subscribed',
  `flag` text,
  `emailStopToken` varchar(200) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`,`emailRef`,`emailUuid`),
  UNIQUE KEY `idx_emailStopToken_unique` (`emailStopToken`),
  KEY `idx_userId` (`userId`),
  KEY `idx_emailRef` (`emailRef`),
  KEY `idx_emailUuid` (`emailUuid`),
  KEY `idx_status` (`status`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_updatedAt` (`updatedAt`),
  KEY `idx_emailStopToken` (`emailStopToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
