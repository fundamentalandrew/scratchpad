CREATE TABLE `dc_creatives_additional_sizes` (
  `creativesId` int(10) unsigned NOT NULL,
  `sizeId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`creativesId`,`sizeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
