CREATE TABLE `alphix_smart_placement_tag_creative` (
  `alphix_smart_placement_tag_creative_id` int(11) NOT NULL AUTO_INCREMENT,
  `tagUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `placementId` bigint(20) NOT NULL,
  `defaultCreative` tinyint(1) NOT NULL DEFAULT '0',
  `metaMatch` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `weight` decimal(10,0) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`alphix_smart_placement_tag_creative_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
