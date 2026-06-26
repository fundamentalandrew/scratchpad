CREATE TABLE `alphix_topic_ds_bookings` (
  `dsBookingsId` int(10) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `dateMatched` datetime NOT NULL,
  `topicUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`dsBookingsId`,`topicUuid`),
  KEY `alphix_topic_ds_bookings_dsBookingsId_IDX` (`dsBookingsId`) USING BTREE,
  KEY `alphix_topic_ds_bookings_topicUuid_IDX` (`topicUuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
