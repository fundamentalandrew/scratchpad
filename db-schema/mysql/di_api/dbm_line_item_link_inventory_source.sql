CREATE TABLE `dbm_line_item_link_inventory_source` (
  `lineItemId` bigint(20) NOT NULL,
  `inventorySourceId` int(11) unsigned NOT NULL,
  PRIMARY KEY (`lineItemId`,`inventorySourceId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
