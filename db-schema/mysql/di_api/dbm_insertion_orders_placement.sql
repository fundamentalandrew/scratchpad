CREATE TABLE `dbm_insertion_orders_placement` (
  `insertionOrderId` bigint(20) unsigned NOT NULL,
  `placementId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`insertionOrderId`,`placementId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
