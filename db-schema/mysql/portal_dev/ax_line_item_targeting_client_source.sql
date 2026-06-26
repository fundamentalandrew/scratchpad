CREATE TABLE `ax_line_item_targeting_client_source` (
  `ax_line_item_id` int(10) unsigned NOT NULL,
  `ipClientSourceId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ax_line_item_id`,`ipClientSourceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
