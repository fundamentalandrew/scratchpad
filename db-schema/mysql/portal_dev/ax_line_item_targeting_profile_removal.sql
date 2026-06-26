CREATE TABLE `ax_line_item_targeting_profile_removal` (
  `targetingProfileContentId` int(10) unsigned DEFAULT NULL,
  `axLineItemId` int(10) unsigned DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  KEY `axLineItemId_IDX` (`axLineItemId`) USING BTREE,
  KEY `targetingProfileContentId_IDX` (`targetingProfileContentId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
