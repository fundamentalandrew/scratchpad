CREATE TABLE `user_setting_system` (
  `userId` int(11) NOT NULL,
  `systemRef` varchar(50) NOT NULL,
  `systemId` varchar(50) NOT NULL,
  `setting` varchar(50) NOT NULL,
  `value` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`userId`,`systemRef`,`systemId`,`setting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
