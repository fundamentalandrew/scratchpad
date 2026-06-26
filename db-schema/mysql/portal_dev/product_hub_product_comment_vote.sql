CREATE TABLE `product_hub_product_comment_vote` (
  `commentId` int(10) unsigned NOT NULL,
  `userId` int(10) unsigned NOT NULL,
  `vote` tinyint(1) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`commentId`,`userId`),
  KEY `userId` (`userId`),
  KEY `commentId` (`commentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
